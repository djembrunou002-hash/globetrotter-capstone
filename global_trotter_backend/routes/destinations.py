from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from services.storage import load_json, save_json

destinations_bp = Blueprint("destinations", __name__)


@destinations_bp.route("/destinations", methods=["GET"])
def get_destinations():
    data = load_json("destinations.json")
    results = data["destinations"]

    tag = request.args.get("tag")
    budget = request.args.get("budget")
    country = request.args.get("country")
    region = request.args.get("region")
    area = request.args.get("area")
    place_type = request.args.get("type")
    query = request.args.get("q")

    if tag:
        results = [d for d in results if tag in d["tags"]]
    if budget:
        results = [d for d in results if d["budget_level"] == budget]
    if country:
        results = [d for d in results if d["country"] == country]
    if region:
        results = [d for d in results if d["region"] == region]
    if area:
        results = [d for d in results if d["area"] == area]
    if place_type:
        results = [d for d in results if d["type"] == place_type]
    if query:
        q = query.lower()
        results = [
            d for d in results
            if q in d["name"].lower() or q in d.get("description", "").lower()
        ]

    return jsonify({"destinations": results}), 200


@destinations_bp.route("/destinations/<destination_id>/rating", methods=["POST"])
@jwt_required()
def rate_destination(destination_id):
    body = request.get_json(silent=True) or {}
    stars = body.get("stars")

    if not isinstance(stars, int) or stars < 1 or stars > 5:
        return jsonify({"error": "stars must be an integer from 1 to 5"}), 400

    data = load_json("destinations.json")
    destination = next((d for d in data["destinations"] if d["id"] == destination_id), None)
    if not destination:
        return jsonify({"error": "destination not found"}), 404

    rating = destination.setdefault("rating", {"average": 0, "count": 0})
    new_count = rating["count"] + 1
    new_average = ((rating["average"] * rating["count"]) + stars) / new_count

    rating["average"] = round(new_average, 2)
    rating["count"] = new_count

    save_json("destinations.json", data)

    return jsonify({"destination_id": destination_id, "rating": rating}), 200


@destinations_bp.route("/destinations/<destination_id>/favorite", methods=["POST"])
@jwt_required()
def add_favorite(destination_id):
    user_id = get_jwt_identity()

    destinations = load_json("destinations.json")["destinations"]
    if not any(d["id"] == destination_id for d in destinations):
        return jsonify({"error": "destination not found"}), 404

    data = load_json("users.json")
    user = next((u for u in data["users"] if u["id"] == user_id), None)
    if not user:
        return jsonify({"error": "user not found"}), 404

    favorites = user.setdefault("favorites", [])
    if destination_id not in favorites:
        favorites.append(destination_id)
        save_json("users.json", data)

    return jsonify({"favorites": favorites}), 200


@destinations_bp.route("/destinations/<destination_id>/favorite", methods=["DELETE"])
@jwt_required()
def remove_favorite(destination_id):
    user_id = get_jwt_identity()

    data = load_json("users.json")
    user = next((u for u in data["users"] if u["id"] == user_id), None)
    if not user:
        return jsonify({"error": "user not found"}), 404

    favorites = user.get("favorites", [])
    if destination_id in favorites:
        favorites.remove(destination_id)
        save_json("users.json", data)

    return jsonify({"favorites": favorites}), 200


@destinations_bp.route("/favorites", methods=["GET"])
@jwt_required()
def list_favorites():
    user_id = get_jwt_identity()
    users = load_json("users.json")["users"]
    user = next((u for u in users if u["id"] == user_id), None)
    if not user:
        return jsonify({"error": "user not found"}), 404

    favorite_ids = set(user.get("favorites", []))
    destinations = load_json("destinations.json")["destinations"]
    favorites = [d for d in destinations if d["id"] in favorite_ids]

    return jsonify({"favorites": favorites}), 200