"""
Analytics service - data aggregation for dashboard
"""
from datetime import date, timedelta
from sqlalchemy import func, case, extract
from app.extensions import db
from app.models.order import Order
from app.models.payment import Payment
from app.models.user import User
from app.models.subscription import Subscription


def get_revenue_summary(period='monthly', year=None, month=None):
    """Get revenue data for charts"""
    today = date.today()
    if year is None:
        year = today.year
    if month is None:
        month = today.month

    if period == 'daily':
        # Daily revenue for the given month
        results = db.session.query(
            Order.order_date,
            func.sum(Order.amount).label('revenue'),
            func.count(Order.id).label('order_count')
        ).filter(
            extract('year', Order.order_date) == year,
            extract('month', Order.order_date) == month,
            Order.status != 'cancelled'
        ).group_by(Order.order_date).order_by(Order.order_date).all()

        return [{
            'date': r.order_date.isoformat(),
            'revenue': float(r.revenue),
            'orders': r.order_count
        } for r in results]

    elif period == 'monthly':
        # Monthly revenue for the given year
        results = db.session.query(
            extract('month', Order.order_date).label('month'),
            func.sum(Order.amount).label('revenue'),
            func.count(Order.id).label('order_count')
        ).filter(
            extract('year', Order.order_date) == year,
            Order.status != 'cancelled'
        ).group_by('month').order_by('month').all()

        month_names = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        return [{
            'month': month_names[int(r.month)],
            'month_num': int(r.month),
            'revenue': float(r.revenue),
            'orders': r.order_count
        } for r in results]


def get_order_distribution(start_date=None, end_date=None):
    """Get order distribution by meal type"""
    query = db.session.query(
        Order.meal_type,
        func.count(Order.id).label('count'),
        func.sum(Order.amount).label('revenue')
    ).filter(Order.status != 'cancelled')

    if start_date:
        query = query.filter(Order.order_date >= start_date)
    if end_date:
        query = query.filter(Order.order_date <= end_date)

    results = query.group_by(Order.meal_type).all()

    # Also get extra chapati stats
    extra_stats = db.session.query(
        func.sum(Order.extra_chapati).label('total_extras'),
        func.sum(Order.extra_chapati * 10).label('extra_revenue')
    ).filter(
        Order.status != 'cancelled',
        Order.extra_chapati > 0
    )
    if start_date:
        extra_stats = extra_stats.filter(Order.order_date >= start_date)
    if end_date:
        extra_stats = extra_stats.filter(Order.order_date <= end_date)

    extras = extra_stats.first()

    distribution = [{
        'type': r.meal_type,
        'count': r.count,
        'revenue': float(r.revenue)
    } for r in results]

    distribution.append({
        'type': 'extra_chapati',
        'count': int(extras.total_extras or 0),
        'revenue': float(extras.extra_revenue or 0)
    })

    return distribution


def get_customer_stats():
    """Get customer type breakdown"""
    results = db.session.query(
        User.customer_type,
        func.count(User.id).label('count')
    ).filter(
        User.role == 'customer',
        User.is_active == True
    ).group_by(User.customer_type).all()

    return [{
        'type': r.customer_type or 'unassigned',
        'count': r.count
    } for r in results]


def get_today_summary():
    """Get today's delivery summary"""
    today = date.today()

    orders = db.session.query(
        Order.meal_time,
        Order.meal_type,
        func.count(Order.id).label('count'),
        func.sum(Order.amount).label('revenue'),
        func.sum(Order.extra_chapati).label('extras')
    ).filter(
        Order.order_date == today,
        Order.status != 'cancelled'
    ).group_by(Order.meal_time, Order.meal_type).all()

    summary = {
        'date': today.isoformat(),
        'morning': {'full': 0, 'half': 0, 'extras': 0, 'revenue': 0},
        'dinner': {'full': 0, 'half': 0, 'extras': 0, 'revenue': 0},
        'total_orders': 0,
        'total_revenue': 0
    }

    for o in orders:
        meal = summary[o.meal_time]
        meal[o.meal_type] = o.count
        meal['extras'] += int(o.extras or 0)
        meal['revenue'] += float(o.revenue or 0)
        summary['total_orders'] += o.count
        summary['total_revenue'] += float(o.revenue or 0)

    return summary


def get_monthly_revenue():
    """Get current month's total revenue"""
    today = date.today()
    first_day = today.replace(day=1)

    result = db.session.query(
        func.coalesce(func.sum(Order.amount), 0).label('revenue')
    ).filter(
        Order.order_date >= first_day,
        Order.order_date <= today,
        Order.status != 'cancelled'
    ).scalar()

    return float(result)
