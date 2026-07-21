import uuid
from datetime import datetime, timezone

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from services.storage import load_json, save_json

itineraries_bp = Blueprint("itineraries", __name__)


@itineraries_bp.route("/itineraries", methods=["POST"])
@jwt_required()
def create_itinerary():
    user_id = get_jwt_identity()
    body = request.get_json(silent=True) or {}

    title = body.get("title")
    destination_ids = body.get("destinations", [])

    if not title or not destination_ids:
        return jsonify({"error": "title and destinations are required"}), 400

    all_destinations = load_json("destinations.json")["destinations"]
    matched = [d for d in all_destinations if d["id"] in destination_ids]

    if len(matched) != len(destination_ids):
        return jsonify({"error": "one or more destination ids are invalid"}), 400

    tags = sorted({tag for d in matched for tag in d["tags"]})
    now = datetime.now(timezone.utc).isoformat()

    itinerary = {
        "id": f"itin_{uuid.uuid4().hex[:8]}",
        "user_id": user_id,
        "title": title,
        "destinations": destination_ids,
        "destination_times": body.get("destination_times", {}),
        "tags": tags,
        "start_date": body.get("start_date"),
        "end_date": body.get("end_date"),
        "shared_with": body.get("shared_with", []),
        "created_at": now,
        "updated_at": now,
    }

    data = load_json("itineraries.json")
    data["itineraries"].append(itinerary)
    save_json("itineraries.json", data)

    return jsonify({"itinerary": itinerary}), 201


@itineraries_bp.route("/itineraries", methods=["GET"])
@jwt_required()
def get_itineraries():
    user_id = get_jwt_identity()
    data = load_json("itineraries.json")
    user_itineraries = [i for i in data["itineraries"] if i["user_id"] == user_id]
    return jsonify({"itineraries": user_itineraries}), 200


@itineraries_bp.route("/itineraries/<itinerary_id>/destinations", methods=["PUT"])
@jwt_required()
def add_destination(itinerary_id):
    user_id = get_jwt_identity()
    body = request.get_json(silent=True) or {}
    destination_id = body.get("destination_id")
    visit_time = body.get("time")

    if not destination_id:
        return jsonify({"error": "destination_id is required"}), 400

    all_destinations = load_json("destinations.json")["destinations"]
    destination = next((d for d in all_destinations if d["id"] == destination_id), None)
    if not destination:
        return jsonify({"error": "destination not found"}), 404

    data = load_json("itineraries.json")
    itinerary = next(
        (i for i in data["itineraries"] if i["id"] == itinerary_id and i["user_id"] == user_id),
        None,
    )
    if not itinerary:
        return jsonify({"error": "itinerary not found"}), 404

    if destination_id not in itinerary["destinations"]:
        itinerary["destinations"].append(destination_id)
        itinerary["tags"] = sorted(set(itinerary.get("tags", [])) | set(destination["tags"]))

    if visit_time:
        itinerary.setdefault("destination_times", {})[destination_id] = visit_time

    itinerary["updated_at"] = datetime.now(timezone.utc).isoformat()
    save_json("itineraries.json", data)

    return jsonify({"itinerary": itinerary}), 200