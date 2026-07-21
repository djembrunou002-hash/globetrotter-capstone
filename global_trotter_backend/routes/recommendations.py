from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from services.scoring import get_recommendations
from services.storage import load_json

recommendations_bp = Blueprint("recommendations", __name__)


@recommendations_bp.route("/recommendations", methods=["GET"])
@jwt_required()
def recommendations():
    user_id = get_jwt_identity()

    users = load_json("users.json")["users"]
    user = next((u for u in users if u["id"] == user_id), None)
    if not user:
        return jsonify({"error": "user not found"}), 404

    destinations = load_json("destinations.json")["destinations"]
    itineraries = load_json("itineraries.json")["itineraries"]
    user_itineraries = [i for i in itineraries if i["user_id"] == user_id]

    favorite_ids = set(user.get("favorites", []))
    favorite_destinations = [d for d in destinations if d["id"] in favorite_ids]

    limit = request.args.get("limit", default=5, type=int)
    results = get_recommendations(
        user, destinations, user_itineraries, favorite_destinations=favorite_destinations, limit=limit
    )

    return jsonify({"user_id": user_id, "recommendations": results}), 200