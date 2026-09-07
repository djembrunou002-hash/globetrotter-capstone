from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from services.storage import load_json, save_json

users_bp = Blueprint("users", __name__)

SEARCH_MIN_LENGTH = 2
SEARCH_LIMIT = 8


def _relations(user_id):
    links = load_json("friends.json")["links"]
    relations = {}

    for link in links:
        if link["status"] not in ("pending", "accepted"):
            continue

        if link["from_user_id"] == user_id:
            other = link["to_user_id"]
        elif link["to_user_id"] == user_id:
            other = link["from_user_id"]
        else:
            continue

        if link["status"] == "accepted":
            relations[other] = "friend"
        elif relations.get(other) != "friend":
            relations[other] = "outgoing" if link["from_user_id"] == user_id else "incoming"

    return relations


def _rank(user, query):
    email = (user.get("email") or "").lower()
    name = (user.get("name") or "").lower()
    number = user.get("number") or ""

    if email.startswith(query):
        return 0
    if name.startswith(query):
        return 1
    if number.startswith(query):
        return 2
    if query in email:
        return 3
    if query in name:
        return 4
    if query in number:
        return 5

    return None


@users_bp.route("/users/stats", methods=["GET"])
def user_stats():
    users = load_json("users.json")["users"]
    return jsonify({"user_count": len(users)}), 200


@users_bp.route("/users/search", methods=["GET"])
@jwt_required()
def search_users():
    user_id = get_jwt_identity()
    query = (request.args.get("q") or "").strip().lower()

    if len(query) < SEARCH_MIN_LENGTH:
        return jsonify({"results": []}), 200

    relations = _relations(user_id)
    scored = []

    for user in load_json("users.json")["users"]:
        if user["id"] == user_id:
            continue

        rank = _rank(user, query)
        if rank is None:
            continue

        scored.append((rank, (user.get("email") or user.get("name") or "").lower(), user))

    scored.sort(key=lambda entry: (entry[0], entry[1]))

    results = [
        {
            "id": user["id"],
            "name": user.get("name") or "Traveler",
            "email": user.get("email"),
            "number": user.get("number"),
            "relation": relations.get(user["id"], "none"),
        }
        for _, _, user in scored[:SEARCH_LIMIT]
    ]

    return jsonify({"results": results}), 200


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