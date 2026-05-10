"""
Menu management routes
"""
from datetime import date, datetime
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.extensions import db
from app.models.menu import DailyMenu
from app.utils.decorators import admin_required
from app.utils.helpers import get_ist_today

menu_bp = Blueprint('menu', __name__)


@menu_bp.route('/today', methods=['GET'])
@jwt_required()
def get_today_menu():
    """Get today's menu"""
    today = get_ist_today()
    menus = DailyMenu.query.filter_by(menu_date=today, is_published=True).all()
    return jsonify({
        "date": today.isoformat(),
        "menus": [m.to_dict() for m in menus]
    }), 200


@menu_bp.route('', methods=['GET'])
@jwt_required()
def get_menu():
    """Get menu by date (query param: date=YYYY-MM-DD)"""
    date_str = request.args.get('date')
    if date_str:
        try:
            menu_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            return jsonify({"error": "Invalid date format. Use YYYY-MM-DD"}), 400
    else:
        menu_date = get_ist_today()

    menus = DailyMenu.query.filter_by(menu_date=menu_date).all()
    return jsonify({
        "date": menu_date.isoformat(),
        "menus": [m.to_dict() for m in menus]
    }), 200


@menu_bp.route('', methods=['POST'])
@admin_required
def create_menu():
    """Create or update daily menu"""
    data = request.get_json()

    required = ['menu_date', 'meal_time', 'items']
    for field in required:
        if not data.get(field):
            return jsonify({"error": f"{field} is required"}), 400

    if data['meal_time'] not in ('morning', 'dinner'):
        return jsonify({"error": "meal_time must be 'morning' or 'dinner'"}), 400

    try:
        menu_date = datetime.strptime(data['menu_date'], '%Y-%m-%d').date()
    except ValueError:
        return jsonify({"error": "Invalid date format. Use YYYY-MM-DD"}), 400

    # Upsert: update if exists, create if not
    menu = DailyMenu.query.filter_by(
        menu_date=menu_date,
        meal_time=data['meal_time']
    ).first()

    user_id = get_jwt_identity()

    if menu:
        menu.items = data['items']
        menu.is_published = data.get('is_published', True)
        msg = "Menu updated"
    else:
        menu = DailyMenu(
            menu_date=menu_date,
            meal_time=data['meal_time'],
            items=data['items'],
            is_published=data.get('is_published', True),
            created_by=user_id
        )
        db.session.add(menu)
        msg = "Menu created"

    db.session.commit()
    return jsonify({"message": msg, "menu": menu.to_dict()}), 201


@menu_bp.route('/<int:menu_id>', methods=['PUT'])
@admin_required
def update_menu(menu_id):
    """Update a menu entry"""
    menu = DailyMenu.query.get_or_404(menu_id)
    data = request.get_json()

    if data.get('items') is not None:
        menu.items = data['items']
    if data.get('is_published') is not None:
        menu.is_published = data['is_published']

    db.session.commit()
    return jsonify({"message": "Menu updated", "menu": menu.to_dict()}), 200


@menu_bp.route('/<int:menu_id>', methods=['DELETE'])
@admin_required
def delete_menu(menu_id):
    """Delete a menu entry"""
    menu = DailyMenu.query.get_or_404(menu_id)
    db.session.delete(menu)
    db.session.commit()
    return jsonify({"message": "Menu deleted"}), 200


@menu_bp.route('/week', methods=['GET'])
@jwt_required()
def get_week_menu():
    """Get menu for the current week"""
    from datetime import timedelta
    today = get_ist_today()
    start = today - timedelta(days=today.weekday())  # Monday
    end = start + timedelta(days=6)  # Sunday

    menus = DailyMenu.query.filter(
        DailyMenu.menu_date >= start,
        DailyMenu.menu_date <= end,
        DailyMenu.is_published == True
    ).order_by(DailyMenu.menu_date, DailyMenu.meal_time).all()

    return jsonify({
        "start_date": start.isoformat(),
        "end_date": end.isoformat(),
        "menus": [m.to_dict() for m in menus]
    }), 200
