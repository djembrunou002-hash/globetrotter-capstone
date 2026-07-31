from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from services.auth_helpers import get_current_user
from services.destination_requests import delete_request, find_request, load_requests
from services.storage import load_json

my_destinations_bp = Blueprint("my_destinations", __name__)


def _with_absolute_images(destination):
    base = request.host_url.rstrip("/")
    images = destination.get("images", [])
    return [
        img if img.startswith("http://") or img.startswith("https://") else f"{base}{img}"
        for img in images
    ]


@my_destinations_bp.route("/my-destinations", methods=["GET"])
@jwt_required()
def list_my_destinations():
    user = get_current_user()
    if not user:
        return jsonify({"error": "user not found"}), 404

    destinations = load_json("destinations.json")["destinations"]
    requests = load_requests()
    my_requests = [r for r in requests if r["submitted_by"] == user["id"]]

    cards = []
    published_ids = set()

    for destination in destinations:
        if destination.get("owner_id") != user["id"]:
            continue
        published_ids.add(destination["id"])

        status = "published"
        relevant = None

        pending = next(
            (
                r
                for r in my_requests
                if r["destination_id"] == destination["id"] and r["type"] in ("edit", "delete") and r["status"] == "pending"
            ),
            None,
        )
        if pending:
            relevant = pending
            status = "pending_edit" if pending["type"] == "edit" else "pending_delete"
        else:
            rejected = [
                r
                for r in my_requests
                if r["destination_id"] == destination["id"] and r["type"] in ("edit", "delete") and r["status"] == "rejected"
            ]
            if rejected:
                relevant = max(rejected, key=lambda r: r["created_at"])
                status = "rejected"
            else:
                admin_edit = next(
                    (
                        r
                        for r in my_requests
                        if r["destination_id"] == destination["id"]
                        and r["type"] == "edit"
                        and r["status"] == "approved"
                        and r.get("admin_action")
                    ),
                    None,
                )
                if admin_edit:
                    relevant = admin_edit
                    status = "edited"

        cards.append(
            {
                **destination,
                "images": _with_absolute_images(destination),
                "status": status,
                "request_id": relevant["id"] if relevant else None,
            }
        )

    for req in my_requests:
        if req["type"] == "create":
            if req["status"] == "approved":
                continue
            card = dict(req["payload"])
            card["id"] = req["id"]
            card["images"] = _with_absolute_images(card)
            card["status"] = "pending_review" if req["status"] == "pending" else "rejected"
            card["request_id"] = req["id"]
            cards.append(card)

        elif req["type"] == "delete" and req["status"] == "approved" and req["destination_id"] not in published_ids:
            card = dict(req["payload"] or {})
            card["id"] = req["destination_id"]
            card["images"] = _with_absolute_images(card)
            card["status"] = "deleted"
            card["request_id"] = req["id"]
            cards.append(card)

    cards.sort(key=lambda c: c.get("id", ""), reverse=True)

    return jsonify({"destinations": cards}), 200


@my_destinations_bp.route("/my-destinations/requests/<request_id>", methods=["DELETE"])
@jwt_required()
def discard_request(request_id):
    user = get_current_user()
    if not user:
        return jsonify({"error": "user not found"}), 404

    req, _ = find_request(request_id)
    if not req or req["submitted_by"] != user["id"]:
        return jsonify({"error": "request not found"}), 404

    can_discard = (
        req["status"] == "rejected"
        or (req["type"] == "delete" and req["status"] == "approved")
        or (req["type"] == "edit" and req["status"] == "approved" and req.get("admin_action"))
    )
    if not can_discard:
        return jsonify({"error": "this submission can't be discarded yet"}), 409

    delete_request(request_id)
    return jsonify({"deleted": request_id}), 200