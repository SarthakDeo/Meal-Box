"""
Push notification routes — token registration and admin broadcast
"""
import json
import os
import logging

import firebase_admin
from firebase_admin import credentials, messaging as fcm_messaging
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required

from app.extensions import db
from app.models.fcm_token import FcmToken
from app.utils.decorators import admin_required, get_current_user

logger = logging.getLogger(__name__)

push_bp = Blueprint('push', __name__)

# ── Firebase Admin initialisation ────────────────────────────────────────────
# Only initialise once (Render hot-reloads the module on every request in dev)
if not firebase_admin._apps:
    _service_account_json = os.getenv('FIREBASE_SERVICE_ACCOUNT_JSON')
    if _service_account_json:
        try:
            _cred = credentials.Certificate(json.loads(_service_account_json))
            firebase_admin.initialize_app(_cred)
            logger.info("Firebase Admin initialised from env var")
        except Exception as exc:
            logger.error("Failed to initialise Firebase Admin: %s", exc)
    else:
        logger.warning("FIREBASE_SERVICE_ACCOUNT_JSON not set — push notifications disabled")


# ── Helpers ───────────────────────────────────────────────────────────────────

def send_push_to_user(user_id: int, title: str, body: str, url: str = '/') -> dict:
    """
    Send a targeted push notification to a single user.
    Returns {"sent": N, "removed": N}.
    Use this later for order-status updates etc.
    """
    tokens = FcmToken.query.filter_by(user_id=user_id).all()
    if not tokens:
        return {"sent": 0, "removed": 0}

    return _multicast([t.token for t in tokens], title, body, url)


def _multicast(token_list: list[str], title: str, body: str, url: str) -> dict:
    """Send to up to 500 tokens at a time; prune stale tokens."""
    if not firebase_admin._apps:
        return {"sent": 0, "removed": 0, "error": "Firebase not initialised"}

    sent = removed = 0
    BATCH = 500

    for i in range(0, len(token_list), BATCH):
        batch = token_list[i:i + BATCH]
        message = fcm_messaging.MulticastMessage(
            notification=fcm_messaging.Notification(title=title, body=body),
            data={"url": url},
            tokens=batch,
        )
        response = fcm_messaging.send_each_for_multicast(message)
        sent += response.success_count

        # Collect stale / unregistered tokens
        stale = [
            batch[idx]
            for idx, r in enumerate(response.responses)
            if not r.success and r.exception and _is_stale_token(r.exception)
        ]
        if stale:
            FcmToken.query.filter(FcmToken.token.in_(stale)).delete(synchronize_session=False)
            db.session.commit()
            removed += len(stale)

    return {"sent": sent, "removed": removed}


def _is_stale_token(exc) -> bool:
    """Return True for error codes that mean the token is permanently invalid."""
    stale_codes = {
        'registration-token-not-registered',
        'invalid-registration-token',
        'messaging/registration-token-not-registered',
        'messaging/invalid-registration-token',
    }
    code = getattr(exc, 'code', '') or ''
    return code in stale_codes


# ── Routes ────────────────────────────────────────────────────────────────────

@push_bp.route('/register-token', methods=['POST'])
@jwt_required()
def register_token():
    """Upsert an FCM token for the current user."""
    user = get_current_user()
    if not user:
        return jsonify({"error": "User not found"}), 404

    data = request.get_json()
    token = (data or {}).get('token', '').strip()
    if not token:
        return jsonify({"error": "token is required"}), 400

    platform = (data or {}).get('platform', 'web')

    # If token already exists, update its owner (handles shared/reused devices)
    existing = FcmToken.query.filter_by(token=token).first()
    if existing:
        existing.user_id = user.id
        existing.platform = platform
    else:
        db.session.add(FcmToken(user_id=user.id, token=token, platform=platform))

    db.session.commit()
    return jsonify({"message": "Token registered"}), 200


@push_bp.route('/broadcast', methods=['POST'])
@admin_required
def broadcast():
    """
    Admin: send a push notification to ALL registered users.
    Body: { title, body, url }
    """
    data = request.get_json() or {}
    title = data.get('title', '').strip()
    body  = data.get('body', '').strip()
    url   = data.get('url', '/').strip() or '/'

    if not title or not body:
        return jsonify({"error": "title and body are required"}), 400

    all_tokens = [row.token for row in FcmToken.query.with_entities(FcmToken.token).all()]
    if not all_tokens:
        return jsonify({"message": "No tokens registered", "sent": 0, "removed": 0}), 200

    result = _multicast(all_tokens, title, body, url)
    return jsonify(result), 200
