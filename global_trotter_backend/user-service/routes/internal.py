from flask import Blueprint, jsonify, request

from services.service_client import internal_only
from services.storage import load_json, save_json

internal_bp = Blueprint("internal", __name__, url_prefix="/internal")


def _public(user):
    return {k: v for k, v in user.items() if k != "password_hash"}


@internal_bp.route("/users/lookup", methods=["GET"])
@internal_only
def lookup_user():
    email = (request.args.get("email") or "").strip().lower()
    number = (request.args.get("number") or "").strip()

    if not email and not number:
        return jsonify({"error": "email or number is required"}), 400

    users = load_json("users.json")["users"]
    user = next(
        (
            u
            for u in users
            if (email and (u.get("email") or "").lower() == email)
            or (number and u.get("number") == number)
        ),
        None,
    )
    if not user:
        return jsonify({"error": "user not found"}), 404

    return jsonify({"user": _public(user)}), 200


@internal_bp.route("/users/batch", methods=["POST"])
@internal_only
def batch_users():
    ids = (request.get_json(silent=True) or {}).get("ids") or []
    wanted = set(ids)

    users = load_json("users.json")["users"]
    return jsonify({"users": {u["id"]: _public(u) for u in users if u["id"] in wanted}}), 200


@internal_bp.route("/users/<user_id>", methods=["GET"])
@internal_only
def get_user(user_id):
    users = load_json("users.json")["users"]
    user = next((u for u in users if u["id"] == user_id), None)
    if not user:
        return jsonify({"error": "user not found"}), 404

    return jsonify({"user": _public(user)}), 200


@internal_bp.route("/users/<user_id>/favorites", methods=["PUT"])
@internal_only
def update_favorites(user_id):
    body = request.get_json(silent=True) or {}
    destination_id = body.get("destination_id")
    action = body.get("action")

    if not destination_id or action not in ("add", "remove"):
        return jsonify({"error": "destination_id and action (add|remove) are required"}), 400

    data = load_json("users.json")
    user = next((u for u in data["users"] if u["id"] == user_id), None)
    if not user:
        return jsonify({"error": "user not found"}), 404

    favorites = user.setdefault("favorites", [])

    if action == "add" and destination_id not in favorites:
        favorites.append(destination_id)
        save_json("users.json", data)
    elif action == "remove" and destination_id in favorites:
        favorites.remove(destination_id)
        save_json("users.json", data)

    return jsonify({"favorites": favorites}), 200