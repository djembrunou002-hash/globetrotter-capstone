from flask import Blueprint, jsonify, request

from services.service_client import internal_only
from services.storage import load_json

internal_bp = Blueprint("internal", __name__, url_prefix="/internal")


@internal_bp.route("/destinations/batch", methods=["POST"])
@internal_only
def batch_destinations():
    ids = (request.get_json(silent=True) or {}).get("ids") or []
    wanted = set(ids)

    destinations = load_json("destinations.json")["destinations"]
    return jsonify({"destinations": [d for d in destinations if d["id"] in wanted]}), 200


@internal_bp.route("/destinations/<destination_id>", methods=["GET"])
@internal_only
def get_destination(destination_id):
    destinations = load_json("destinations.json")["destinations"]
    destination = next((d for d in destinations if d["id"] == destination_id), None)
    if not destination:
        return jsonify({"error": "destination not found"}), 404

    return jsonify({"destination": destination}), 200