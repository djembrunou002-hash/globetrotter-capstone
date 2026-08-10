from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from services.storage import load_json, save_json

users_bp = Blueprint("users", __name__)


@users_bp.route("/users/stats", methods=["GET"])
def user_stats():
    users = load_json("users.json")["users"]
    return jsonify({"user_count": len(users)}), 200


@users_bp.route("/users/preferences", methods=["PUT"])
@jwt_required()
def update_preferences():
    user_id = get_jwt_identity()

    body = request.get_json(silent=True) or {}
    travel_style = body.get("travel_style")

    if not isinstance(travel_style, list) or not all(isinstance(s, str) for s in travel_style):
        return jsonify({"error": "travel_style must be a list of strings"}), 400

    cleaned_style = sorted({s.strip().lower() for s in travel_style if s.strip()})

    data = load_json("users.json")
    user = next((u for u in data["users"] if u["id"] == user_id), None)
    if not user:
        return jsonify({"error": "user not found"}), 404

    preferences = user.setdefault("preferences", {})
    preferences["travel_style"] = cleaned_style
    save_json("users.json", data)

    public_user = {k: v for k, v in user.items() if k != "password_hash"}
    return jsonify({"user": public_user}), 200