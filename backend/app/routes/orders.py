"""
Order management routes
"""
from datetime import datetime, date
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.extensions import db
from app.models.order import Order
from app.models.user import User
from app.utils.decorators import admin_required, get_current_user
from app.utils.helpers import can_book_order, get_meal_price, get_ist_today
from app.services.order_service import generate_daily_orders

orders_bp = Blueprint('orders', __name__)


@orders_bp.route('', methods=['GET'])
@jwt_required()
def list_orders():
    """List orders with filters"""
    user = get_current_user()
    query = Order.query

    # Customers see only their own orders
    if user.role == 'customer':
        query = query.filter_by(user_id=user.id)
    else:
        # Admin can filter by user
        user_id = request.args.get('user_id', type=int)
        if user_id:
            query = query.filter_by(user_id=user_id)

    # Date filters
    date_str = request.args.get('date')
    if date_str:
        try:
            filter_date = datetime.strptime(date_str, '%Y-%m-%d').date()
            query = query.filter_by(order_date=filter_date)
        except ValueError:
            pass

    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    if start_date:
        query = query.filter(Order.order_date >= start_date)
    if end_date:
        query = query.filter(Order.order_date <= end_date)

    # Status filter
    status = request.args.get('status')
    if status:
        query = query.filter_by(status=status)

    # Meal time filter
    meal_time = request.args.get('meal_time')
    if meal_time:
        query = query.filter_by(meal_time=meal_time)

    # Pagination
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)

    orders = query.order_by(Order.order_date.desc(), Order.created_at.desc())\
                  .paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        "orders": [o.to_dict() for o in orders.items],
        "total": orders.total,
        "pages": orders.pages,
        "current_page": orders.page
    }), 200


@orders_bp.route('/today', methods=['GET'])
@admin_required
def today_summary():
    """Today's order summary for admin"""
    from app.services.analytics_service import get_today_summary
    summary = get_today_summary()
    return jsonify(summary), 200


@orders_bp.route('', methods=['POST'])
@jwt_required()
def create_order():
    """Place a new order (with time constraint validation)"""
    user = get_current_user()
    data = request.get_json()

    # Validate
    meal_time = data.get('meal_time')
    if meal_time not in ('morning', 'dinner'):
        return jsonify({"error": "meal_time must be 'morning' or 'dinner'"}), 400

    meal_type = data.get('meal_type', 'full')
    if meal_type not in ('full', 'half'):
        return jsonify({"error": "meal_type must be 'full' or 'half'"}), 400

    # Time constraint check (customers only)
    if user.role == 'customer' and not can_book_order(meal_time):
        cutoff = "10:30 AM" if meal_time == 'morning' else "7:30 PM"
        return jsonify({
            "error": f"Booking closed for {meal_time}. Deadline was {cutoff}."
        }), 400

    order_date = get_ist_today()

    # If admin, allow setting a different date and user
    target_user_id = user.id
    if user.role == 'admin':
        if data.get('user_id'):
            target_user_id = data['user_id']
        if data.get('order_date'):
            try:
                order_date = datetime.strptime(data['order_date'], '%Y-%m-%d').date()
            except ValueError:
                return jsonify({"error": "Invalid date format"}), 400

    # Check for duplicate
    existing = Order.query.filter_by(
        user_id=target_user_id,
        order_date=order_date,
        meal_time=meal_time
    ).filter(Order.status != 'cancelled').first()

    if existing:
        return jsonify({"error": "Order already exists for this meal"}), 409

    extra_chapati = int(data.get('extra_chapati', 0))
    amount = get_meal_price(meal_type, extra_chapati)

    order = Order(
        user_id=target_user_id,
        order_date=order_date,
        meal_time=meal_time,
        meal_type=meal_type,
        extra_chapati=extra_chapati,
        amount=amount,
        source='manual',
        status='booked'
    )

    db.session.add(order)
    db.session.commit()

    return jsonify({"message": "Order placed", "order": order.to_dict()}), 201


@orders_bp.route('/<int:order_id>', methods=['PUT'])
@admin_required
def update_order(order_id):
    """Update order status (admin)"""
    order = db.get_or_404(Order, order_id)
    data = request.get_json()

    if data.get('status'):
        if data['status'] not in ('booked', 'delivered', 'cancelled'):
            return jsonify({"error": "Invalid status"}), 400
        order.status = data['status']

    if data.get('extra_chapati') is not None:
        order.extra_chapati = int(data['extra_chapati'])
        order.calculate_amount()

    if data.get('meal_type'):
        order.meal_type = data['meal_type']
        order.calculate_amount()

    db.session.commit()
    return jsonify({"message": "Order updated", "order": order.to_dict()}), 200


@orders_bp.route('/<int:order_id>', methods=['DELETE'])
@jwt_required()
def cancel_order(order_id):
    """Cancel an order"""
    user = get_current_user()
    order = db.get_or_404(Order, order_id)

    # Customers can only cancel their own orders
    if user.role == 'customer' and order.user_id != user.id:
        return jsonify({"error": "Unauthorized"}), 403

    if order.status == 'delivered':
        return jsonify({"error": "Cannot cancel a delivered order"}), 400

    order.status = 'cancelled'
    db.session.commit()
    return jsonify({"message": "Order cancelled"}), 200


@orders_bp.route('/history', methods=['GET'])
@jwt_required()
def order_history():
    """Get current user's order history"""
    user = get_current_user()
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)

    orders = Order.query.filter_by(user_id=user.id)\
                .order_by(Order.order_date.desc())\
                .paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        "orders": [o.to_dict() for o in orders.items],
        "total": orders.total,
        "pages": orders.pages,
        "current_page": orders.page
    }), 200


@orders_bp.route('/generate', methods=['POST'])
@admin_required
def trigger_generate_orders():
    """Manually trigger auto-generation of orders for mess subscribers"""
    date_str = request.get_json().get('date') if request.get_json() else None
    target_date = None
    if date_str:
        try:
            target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            return jsonify({"error": "Invalid date format"}), 400

    count = generate_daily_orders(target_date)
    return jsonify({
        "message": f"Generated {count} orders",
        "count": count
    }), 200
