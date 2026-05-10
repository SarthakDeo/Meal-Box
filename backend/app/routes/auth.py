"""
Authentication routes - login, register, refresh, logout, profile
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    create_access_token, create_refresh_token,
    jwt_required, get_jwt_identity
)
from app.extensions import db
from app.models.user import User
from app.utils.decorators import get_current_user

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/register', methods=['POST'])
def register():
    """Customer self-registration"""
    data = request.get_json()

    # Validate required fields
    required = ['name', 'email', 'password']
    for field in required:
        if not data.get(field):
            return jsonify({"error": f"{field} is required"}), 400

    # Check if email already exists
    if User.query.filter_by(email=data['email'].lower().strip()).first():
        return jsonify({"error": "Email already registered"}), 409

    # Create customer
    user = User(
        name=data['name'].strip(),
        email=data['email'].lower().strip(),
        phone=data.get('phone', '').strip(),
        role='customer',
        customer_type=data.get('customer_type', 'daywise'),
        is_active=True
    )
    user.set_password(data['password'])

    db.session.add(user)
    db.session.commit()

    # Auto-login after registration
    access_token = create_access_token(identity=str(user.id))
    refresh_token = create_refresh_token(identity=str(user.id))

    return jsonify({
        "message": "Registration successful",
        "user": user.to_dict(),
        "access_token": access_token,
        "refresh_token": refresh_token
    }), 201


@auth_bp.route('/login', methods=['POST'])
def login():
    """Login with email and password"""
    data = request.get_json()

    if not data.get('email') or not data.get('password'):
        return jsonify({"error": "Email and password are required"}), 400

    user = User.query.filter_by(email=data['email'].lower().strip()).first()

    if not user or not user.check_password(data['password']):
        return jsonify({"error": "Invalid email or password"}), 401

    if not user.is_active:
        return jsonify({"error": "Account is deactivated. Contact admin."}), 403

    access_token = create_access_token(identity=str(user.id))
    refresh_token = create_refresh_token(identity=str(user.id))

    return jsonify({
        "message": "Login successful",
        "user": user.to_dict(),
        "access_token": access_token,
        "refresh_token": refresh_token
    }), 200


@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    """Refresh access token"""
    user_id = get_jwt_identity()
    access_token = create_access_token(identity=str(user_id))
    return jsonify({"access_token": access_token}), 200


@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_profile():
    """Get current user profile"""
    user = get_current_user()
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify({"user": user.to_dict(include_balance=True)}), 200


@auth_bp.route('/me', methods=['PUT'])
@jwt_required()
def update_profile():
    """Update current user profile"""
    user = get_current_user()
    if not user:
        return jsonify({"error": "User not found"}), 404

    data = request.get_json()

    if data.get('name'):
        user.name = data['name'].strip()
    if data.get('phone'):
        user.phone = data['phone'].strip()
    if data.get('password'):
        user.set_password(data['password'])

    db.session.commit()
    return jsonify({"message": "Profile updated", "user": user.to_dict()}), 200
