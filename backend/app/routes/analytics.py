"""
Analytics routes - dashboard data & charts
"""
from datetime import date
from flask import Blueprint, request, jsonify
from app.utils.decorators import admin_required
from app.services.analytics_service import (
    get_revenue_summary,
    get_order_distribution,
    get_customer_stats,
    get_today_summary,
    get_monthly_revenue
)

analytics_bp = Blueprint('analytics', __name__)


@analytics_bp.route('/dashboard', methods=['GET'])
@admin_required
def dashboard():
    """Get complete dashboard data in one call"""
    today = get_today_summary()
    monthly_rev = get_monthly_revenue()
    customer_stats = get_customer_stats()

    from app.models.user import User
    from app.models.subscription import Subscription

    total_customers = User.query.filter_by(role='customer', is_active=True).count()
    active_subs = Subscription.query.filter_by(status='active').count()

    return jsonify({
        "today": today,
        "monthly_revenue": monthly_rev,
        "total_customers": total_customers,
        "active_subscriptions": active_subs,
        "customer_stats": customer_stats
    }), 200


@analytics_bp.route('/revenue', methods=['GET'])
@admin_required
def revenue():
    """Revenue data for charts"""
    period = request.args.get('period', 'monthly')
    year = request.args.get('year', type=int)
    month = request.args.get('month', type=int)

    data = get_revenue_summary(period=period, year=year, month=month)
    return jsonify({"data": data, "period": period}), 200


@analytics_bp.route('/orders', methods=['GET'])
@admin_required
def order_distribution():
    """Order distribution data"""
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')

    data = get_order_distribution(start_date=start_date, end_date=end_date)
    return jsonify({"data": data}), 200


@analytics_bp.route('/customers', methods=['GET'])
@admin_required
def customers():
    """Customer type breakdown"""
    data = get_customer_stats()
    return jsonify({"data": data}), 200


@analytics_bp.route('/trends', methods=['GET'])
@admin_required
def trends():
    """Trend data - daily revenue for last 30 days"""
    from datetime import timedelta
    today = date.today()
    thirty_days_ago = today - timedelta(days=30)

    from sqlalchemy import func, extract
    from app.extensions import db
    from app.models.order import Order

    results = db.session.query(
        Order.order_date,
        func.sum(Order.amount).label('revenue'),
        func.count(Order.id).label('orders'),
        func.sum(
            db.case(
                (Order.meal_type == 'full', 1),
                else_=0
            )
        ).label('full_count'),
        func.sum(
            db.case(
                (Order.meal_type == 'half', 1),
                else_=0
            )
        ).label('half_count')
    ).filter(
        Order.order_date >= thirty_days_ago,
        Order.status != 'cancelled'
    ).group_by(Order.order_date).order_by(Order.order_date).all()

    return jsonify({
        "data": [{
            'date': r.order_date.isoformat(),
            'revenue': float(r.revenue),
            'orders': r.orders,
            'full': int(r.full_count),
            'half': int(r.half_count)
        } for r in results]
    }), 200
