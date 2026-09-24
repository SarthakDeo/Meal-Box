"""
Meal Box - Flask Application Factory
"""
from flask import Flask
from flask_cors import CORS
from app.extensions import db, migrate, jwt, bcrypt
from app.config import Config as AppConfig

def create_app(config_class=AppConfig):
    flask_app = Flask(__name__)
    flask_app.config.from_object(config_class)

    # ✅ CORS configuration allowing local dev and production
    CORS(flask_app, 
         origins=["https://meal-box-bay.vercel.app", "http://localhost:5173", "http://127.0.0.1:5173"],
         supports_credentials=True,
         allow_headers=["Content-Type", "Authorization", "X-Requested-With", "X-Cron-Secret"],
         methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
         expose_headers=["Content-Type", "Authorization"]
    )

    # Initialize extensions
    db.init_app(flask_app)
    migrate.init_app(flask_app, db)
    jwt.init_app(flask_app)
    bcrypt.init_app(flask_app)

    with flask_app.app_context():
        import app.models  # ensure all models are loaded
        db.create_all()

    # Handle OPTIONS preflight manually
    @flask_app.before_request
    def handle_options():
        from flask import request
        if request.method == "OPTIONS":
            response = flask_app.make_default_options_response()
            origin = request.headers.get("Origin", "*")
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With, X-Cron-Secret"
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH"
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
    from app.routes.notifications import notifications_bp

    flask_app.register_blueprint(auth_bp, url_prefix='/api/auth')
    flask_app.register_blueprint(menu_bp, url_prefix='/api/menu')
    flask_app.register_blueprint(orders_bp, url_prefix='/api/orders')
    flask_app.register_blueprint(subscriptions_bp, url_prefix='/api/subscriptions')
    flask_app.register_blueprint(customers_bp, url_prefix='/api/customers')
    flask_app.register_blueprint(payments_bp, url_prefix='/api/payments')
    flask_app.register_blueprint(analytics_bp, url_prefix='/api/analytics')
    flask_app.register_blueprint(notifications_bp, url_prefix='/api/notifications')

    # Health Check endpoints for keep-alive pings (Cron-Job / UptimeRobot / Render)
    @flask_app.route('/', methods=['GET'])
    @flask_app.route('/api/health', methods=['GET'])
    def health_check():
        return {"status": "ok", "message": "Meal Box Backend Service active"}, 200

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

    @flask_app.cli.command("seed-admin")
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

    return flask_app