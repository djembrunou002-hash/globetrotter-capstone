from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from services.auth_helpers import get_current_user, is_admin
from services.destination_requests import (
    approve_request,
    delete_request,
    find_request,
    load_requests,
    reject_request,
    set_admin_note,
)
from services.storage import load_json

admin_bp = Blueprint("admin", __name__)


def _require_admin():
    user = get_current_user()
    if not is_admin(user):
        return None, (jsonify({"error": "admin access required"}), 403)
    return user, None


def _with_absolute_images(images):
    base = request.host_url.rstrip("/")
    return [
        img if img.startswith("http://") or img.startswith("https://") else f"{base}{img}"
        for img in images or []
    ]


def _serialize_request(req):
    users = load_json("users.json")["users"]
    submitter = next((u for u in users if u["id"] == req["submitted_by"]), None)

    display = None
    if req["type"] == "create":
        display = dict(req["payload"])
    else:
        destinations = load_json("destinations.json")["destinations"]
        destination = next((d for d in destinations if d["id"] == req["destination_id"]), None)
        if destination:
            display = dict(req["payload"]) if req["payload"] else dict(destination)
            display["current"] = destination

    if display is not None and display.get("images"):
        display["images"] = _with_absolute_images(display["images"])

    return {
        **req,
        "submitted_by_name": submitter["name"] if submitter else "Unknown user",
        "display": display,
    }


@admin_bp.route("/admin/requests", methods=["GET"])
@jwt_required()
def list_requests():
    _, error = _require_admin()
    if error:
        return error

    status_filter = request.args.get("status")
    requests = load_requests()

    if status_filter:
        requests = [r for r in requests if r["status"] == status_filter]
    else:
        requests = [r for r in requests if r["status"] in ("pending", "rejected")]

    requests.sort(key=lambda r: r["created_at"], reverse=True)

    return jsonify({"requests": [_serialize_request(r) for r in requests]}), 200


@admin_bp.route("/admin/requests/<request_id>/approve", methods=["POST"])
@jwt_required()
def approve(request_id):
    _, error = _require_admin()
    if error:
        return error

    req, _ = find_request(request_id)
    if not req:
        return jsonify({"error": "request not found"}), 404
    if req["status"] != "pending":
        return jsonify({"error": "only pending requests can be approved"}), 409

    updated = approve_request(req)
    return jsonify({"request": updated}), 200


@admin_bp.route("/admin/requests/<request_id>/reject", methods=["POST"])
@jwt_required()
def reject(request_id):
    _, error = _require_admin()
    if error:
        return error

    req, _ = find_request(request_id)
    if not req:
        return jsonify({"error": "request not found"}), 404
    if req["status"] != "pending":
        return jsonify({"error": "only pending requests can be rejected"}), 409

    note = (request.get_json(silent=True) or {}).get("note", "")
    note = note.strip() if isinstance(note, str) else ""
    if not note:
        return jsonify({"error": "a note explaining the rejection is required"}), 400

    updated = reject_request(req, note)
    return jsonify({"request": updated}), 200


@admin_bp.route("/admin/requests/<request_id>/note", methods=["PATCH"])
@jwt_required()
def update_request_note(request_id):
    _, error = _require_admin()
    if error:
        return error

    req, _ = find_request(request_id)
    if not req:
        return jsonify({"error": "request not found"}), 404
    if req["status"] != "pending":
        return jsonify({"error": "only pending requests can be annotated"}), 409

    note = (request.get_json(silent=True) or {}).get("note", "")
    note = note.strip() if isinstance(note, str) else ""

    updated = set_admin_note(req, note)
    return jsonify({"request": updated}), 200


@admin_bp.route("/admin/requests/<request_id>", methods=["DELETE"])
@jwt_required()
def remove_request(request_id):
    _, error = _require_admin()
    if error:
        return error

    req, _ = find_request(request_id)
    if not req:
        return jsonify({"error": "request not found"}), 404
    if req["status"] != "rejected":
        return jsonify({"error": "only rejected requests can be removed"}), 409

    delete_request(request_id)
    return jsonify({"deleted": request_id}), 200