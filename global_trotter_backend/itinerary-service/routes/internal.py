from flask import Blueprint, jsonify, request

from services.service_client import internal_only
from services.storage import load_json

internal_bp = Blueprint("internal", __name__, url_prefix="/internal")


@internal_bp.route("/itineraries", methods=["GET"])
@internal_only
def list_user_itineraries():
    user_id = request.args.get("user_id")
    if not user_id:
        return jsonify({"error": "user_id is required"}), 400

    itineraries = load_json("itineraries.json")["itineraries"]
    owned = [i for i in itineraries if i["user_id"] == user_id]

    return jsonify({"itineraries": owned}), 200