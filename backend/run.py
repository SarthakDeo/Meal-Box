"""
Meal Box - Application Entry Point
"""
from app import create_app
from app.extensions import db
from flask_migrate import upgrade
import os

app = create_app()

def init_db_data():
    """Ensure database schema is up-to-date and seed admin if needed."""
    try:
        with app.app_context():
            upgrade()  # run migrations
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
    except Exception as e:
        print(f"⚠️ DB initialization note: {e}")

if __name__ == "__main__":
    init_db_data()
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)