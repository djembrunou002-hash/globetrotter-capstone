from datetime import datetime, timezone

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from services.storage import load_json, save_json

friends_bp = Blueprint("friends", __name__)

FILE = "friends.json"


def _now():
    return datetime.now(timezone.utc).isoformat()


def _card(user, created_at=None):
    return {
        "id": user["id"],
        "name": user.get("name") or "Traveler",
        "email": user.get("email"),
        "number": user.get("number"),
        "created_at": created_at,
    }


def _links_for(user_id):
    data = load_json(FILE)
    return data, [link for link in data["links"] if link["user_id"] == user_id]


@friends_bp.route("/friends", methods=["GET"])
@jwt_required()
def list_friends():
    user_id = get_jwt_identity()
    _, links = _links_for(user_id)

    users = {u["id"]: u for u in load_json("users.json")["users"]}

    friends = []
    for link in sorted(links, key=lambda l: l["created_at"]):
        user = users.get(link["friend_id"])
        if user:
            friends.append(_card(user, link["created_at"]))

    return jsonify({"friends": friends}), 200


@friends_bp.route("/friends", methods=["POST"])
@jwt_required()
def add_friend():
    user_id = get_jwt_identity()
    body = request.get_json(silent=True) or {}

    email = (body.get("email") or "").strip().lower()
    number = (body.get("number") or "").strip()

    if not email and not number:
        return jsonify({"error": "an email or phone number is required"}), 400

    users = load_json("users.json")["users"]
    target = next(
        (
            u
            for u in users
            if (email and (u.get("email") or "").lower() == email)
            or (number and u.get("number") == number)
        ),
        None,
    )

    if not target:
        return jsonify({"error": "no traveller found with that contact"}), 404

    if target["id"] == user_id:
        return jsonify({"error": "you cannot add yourself"}), 400

    data = load_json(FILE)
    existing = next(
        (
            link
            for link in data["links"]
            if link["user_id"] == user_id and link["friend_id"] == target["id"]
        ),
        None,
    )

    if existing:
        return jsonify({"error": "this traveller is already in your friends"}), 409

    link = {"user_id": user_id, "friend_id": target["id"], "created_at": _now()}
    data["links"].append(link)
    save_json(FILE, data)

    return jsonify({"friend": _card(target, link["created_at"])}), 201


@friends_bp.route("/friends/<friend_id>", methods=["DELETE"])
@jwt_required()
def remove_friend(friend_id):
    user_id = get_jwt_identity()

    data = load_json(FILE)
    before = len(data["links"])
    data["links"] = [
        link
        for link in data["links"]
        if not (link["user_id"] == user_id and link["friend_id"] == friend_id)
    ]

    if len(data["links"]) == before:
        return jsonify({"error": "friend not found"}), 404

    save_json(FILE, data)
    return jsonify({"removed": friend_id}), 200