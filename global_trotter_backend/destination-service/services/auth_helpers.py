from flask_jwt_extended import get_jwt_identity

from services.clients import fetch_user


def get_current_user():
    user_id = get_jwt_identity()
    if not user_id:
        return None
    return fetch_user(user_id)


def is_admin(user):
    return bool(user) and user.get("role") == "admin"


def public_user(user):
    return {k: v for k, v in user.items() if k != "password_hash"}