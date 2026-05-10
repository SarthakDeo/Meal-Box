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
    def days_remaining(self):
        today = date.today()
        if today > self.end_date:
            return 0
        return (self.end_date - today).days

    @property
    def total_amount(self):
        days = (self.end_date - self.start_date).days
        return float(self.price_per_day) * days if days > 0 else 0

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'user_name': self.user.name if self.user else None,
            'start_date': self.start_date.isoformat(),
            'end_date': self.end_date.isoformat(),
            'status': self.status,
            'meal_type': self.meal_type,
            'meal_time': self.meal_time,
            'price_per_day': float(self.price_per_day),
            'is_paid': self.is_paid,
            'total_amount': self.total_amount,
            'pause_reason': self.pause_reason,
            'paused_at': self.paused_at.isoformat() if self.paused_at else None,
            'resumed_at': self.resumed_at.isoformat() if self.resumed_at else None,
            'is_active_today': self.is_active_today,
            'days_remaining': self.days_remaining,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f'<Subscription {self.id} - User {self.user_id} ({self.status})>'
