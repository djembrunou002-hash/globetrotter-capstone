import uuid
from datetime import datetime, timezone

from flask import Blueprint, jsonify, request
from flask_jwt_extended import create_access_token
from werkzeug.security import check_password_hash, generate_password_hash

from services.storage import load_json, save_json

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/register", methods=["POST"])
def register():
    body = request.get_json(silent=True) or {}
    name = body.get("name")
    email = body.get("email")
    number = body.get("number")
    password = body.get("password")

    if not name or not password or (not email and not number):
        return jsonify({"error": "name, password, and email or number are required"}), 400

    data = load_json("users.json")
    users = data["users"]

    if email and any(u.get("email") == email for u in users):
        return jsonify({"error": "email already registered"}), 409
    if number and any(u.get("number") == number for u in users):
        return jsonify({"error": "number already registered"}), 409

    user = {
        "id": f"usr_{uuid.uuid4().hex[:8]}",
        "name": name,
        "email": email,
        "number": number,
        "password_hash": generate_password_hash(password),
        "favorites": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    users.append(user)
    save_json("users.json", data)

    public_user = {k: v for k, v in user.items() if k != "password_hash"}
    return jsonify({"user": public_user}), 201


@auth_bp.route("/login", methods=["POST"])
def login():
    body = request.get_json(silent=True) or {}
    email = body.get("email")
    number = body.get("number")
    password = body.get("password")

    if not password or (not email and not number):
        return jsonify({"error": "password and email or number are required"}), 400

    data = load_json("users.json")
    user = next(
        (u for u in data["users"] if (email and u.get("email") == email) or (number and u.get("number") == number)),
        None,
    )

    if not user or not check_password_hash(user["password_hash"], password):
        return jsonify({"error": "invalid credentials"}), 401

    token = create_access_token(identity=user["id"])
    return jsonify({"token": token}), 200