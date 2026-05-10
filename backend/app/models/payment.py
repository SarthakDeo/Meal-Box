"""
Payment model - admin-recorded payment entries
"""
from datetime import datetime, timezone
from app.extensions import db


class Payment(db.Model):
    __tablename__ = 'payments'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    amount = db.Column(db.Numeric(10, 2), nullable=False)
    payment_date = db.Column(db.Date, nullable=False, index=True)
    payment_method = db.Column(db.String(20), default='cash', nullable=False)  # cash, upi, bank
    notes = db.Column(db.Text)
    recorded_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    recorder = db.relationship('User', foreign_keys=[recorded_by])

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'user_name': self.user.name if self.user else None,
            'amount': float(self.amount),
            'payment_date': self.payment_date.isoformat(),
            'payment_method': self.payment_method,
            'notes': self.notes,
            'recorded_by': self.recorded_by,
            'recorder_name': self.recorder.name if self.recorder else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f'<Payment {self.id} - ₹{self.amount} by User {self.user_id}>'
