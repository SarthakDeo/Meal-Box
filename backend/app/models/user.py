"""
User model - supports Admin and Customer roles
"""
from datetime import datetime, timezone
from app.extensions import db, bcrypt


class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    phone = db.Column(db.String(15))
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), default='customer', nullable=False)  # admin, customer
    customer_type = db.Column(db.String(20))  # mess, daywise (null for admin)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
                           onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    subscriptions = db.relationship('Subscription', backref='user', lazy='dynamic')
    orders = db.relationship('Order', backref='user', lazy='dynamic',
                             foreign_keys='Order.user_id')
    payments = db.relationship('Payment', backref='user', lazy='dynamic',
                               foreign_keys='Payment.user_id')

    def set_password(self, password):
        self.password_hash = bcrypt.generate_password_hash(password).decode('utf-8')

    def check_password(self, password):
        return bcrypt.check_password_hash(self.password_hash, password)

    @property
    def is_admin(self):
        return self.role == 'admin'

    def to_dict(self, include_balance=False):
        data = {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'phone': self.phone,
            'role': self.role,
            'customer_type': self.customer_type,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
        if include_balance:
            data['balance'] = self.get_balance()
        return data

    def get_balance(self):
        """Calculate remaining balance: total order cost - total payments"""
        from app.models.order import Order
        from app.models.payment import Payment
        from sqlalchemy import func

        total_orders = db.session.query(
            func.coalesce(func.sum(Order.amount), 0)
        ).filter(
            Order.user_id == self.id,
            Order.status != 'cancelled'
        ).scalar()

        total_payments = db.session.query(
            func.coalesce(func.sum(Payment.amount), 0)
        ).filter(
            Payment.user_id == self.id
        ).scalar()

        return float(total_orders) - float(total_payments)

    def __repr__(self):
        return f'<User {self.name} ({self.role})>'
