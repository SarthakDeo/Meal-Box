"""
Helper utilities
"""
from datetime import datetime, date
import pytz


IST = pytz.timezone('Asia/Kolkata')


def get_ist_now():
    """Get current time in IST"""
    return datetime.now(IST)


def get_ist_today():
    """Get today's date in IST"""
    return get_ist_now().date()


def can_book_order(meal_time: str) -> bool:
    """Check if an order can be placed based on time constraints"""
    now = get_ist_now()
    if meal_time == 'morning':
        cutoff = now.replace(hour=10, minute=30, second=0, microsecond=0)
    elif meal_time == 'dinner':
        cutoff = now.replace(hour=19, minute=30, second=0, microsecond=0)
    else:
        return False
    return now < cutoff


def get_meal_price(meal_type: str, extra_chapati: int = 0) -> float:
    """Calculate meal price"""
    base = 80.00 if meal_type == 'full' else 60.00
    extra = extra_chapati * 10.00
    return base + extra


def format_currency(amount):
    """Format amount in INR"""
    return f"₹{amount:,.2f}"
