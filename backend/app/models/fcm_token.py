"""
FCM Token model — stores per-user push notification tokens
"""
from datetime import datetime, timezone
from app.extensions import db


class FcmToken(db.Model):
    __tablename__ = 'fcm_tokens'

    id         = db.Column(db.Integer, primary_key=True)
    user_id    = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'),
                           nullable=False, index=True)
    token      = db.Column(db.Text, unique=True, nullable=False)
    platform   = db.Column(db.String(20), default='web', nullable=False)
    created_at = db.Column(db.DateTime(timezone=True),
                           default=lambda: datetime.now(timezone.utc))

    user = db.relationship('User', backref=db.backref('fcm_tokens', lazy='dynamic',
                                                       passive_deletes=True))

    def to_dict(self):
        return {
            'id':         self.id,
            'user_id':    self.user_id,
            'platform':   self.platform,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f'<FcmToken user_id={self.user_id} platform={self.platform}>'
