"""
Customer management routes (admin only)
"""
from flask import Blueprint, request, jsonify
from app.extensions import db
from app.models.user import User
from app.models.order import Order
from app.models.subscription import Subscription
from app.utils.decorators import admin_required

customers_bp = Blueprint('customers', __name__)


@customers_bp.route('', methods=['GET'])
@admin_required
def list_customers():
    """List all customers"""
    customer_type = request.args.get('type')
    search = request.args.get('search', '').strip()

    query = User.query.filter_by(role='customer')

    if customer_type:
        query = query.filter_by(customer_type=customer_type)

    if search:
        query = query.filter(
            db.or_(
                User.name.ilike(f'%{search}%'),
                User.email.ilike(f'%{search}%'),
                User.phone.ilike(f'%{search}%')
            )
        )

    customers = query.order_by(User.name).all()
    return jsonify({
        "customers": [c.to_dict(include_balance=True) for c in customers]
    }), 200


@customers_bp.route('/<int:user_id>', methods=['GET'])
@admin_required
def get_customer(user_id):
    """Get customer details with order history"""
    user = db.get_or_404(User, user_id)
    if user.role != 'customer':
        return jsonify({"error": "Not a customer"}), 404

    # Get recent orders
    recent_orders = Order.query.filter_by(user_id=user_id)\
                        .order_by(Order.order_date.desc())\
                        .limit(20).all()

    # Get subscriptions
    subs = Subscription.query.filter_by(user_id=user_id)\
                .order_by(Subscription.created_at.desc()).all()

    return jsonify({
        "customer": user.to_dict(include_balance=True),
        "recent_orders": [o.to_dict() for o in recent_orders],
        "subscriptions": [s.to_dict() for s in subs]
    }), 200


@customers_bp.route('', methods=['POST'])
@admin_required
def create_customer():
    """Admin creates a new customer"""
    data = request.get_json()

    required = ['name', 'email', 'password']
    for field in required:
        if not data.get(field):
            return jsonify({"error": f"{field} is required"}), 400

    if User.query.filter_by(email=data['email'].lower().strip()).first():
        return jsonify({"error": "Email already registered"}), 409

    user = User(
        name=data['name'].strip(),
        email=data['email'].lower().strip(),
        phone=data.get('phone', '').strip(),
        role='customer',
        customer_type=data.get('customer_type', 'daywise'),
        is_active=True
    )
    user.set_password(data['password'])

    db.session.add(user)
    db.session.commit()

    return jsonify({
        "message": "Customer created",
        "customer": user.to_dict()
    }), 201


@customers_bp.route('/<int:user_id>', methods=['PUT'])
@admin_required
def update_customer(user_id):
    """Edit customer details"""
    user = db.get_or_404(User, user_id)
    if user.role != 'customer':
        return jsonify({"error": "Not a customer"}), 404

    data = request.get_json()

    if data.get('name'):
        user.name = data['name'].strip()
    if data.get('phone'):
        user.phone = data['phone'].strip()
    if data.get('customer_type'):
        user.customer_type = data['customer_type']
    if data.get('is_active') is not None:
        user.is_active = data['is_active']
    if data.get('password'):
        user.set_password(data['password'])

    db.session.commit()
    return jsonify({
        "message": "Customer updated",
        "customer": user.to_dict()
    }), 200


@customers_bp.route('/<int:user_id>', methods=['DELETE'])
@admin_required
def deactivate_customer(user_id):
    """Deactivate a customer (soft delete)"""
    user = db.get_or_404(User, user_id)
    if user.role != 'customer':
        return jsonify({"error": "Not a customer"}), 404

    user.is_active = False
    db.session.commit()
    return jsonify({"message": "Customer deactivated"}), 200
