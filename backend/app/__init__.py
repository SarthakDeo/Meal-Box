"""
Meal Box - Flask Application Factory
"""
from flask import Flask
from flask_cors import CORS
from app.extensions import db, migrate, jwt, bcrypt
from app.config import Config


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    bcrypt.init_app(app)

    # CORS configuration
    CORS(app, resources={
        r"/api/*": {
            "origins": app.config.get('CORS_ORIGINS', '*'),
            "supports_credentials": True
        }
    })

    # Register blueprints
    from app.routes.auth import auth_bp
    from app.routes.menu import menu_bp
    from app.routes.orders import orders_bp
    from app.routes.subscriptions import subscriptions_bp
    from app.routes.customers import customers_bp
    from app.routes.payments import payments_bp
    from app.routes.analytics import analytics_bp

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(menu_bp, url_prefix='/api/menu')
    app.register_blueprint(orders_bp, url_prefix='/api/orders')
    app.register_blueprint(subscriptions_bp, url_prefix='/api/subscriptions')
    app.register_blueprint(customers_bp, url_prefix='/api/customers')
    app.register_blueprint(payments_bp, url_prefix='/api/payments')
    app.register_blueprint(analytics_bp, url_prefix='/api/analytics')

    # JWT error handlers
    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return {"error": "Token has expired", "code": "token_expired"}, 401

    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        return {"error": "Invalid token", "code": "invalid_token"}, 401

    @jwt.unauthorized_loader
    def missing_token_callback(error):
        return {"error": "Authorization required", "code": "authorization_required"}, 401

    # Seed admin command
    @app.cli.command("seed-admin")
    def seed_admin():
        """Create the pre-seeded admin user."""
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
            print("✅ Admin user created: admin@mealbox.com / admin123")
        else:
            print("ℹ️  Admin user already exists.")

    return app
