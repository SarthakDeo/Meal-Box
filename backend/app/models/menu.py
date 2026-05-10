"""
DailyMenu model - stores daily menu items
"""
from datetime import datetime, timezone
from app.extensions import db


class DailyMenu(db.Model):
    __tablename__ = 'daily_menu'

    id = db.Column(db.Integer, primary_key=True)
    menu_date = db.Column(db.Date, nullable=False, index=True)
    meal_time = db.Column(db.String(10), nullable=False)  # morning, dinner
    items = db.Column(db.JSON, nullable=False, default=list)  # List of menu item strings
    is_published = db.Column(db.Boolean, default=False)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Unique constraint: one menu per date per meal_time
    __table_args__ = (
        db.UniqueConstraint('menu_date', 'meal_time', name='uq_menu_date_meal'),
    )

    def to_dict(self):
        return {
            'id': self.id,
            'menu_date': self.menu_date.isoformat(),
            'meal_time': self.meal_time,
            'items': self.items or [],
            'is_published': self.is_published,
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f'<DailyMenu {self.menu_date} - {self.meal_time}>'
