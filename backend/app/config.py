"""
Application configuration
"""
import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()


class Config:
    # Flask
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')

    # Database
    basedir = os.path.abspath(os.path.dirname(os.path.dirname(__file__)))
    _db_url = os.getenv(
        'DATABASE_URL',
        'sqlite:///' + os.path.join(basedir, 'mealbox.db')
    )
    # Normalize all PostgreSQL URL schemes to use psycopg2 driver
    if _db_url.startswith('postgres://'):
        _db_url = _db_url.replace('postgres://', 'postgresql+psycopg2://', 1)
    elif _db_url.startswith('postgresql://'):
        _db_url = _db_url.replace('postgresql://', 'postgresql+psycopg2://', 1)
    elif _db_url.startswith('postgresql+psycopg://'):
        _db_url = _db_url.replace('postgresql+psycopg://', 'postgresql+psycopg2://', 1)

    # psycopg2 does not support channel_binding parameter — strip it from URL
    if 'channel_binding=' in _db_url:
        import re
        _db_url = re.sub(r'[&?]channel_binding=[^&]*', '', _db_url)

    SQLALCHEMY_DATABASE_URI = _db_url

    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Only pass sslmode when connecting to a real PostgreSQL server (Neon on Render).
    # SQLite (local dev fallback) does not accept connect_args at all.
    _is_postgres = _db_url.startswith('postgresql')
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_size': 5,
        'pool_recycle': 300,
        'pool_pre_ping': True,
        **({'connect_args': {'sslmode': 'require'}} if _is_postgres else {}),
    }

    # JWT
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'jwt-secret-key-change-in-production')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)
    JWT_TOKEN_LOCATION = ['headers']

    # CORS
    CORS_ORIGINS = os.getenv('CORS_ORIGINS', 'http://localhost:5173').split(',')

    # App
    TIMEZONE = 'Asia/Kolkata'
    FULL_MEAL_PRICE = 80.00
    HALF_MEAL_PRICE = 60.00
    EXTRA_CHAPATI_PRICE = 10.00
    MORNING_CUTOFF_HOUR = 10
    MORNING_CUTOFF_MINUTE = 30
    DINNER_CUTOFF_HOUR = 19
    DINNER_CUTOFF_MINUTE = 30
