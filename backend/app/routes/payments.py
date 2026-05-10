"""
Payment tracking routes
"""
from datetime import datetime
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.extensions import db
from app.models.payment import Payment
from app.models.user import User
from app.utils.decorators import admin_required, get_current_user
from sqlalchemy import func

payments_bp = Blueprint('payments', __name__)


@payments_bp.route('', methods=['GET'])
@admin_required
def list_payments():
    """List all payments with optional filters"""
    user_id = request.args.get('user_id', type=int)
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)

    query = Payment.query

    if user_id:
        query = query.filter_by(user_id=user_id)
    if start_date:
        query = query.filter(Payment.payment_date >= start_date)
    if end_date:
        query = query.filter(Payment.payment_date <= end_date)

    payments = query.order_by(Payment.payment_date.desc())\
                    .paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        "payments": [p.to_dict() for p in payments.items],
        "total": payments.total,
        "pages": payments.pages,
        "current_page": payments.page
    }), 200


@payments_bp.route('', methods=['POST'])
@admin_required
def record_payment():
    """Record a payment (admin)"""
    data = request.get_json()

    required = ['user_id', 'amount', 'payment_date']
    for field in required:
        if not data.get(field):
            return jsonify({"error": f"{field} is required"}), 400

    # Validate user exists
    user = User.query.get(data['user_id'])
    if not user or user.role != 'customer':
        return jsonify({"error": "Invalid customer"}), 404

    try:
        payment_date = datetime.strptime(data['payment_date'], '%Y-%m-%d').date()
    except ValueError:
        return jsonify({"error": "Invalid date format"}), 400

    amount = float(data['amount'])
    if amount <= 0:
        return jsonify({"error": "Amount must be positive"}), 400

    payment_method = data.get('payment_method', 'cash')
    if payment_method not in ('cash', 'upi', 'bank'):
        return jsonify({"error": "Invalid payment method"}), 400

    admin_id = get_jwt_identity()

    payment = Payment(
        user_id=data['user_id'],
        amount=amount,
        payment_date=payment_date,
        payment_method=payment_method,
        notes=data.get('notes', ''),
        recorded_by=admin_id
    )

    db.session.add(payment)
    db.session.commit()

    return jsonify({
        "message": "Payment recorded",
        "payment": payment.to_dict()
    }), 201


@payments_bp.route('/balance/<int:user_id>', methods=['GET'])
@jwt_required()
def get_balance(user_id):
    """Get user's balance (total cost - total paid)"""
    current_user = get_current_user()

    # Customers can only see their own balance
    if current_user.role == 'customer' and current_user.id != user_id:
        return jsonify({"error": "Unauthorized"}), 403

    user = User.query.get_or_404(user_id)
    balance = user.get_balance()

    # Get totals breakdown
    from app.models.order import Order
    total_cost = db.session.query(
        func.coalesce(func.sum(Order.amount), 0)
    ).filter(
        Order.user_id == user_id,
        Order.status != 'cancelled'
    ).scalar()

    total_paid = db.session.query(
        func.coalesce(func.sum(Payment.amount), 0)
    ).filter(Payment.user_id == user_id).scalar()

    return jsonify({
        "user_id": user_id,
        "user_name": user.name,
        "total_cost": float(total_cost),
        "total_paid": float(total_paid),
        "balance": float(balance)
    }), 200


@payments_bp.route('/summary', methods=['GET'])
@admin_required
def payment_summary():
    """Overall payment summary"""
    from app.models.order import Order

    total_revenue = db.session.query(
        func.coalesce(func.sum(Order.amount), 0)
    ).filter(Order.status != 'cancelled').scalar()

    total_collected = db.session.query(
        func.coalesce(func.sum(Payment.amount), 0)
    ).scalar()

    total_pending = float(total_revenue) - float(total_collected)

    return jsonify({
        "total_revenue": float(total_revenue),
        "total_collected": float(total_collected),
        "total_pending": total_pending
    }), 200


@payments_bp.route('/my', methods=['GET'])
@jwt_required()
def my_payments():
    """Current user's payment history"""
    user = get_current_user()
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)

    payments = Payment.query.filter_by(user_id=user.id)\
                    .order_by(Payment.payment_date.desc())\
                    .paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        "payments": [p.to_dict() for p in payments.items],
        "total": payments.total,
        "pages": payments.pages,
        "current_page": payments.page
    }), 200
