from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from services.clients import fetch_user, fetch_user_itineraries
from services.scoring import get_recommendations
from services.storage import load_json

recommendations_bp = Blueprint("recommendations", __name__)


@recommendations_bp.route("/recommendations", methods=["GET"])
@jwt_required()
def recommendations():
    user_id = get_jwt_identity()

    user = fetch_user(user_id)
    if not user:
        return jsonify({"error": "user not found"}), 404

    user_itineraries = fetch_user_itineraries(user_id)

    destinations = load_json("destinations.json")["destinations"]

    favorite_ids = set(user.get("favorites", []))
    favorite_destinations = [d for d in destinations if d["id"] in favorite_ids]

    limit = request.args.get("limit", default=5, type=int)
    results = get_recommendations(
        user, destinations, user_itineraries, favorite_destinations=favorite_destinations, limit=limit
    )

    return jsonify({"user_id": user_id, "recommendations": results}), 200