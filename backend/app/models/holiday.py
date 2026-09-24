"""
Holiday model - system wide or kitchen holidays added by admin
"""
from datetime import datetime, timezone
from app.extensions import db


class Holiday(db.Model):
    __tablename__ = 'holidays'

    id = db.Column(db.Integer, primary_key=True)
    date = db.Column(db.Date, nullable=False, index=True)
    title = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=True)
    meal_time = db.Column(db.String(10), default='both', nullable=False)  # morning, dinner, both
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            'id': self.id,
            'date': self.date.isoformat() if self.date else None,
            'title': self.title,
            'description': self.description or '',
            'meal_time': self.meal_time,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f'<Holiday {self.id} - {self.title} on {self.date} ({self.meal_time})>'
