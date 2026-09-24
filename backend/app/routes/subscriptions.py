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
from app.models.order import Order
from app.models.holiday import Holiday
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
    """Create a new subscription with optional pre-recorded leave dates (admin)"""
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

    # Pre-record leave dates if provided (e.g. for retroactively created subscriptions)
    leave_dates = data.get('leave_dates', [])
    recorded_leaves_count = 0

    if isinstance(leave_dates, list):
        for ld_str in leave_dates:
            try:
                ld = datetime.strptime(ld_str.strip(), '%Y-%m-%d').date()
            except ValueError:
                continue

            if start <= ld <= end:
                meal_times_to_cancel = ['morning', 'dinner'] if meal_time == 'both' else [meal_time]
                for mt in meal_times_to_cancel:
                    existing = Order.query.filter_by(
                        user_id=sub.user_id,
                        order_date=ld,
                        meal_time=mt
                    ).first()
                    if existing:
                        existing.status = 'cancelled'
                        existing.amount = 0.0
                        existing.note = 'Customer Leave (Pre-recorded)'
                    else:
                        leave_order = Order(
                            user_id=sub.user_id,
                            subscription_id=sub.id,
                            order_date=ld,
                            meal_time=mt,
                            meal_type=meal_type,
                            quantity=1,
                            extra_chapati=0,
                            amount=0.0,
                            source='manual',
                            status='cancelled',
                            note='Customer Leave (Pre-recorded)'
                        )
                        db.session.add(leave_order)
                    recorded_leaves_count += 1

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

    try:
        from app.services.notification_service import notify_subscription_event
        leave_msg = f" with {recorded_leaves_count} pre-recorded leave meals" if recorded_leaves_count > 0 else ""
        notify_subscription_event(sub.user_id, 'created', f"Valid from {sub.start_date.strftime('%b %d')} to {sub.end_date.strftime('%b %d')}{leave_msg}.")
    except Exception:
        pass

    return jsonify({
        "message": "Subscription created",
        "subscription": sub.to_dict(),
        "recorded_leaves": recorded_leaves_count
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

    if data.get('status'):
        try:
            from app.services.notification_service import notify_subscription_event
            notify_subscription_event(sub.user_id, data['status'])
        except Exception:
            pass

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

    try:
        from app.services.notification_service import notify_subscription_event
        notify_subscription_event(sub.user_id, 'paused')
    except Exception:
        pass
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


# ==========================================
# HOLIDAYS API (Kitchen Holidays)
# ==========================================

@subscriptions_bp.route('/holidays', methods=['GET'])
@jwt_required()
def list_holidays():
    """List all kitchen holidays"""
    holidays = Holiday.query.order_by(Holiday.date.desc()).all()
    return jsonify({
        "holidays": [h.to_dict() for h in holidays]
    }), 200


@subscriptions_bp.route('/holidays', methods=['POST'])
@admin_required
def add_holiday():
    """Add a kitchen holiday (admin)"""
    data = request.get_json() or {}
    date_str = data.get('date')
    title = data.get('title', '').strip()
    description = data.get('description', '').strip()
    meal_time = data.get('meal_time', 'both')

    if not date_str or not title:
        return jsonify({"error": "Date and Title are required"}), 400

    try:
        h_date = datetime.strptime(date_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({"error": "Invalid date format. Use YYYY-MM-DD"}), 400

    if meal_time not in ('morning', 'dinner', 'both'):
        return jsonify({"error": "meal_time must be 'morning', 'dinner', or 'both'"}), 400

    # Check if holiday already exists for that date
    existing = Holiday.query.filter_by(date=h_date).first()
    if existing:
        return jsonify({"error": f"A holiday on {date_str} already exists ({existing.title})"}), 400

    holiday = Holiday(
        date=h_date,
        title=title,
        description=description,
        meal_time=meal_time
    )
    db.session.add(holiday)

    # Automatically cancel existing non-cancelled orders on this date for affected meal times
    orders_on_date = Order.query.filter_by(order_date=h_date).filter(Order.status != 'cancelled').all()
    cancelled_count = 0
    for ord in orders_on_date:
        if meal_time == 'both' or ord.meal_time == meal_time:
            ord.status = 'cancelled'
            ord.note = f"Kitchen Holiday: {title}"
            ord.amount = 0.0
            cancelled_count += 1

    db.session.commit()

    return jsonify({
        "message": f"Holiday added for {h_date}. {cancelled_count} active order(s) cancelled.",
        "holiday": holiday.to_dict()
    }), 201


@subscriptions_bp.route('/holidays/<int:holiday_id>', methods=['DELETE'])
@admin_required
def delete_holiday(holiday_id):
    """Delete a kitchen holiday (admin)"""
    holiday = db.get_or_404(Holiday, holiday_id)
    db.session.delete(holiday)
    db.session.commit()
    return jsonify({"message": "Holiday deleted successfully"}), 200

