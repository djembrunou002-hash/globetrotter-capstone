import uuid
from datetime import datetime, timezone

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from services.storage import load_json, save_json

comments_bp = Blueprint("comments", __name__)


def _get_destination(destination_id):
    destinations = load_json("destinations.json")["destinations"]
    return next((d for d in destinations if d["id"] == destination_id), None)


def _author(user_id):
    users = load_json("users.json")["users"]
    user = next((u for u in users if u["id"] == user_id), None)
    return {"id": user_id, "name": user["name"] if user else "Traveler"}


def _serialize_reply(reply):
    return {
        "id": reply["id"],
        "author": _author(reply["user_id"]),
        "text": reply["text"],
        "created_at": reply["created_at"],
    }


def _serialize_comment(comment):
    return {
        "id": comment["id"],
        "destination_id": comment["destination_id"],
        "author": _author(comment["user_id"]),
        "text": comment["text"],
        "created_at": comment["created_at"],
        "replies": [_serialize_reply(r) for r in comment.get("replies", [])],
    }


@comments_bp.route("/destinations/<destination_id>/comments", methods=["GET"])
def get_comments(destination_id):
    if not _get_destination(destination_id):
        return jsonify({"error": "destination not found"}), 404

    data = load_json("comments.json")
    comments = [c for c in data["comments"] if c["destination_id"] == destination_id]
    comments.sort(key=lambda c: c["created_at"])

    return jsonify({"comments": [_serialize_comment(c) for c in comments]}), 200


@comments_bp.route("/destinations/<destination_id>/comments", methods=["POST"])
@jwt_required()
def add_comment(destination_id):
    if not _get_destination(destination_id):
        return jsonify({"error": "destination not found"}), 404

    body = request.get_json(silent=True) or {}
    text = (body.get("text") or "").strip()
    if not text:
        return jsonify({"error": "text is required"}), 400

    user_id = get_jwt_identity()

    comment = {
        "id": f"cmt_{uuid.uuid4().hex[:8]}",
        "destination_id": destination_id,
        "user_id": user_id,
        "text": text,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "replies": [],
    }

    data = load_json("comments.json")
    data["comments"].append(comment)
    save_json("comments.json", data)

    return jsonify({"comment": _serialize_comment(comment)}), 201


@comments_bp.route("/destinations/<destination_id>/comments/<comment_id>/replies", methods=["POST"])
@jwt_required()
def add_reply(destination_id, comment_id):
    if not _get_destination(destination_id):
        return jsonify({"error": "destination not found"}), 404

    body = request.get_json(silent=True) or {}
    text = (body.get("text") or "").strip()
    if not text:
        return jsonify({"error": "text is required"}), 400

    data = load_json("comments.json")
    comment = next(
        (c for c in data["comments"] if c["id"] == comment_id and c["destination_id"] == destination_id),
        None,
    )
    if not comment:
        return jsonify({"error": "comment not found"}), 404

    user_id = get_jwt_identity()

    reply = {
        "id": f"rpl_{uuid.uuid4().hex[:8]}",
        "user_id": user_id,
        "text": text,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    comment.setdefault("replies", []).append(reply)
    save_json("comments.json", data)

    return jsonify({"reply": _serialize_reply(reply)}), 201