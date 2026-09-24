"""
Subscription model - supports mess (auto-booking) subscriptions
"""
from datetime import datetime, timezone, date
from app.extensions import db


class Subscription(db.Model):
    __tablename__ = 'subscriptions'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=False)
    status = db.Column(db.String(20), default='active', nullable=False)  # active, paused, cancelled, expired
    meal_type = db.Column(db.String(10), default='full', nullable=False)  # full, half
    meal_time = db.Column(db.String(10), default='both', nullable=False)  # morning, dinner, both
    price_per_day = db.Column(db.Numeric(10, 2), nullable=False)
    is_paid = db.Column(db.Boolean, default=False)
    pause_reason = db.Column(db.Text)
    paused_at = db.Column(db.Date)
    resumed_at = db.Column(db.Date)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    orders = db.relationship('Order', backref='subscription', lazy='dynamic')

    @property
    def is_active_today(self):
        today = date.today()
        return (
            self.status == 'active' and
            self.start_date <= today <= self.end_date
        )

    @property
    def total_calendar_days(self):
        if self.end_date and self.start_date:
            days = (self.end_date - self.start_date).days + 1
            return max(1, days)
        return 0

    @property
    def days_remaining(self):
        today = date.today()
        if today > self.end_date:
            return 0
        return max(0, (self.end_date - today).days + 1)

    def get_leave_orders(self):
        from app.models.order import Order
        return Order.query.filter(
            Order.user_id == self.user_id,
            Order.order_date >= self.start_date,
            Order.order_date <= self.end_date,
            Order.status == 'cancelled'
        ).all()

    @property
    def total_amount(self):
        leave_orders = self.get_leave_orders()
        leave_dates_set = set(o.order_date for o in leave_orders)
        net_days = max(0, self.total_calendar_days - len(leave_dates_set))
        return float(self.price_per_day) * net_days

    def to_dict(self):
        leave_orders = self.get_leave_orders()
        leave_info = []
        leave_dates_set = set()
        for o in leave_orders:
            ld_str = o.order_date.isoformat()
            leave_dates_set.add(ld_str)
            leave_info.append({
                'id': o.id,
                'date': ld_str,
                'meal_time': o.meal_time,
                'note': o.note or 'Cancelled / Leave'
            })

        leave_count = len(leave_dates_set)
        raw_rem = self.days_remaining
        effective_rem = raw_rem + leave_count
        price_day = float(self.price_per_day)
        price_meal = round(price_day / 2.0, 2) if self.meal_time == 'both' else price_day

        return {
            'id': self.id,
            'user_id': self.user_id,
            'user_name': self.user.name if self.user else None,
            'start_date': self.start_date.isoformat(),
            'end_date': self.end_date.isoformat(),
            'status': self.status,
            'meal_type': self.meal_type,
            'meal_time': self.meal_time,
            'price_per_day': price_day,
            'price_per_meal': price_meal,
            'total_calendar_days': self.total_calendar_days,
            'leave_count': leave_count,
            'leave_dates': sorted(list(leave_dates_set)),
            'leave_details': sorted(leave_info, key=lambda x: x['date']),
            'net_active_days': max(0, self.total_calendar_days - leave_count),
            'is_paid': self.is_paid,
            'total_amount': self.total_amount,
            'pause_reason': self.pause_reason,
            'paused_at': self.paused_at.isoformat() if self.paused_at else None,
            'resumed_at': self.resumed_at.isoformat() if self.resumed_at else None,
            'is_active_today': self.is_active_today,
            'days_remaining': raw_rem,
            'effective_days_remaining': effective_rem,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f'<Subscription {self.id} - User {self.user_id} ({self.status})>'
