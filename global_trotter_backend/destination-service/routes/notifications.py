from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required

from services.auth_helpers import get_current_user, is_admin
from services.destination_requests import load_requests

notifications_bp = Blueprint("notifications", __name__)


def _name_of(req):
    payload = req.get("payload") or {}
    return payload.get("name") or ""


def _admin_items(requests):
    items = []
    for req in requests:
        if req.get("status") != "pending":
            continue
        items.append(
            {
                "key": f"{req['id']}:pending",
                "scope": "admin",
                "request_id": req["id"],
                "destination_id": req.get("destination_id"),
                "type": req.get("type"),
                "status": "pending",
                "admin_action": False,
                "name": _name_of(req),
                "at": req.get("created_at"),
            }
        )
    return items


def _owner_items(requests, user_id):
    items = []
    for req in requests:
        if req.get("submitted_by") != user_id:
            continue

        status = req.get("status")
        if status == "pending":
            continue

        reviewed_at = req.get("reviewed_at") or ""
        items.append(
            {
                "key": f"{req['id']}:{status}:{reviewed_at}",
                "scope": "owner",
                "request_id": req["id"],
                "destination_id": req.get("destination_id"),
                "type": req.get("type"),
                "status": status,
                "admin_action": bool(req.get("admin_action")),
                "name": _name_of(req),
                "at": reviewed_at or req.get("created_at"),
            }
        )
    return items


@notifications_bp.route("/notifications", methods=["GET"])
@jwt_required()
def list_notifications():
    user = get_current_user()
    if not user:
        return jsonify({"error": "user not found"}), 404

    requests = load_requests()
    items = _admin_items(requests) if is_admin(user) else _owner_items(requests, user["id"])
    items.sort(key=lambda item: item.get("at") or "", reverse=True)

    return jsonify({"notifications": items}), 200