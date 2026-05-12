"""
Subscription management routes
"""
from datetime import datetime, date
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.extensions import db
from app.models.subscription import Subscription
from app.models.user import User
from app.models.payment import Payment
from app.utils.decorators import admin_required, get_current_user

subscriptions_bp = Blueprint('subscriptions', __name__)


@subscriptions_bp.route('', methods=['GET'])
@admin_required
def list_subscriptions():
    """List all subscriptions (admin)"""
    status = request.args.get('status')
    query = Subscription.query

    if status:
        query = query.filter_by(status=status)

    subs = query.order_by(Subscription.created_at.desc()).all()
    return jsonify({
        "subscriptions": [s.to_dict() for s in subs]
    }), 200


@subscriptions_bp.route('/me', methods=['GET'])
@jwt_required()
def my_subscriptions():
    """Get current user's subscriptions"""
    user = get_current_user()
    subs = Subscription.query.filter_by(user_id=user.id)\
                .order_by(Subscription.created_at.desc()).all()
    return jsonify({
        "subscriptions": [s.to_dict() for s in subs]
    }), 200


@subscriptions_bp.route('', methods=['POST'])
@admin_required
def create_subscription():
    """Create a new subscription (admin)"""
    data = request.get_json()

    required = ['user_id', 'start_date', 'end_date', 'price_per_day']
    for field in required:
        if not data.get(field):
            return jsonify({"error": f"{field} is required"}), 400

    # Validate user exists and is a customer
    user = db.session.get(User, data['user_id'])
    if not user or user.role != 'customer':
        return jsonify({"error": "Invalid customer"}), 404

    try:
        start = datetime.strptime(data['start_date'], '%Y-%m-%d').date()
        end = datetime.strptime(data['end_date'], '%Y-%m-%d').date()
    except ValueError:
        return jsonify({"error": "Invalid date format. Use YYYY-MM-DD"}), 400

    if end <= start:
        return jsonify({"error": "End date must be after start date"}), 400

    meal_time = data.get('meal_time', 'both')
    if meal_time not in ('morning', 'dinner', 'both'):
        return jsonify({"error": "meal_time must be 'morning', 'dinner', or 'both'"}), 400

    meal_type = data.get('meal_type', 'full')
    if meal_type not in ('full', 'half'):
        return jsonify({"error": "meal_type must be 'full' or 'half'"}), 400

    is_paid = data.get('is_paid', False)

    sub = Subscription(
        user_id=data['user_id'],
        start_date=start,
        end_date=end,
        status='active',
        meal_type=meal_type,
        meal_time=meal_time,
        price_per_day=data['price_per_day'],
        is_paid=is_paid
    )

    # Update customer type to mess
    user.customer_type = 'mess'

    db.session.add(sub)
    db.session.flush()

    if is_paid:
        admin_id = get_jwt_identity()
        payment = Payment(
            user_id=sub.user_id,
            amount=sub.total_amount,
            payment_date=date.today(),
            payment_method='cash',
            notes=f'Upfront subscription payment (ID: {sub.id})',
            recorded_by=admin_id
        )
        db.session.add(payment)

    db.session.commit()

    return jsonify({
        "message": "Subscription created",
        "subscription": sub.to_dict()
    }), 201


@subscriptions_bp.route('/<int:sub_id>', methods=['PUT'])
@admin_required
def update_subscription(sub_id):
    """Update subscription details"""
    sub = db.get_or_404(Subscription, sub_id)
    data = request.get_json()

    if data.get('end_date'):
        try:
            sub.end_date = datetime.strptime(data['end_date'], '%Y-%m-%d').date()
        except ValueError:
            return jsonify({"error": "Invalid date format"}), 400

    if data.get('meal_type'):
        sub.meal_type = data['meal_type']
    if data.get('meal_time'):
        sub.meal_time = data['meal_time']
    if data.get('price_per_day'):
        sub.price_per_day = data['price_per_day']
    if data.get('status'):
        sub.status = data['status']

    db.session.commit()
    return jsonify({
        "message": "Subscription updated",
        "subscription": sub.to_dict()
    }), 200


@subscriptions_bp.route('/<int:sub_id>/pause', methods=['POST'])
@admin_required
def pause_subscription(sub_id):
    """Pause a subscription"""
    sub = db.get_or_404(Subscription, sub_id)

    if sub.status != 'active':
        return jsonify({"error": "Only active subscriptions can be paused"}), 400

    sub.status = 'paused'
    sub.paused_at = date.today()
    sub.pause_reason = request.get_json().get('reason', '') if request.get_json() else ''

    db.session.commit()
    return jsonify({
        "message": "Subscription paused",
        "subscription": sub.to_dict()
    }), 200


@subscriptions_bp.route('/<int:sub_id>/resume', methods=['POST'])
@admin_required
def resume_subscription(sub_id):
    """Resume a paused subscription"""
    sub = db.get_or_404(Subscription, sub_id)

    if sub.status != 'paused':
        return jsonify({"error": "Only paused subscriptions can be resumed"}), 400

    sub.status = 'active'
    sub.resumed_at = date.today()

    db.session.commit()
    return jsonify({
        "message": "Subscription resumed",
        "subscription": sub.to_dict()
    }), 200


@subscriptions_bp.route('/<int:sub_id>/mark-paid', methods=['POST'])
@admin_required
def mark_subscription_paid(sub_id):
    """Mark a subscription as paid and record payment"""
    sub = db.get_or_404(Subscription, sub_id)

    if sub.is_paid:
        return jsonify({"error": "Subscription is already marked as paid"}), 400

    sub.is_paid = True
    
    admin_id = get_jwt_identity()
    payment = Payment(
        user_id=sub.user_id,
        amount=sub.total_amount,
        payment_date=date.today(),
        payment_method='cash',
        notes=f'Subscription payment (ID: {sub.id})',
        recorded_by=admin_id
    )
    db.session.add(payment)
    db.session.commit()

    return jsonify({
        "message": "Subscription marked as paid",
        "subscription": sub.to_dict()
    }), 200
