"""
Meal Box - Application Entry Point
"""
from app import create_app
from app.extensions import db
from flask_migrate import upgrade
import os

app = create_app()

with app.app_context():
    upgrade()  # run migrations
    
    # Auto create admin user
    from app.models.user import User
    admin = User.query.filter_by(email='admin@mealbox.com').first()
    if not admin:
        admin = User(
            name='Admin',
            email='admin@mealbox.com',
            phone='9156246585',
            role='admin',
            is_active=True
        )
        admin.set_password('admin123')
        db.session.add(admin)
        db.session.commit()
        print("✅ Admin created!")

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)