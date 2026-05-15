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

    # ✅ Simple CORS fix — allows all origins temporarily
    CORS(app, 
         origins=["https://meal-box-bay.vercel.app", "http://localhost:5173"],
         supports_credentials=True,
         allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
         methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
         expose_headers=["Content-Type", "Authorization"]
    )

    # Handle OPTIONS preflight manually
    @app.before_request
    def handle_options():
        from flask import request, jsonify
        if request.method == "OPTIONS":
            response = app.make_default_options_response()
            response.headers["Access-Control-Allow-Origin"] = "https://meal-box-bay.vercel.app"
            response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
            response.headers["Access-Control-Allow-Credentials"] = "true"
            return response

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

    @app.cli.command("seed-admin")
    def seed_admin():
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
            print("✅ Admin user created")
        else:
            print("ℹ️  Admin already exists.")

    return app