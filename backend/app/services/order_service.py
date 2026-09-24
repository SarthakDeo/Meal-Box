"""
Order service - handles auto-generation for mess subscribers
"""
from datetime import date
from app.extensions import db
from app.models.subscription import Subscription
from app.models.order import Order
from app.models.holiday import Holiday
from app.utils.helpers import get_meal_price


def generate_daily_orders(target_date=None):
    """
    Generate daily orders for all active mess subscriptions.
    Called by scheduler or cron endpoint.
    """
    if target_date is None:
        target_date = date.today()

    active_subs = Subscription.query.filter_by(status='active').all()
    holidays = Holiday.query.filter_by(date=target_date).all()
    holiday_meal_times = set()
    for h in holidays:
        if h.meal_time == 'both':
            holiday_meal_times.add('morning')
            holiday_meal_times.add('dinner')
        else:
            holiday_meal_times.add(h.meal_time)

    created_count = 0

    for sub in active_subs:
        if not (sub.start_date <= target_date <= sub.end_date):
            continue

        meal_times = []
        if sub.meal_time in ('morning', 'both'):
            meal_times.append('morning')
        if sub.meal_time in ('dinner', 'both'):
            meal_times.append('dinner')

        for meal_time in meal_times:
            # Skip if target_date is a holiday for this meal_time
            if meal_time in holiday_meal_times:
                continue

            # Check if order already exists (including cancelled/pre-recorded leave orders)
            existing = Order.query.filter_by(
                user_id=sub.user_id,
                order_date=target_date,
                meal_time=meal_time
            ).first()

            if not existing:
                amount = get_meal_price(sub.meal_type)
                order = Order(
                    user_id=sub.user_id,
                    subscription_id=sub.id,
                    order_date=target_date,
                    meal_time=meal_time,
                    meal_type=sub.meal_type,
                    extra_chapati=0,
                    quantity=1,
                    amount=amount,
                    source='auto',
                    status='booked'
                )
                db.session.add(order)
                created_count += 1

    db.session.commit()
    return created_count

