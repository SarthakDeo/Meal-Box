"""
Role-based access control decorators
"""
from functools import wraps
from flask import jsonify
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request
from app.extensions import db
from app.models.user import User


def admin_required(fn):
    """Decorator: requires admin role"""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        user_id = get_jwt_identity()
        user = db.session.get(User, user_id)
        if not user or user.role != 'admin':
            return jsonify({"error": "Admin access required"}), 403
        return fn(*args, **kwargs)
    return wrapper


def customer_required(fn):
    """Decorator: requires customer role"""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        user_id = get_jwt_identity()
        user = db.session.get(User, user_id)
        if not user or user.role != 'customer':
            return jsonify({"error": "Customer access required"}), 403
        return fn(*args, **kwargs)
    return wrapper


def get_current_user():
    """Helper to get current authenticated user"""
    user_id = get_jwt_identity()
    return db.session.get(User, user_id)
