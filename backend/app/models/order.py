"""
Order model - daily tiffin orders
"""
from datetime import datetime, timezone
from app.extensions import db


class Order(db.Model):
    __tablename__ = 'orders'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    subscription_id = db.Column(db.Integer, db.ForeignKey('subscriptions.id', ondelete='SET NULL'), nullable=True)
    order_date = db.Column(db.Date, nullable=False, index=True)
    meal_time = db.Column(db.String(10), nullable=False)  # morning, dinner
    meal_type = db.Column(db.String(10), nullable=False)  # full, half
    extra_chapati = db.Column(db.Integer, default=0)
    amount = db.Column(db.Numeric(10, 2), nullable=False)
    status = db.Column(db.String(20), default='booked', nullable=False, index=True)  # booked, delivered, cancelled
    source = db.Column(db.String(10), default='manual', nullable=False)  # auto, manual
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Unique constraint: one active order per user per meal_time per day
    __table_args__ = (
        db.Index('idx_orders_user_date', 'user_id', 'order_date', 'meal_time'),
    )

    def calculate_amount(self):
        """Calculate order amount based on meal type and extras"""
        from flask import current_app
        if self.meal_type == 'full':
            base = current_app.config.get('FULL_MEAL_PRICE', 80.00)
        else:
            base = current_app.config.get('HALF_MEAL_PRICE', 60.00)

        extra = self.extra_chapati * current_app.config.get('EXTRA_CHAPATI_PRICE', 10.00)
        self.amount = base + extra
        return self.amount

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'user_name': self.user.name if self.user else None,
            'subscription_id': self.subscription_id,
            'order_date': self.order_date.isoformat(),
            'meal_time': self.meal_time,
            'meal_type': self.meal_type,
            'extra_chapati': self.extra_chapati,
            'amount': float(self.amount),
            'status': self.status,
            'source': self.source,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f'<Order {self.id} - {self.order_date} {self.meal_time}>'
