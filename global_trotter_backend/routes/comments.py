import uuid
from datetime import datetime, timedelta, timezone

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required, verify_jwt_in_request

from services.storage import load_json, save_json

comments_bp = Blueprint("comments", __name__)

EDIT_WINDOW = timedelta(minutes=15)


def _get_destination(destination_id):
    destinations = load_json("destinations.json")["destinations"]
    return next((d for d in destinations if d["id"] == destination_id), None)


def _author(user_id):
    users = load_json("users.json")["users"]
    user = next((u for u in users if u["id"] == user_id), None)
    return {"id": user_id, "name": user["name"] if user else "Traveler"}


def _find_node(data, destination_id, comment_id):
    return next(
        (c for c in data["comments"] if c["id"] == comment_id and c["destination_id"] == destination_id),
        None,
    )


def _count_descendants(node_id, children_by_parent):
    children = children_by_parent.get(node_id, [])
    total = len(children)
    for child in children:
        total += _count_descendants(child["id"], children_by_parent)
    return total


def _serialize_node(node, children_by_parent, current_user_id=None):
    children = sorted(children_by_parent.get(node["id"], []), key=lambda c: c["created_at"])
    likes = node.get("likes", [])
    dislikes = node.get("dislikes", [])
    return {
        "id": node["id"],
        "destination_id": node["destination_id"],
        "author": _author(node["user_id"]),
        "text": "[deleted]" if node["deleted"] else node["text"],
        "created_at": node["created_at"],
        "updated_at": node.get("updated_at"),
        "edited": bool(node.get("updated_at")) and not node["deleted"],
        "deleted": node["deleted"],
        "pinned": bool(node.get("pinned_at")),
        "like_count": len(likes),
        "liked_by_me": bool(current_user_id) and current_user_id in likes,
        "dislike_count": len(dislikes),
        "disliked_by_me": bool(current_user_id) and current_user_id in dislikes,
        "reply_count": _count_descendants(node["id"], children_by_parent),
        "replies": [_serialize_node(child, children_by_parent, current_user_id) for child in children],
    }


def _serialize_flat(node, current_user_id=None):
    likes = node.get("likes", [])
    dislikes = node.get("dislikes", [])
    return {
        "id": node["id"],
        "destination_id": node["destination_id"],
        "author": _author(node["user_id"]),
        "text": "[deleted]" if node["deleted"] else node["text"],
        "created_at": node["created_at"],
        "updated_at": node.get("updated_at"),
        "edited": bool(node.get("updated_at")) and not node["deleted"],
        "deleted": node["deleted"],
        "pinned": bool(node.get("pinned_at")),
        "like_count": len(likes),
        "liked_by_me": bool(current_user_id) and current_user_id in likes,
        "dislike_count": len(dislikes),
        "disliked_by_me": bool(current_user_id) and current_user_id in dislikes,
    }


@comments_bp.route("/destinations/<destination_id>/comments", methods=["GET"])
def get_comments(destination_id):
    if not _get_destination(destination_id):
        return jsonify({"error": "destination not found"}), 404

    verify_jwt_in_request(optional=True)
    current_user_id = get_jwt_identity()

    data = load_json("comments.json")
    all_nodes = [c for c in data["comments"] if c["destination_id"] == destination_id]

    children_by_parent = {}
    for node in all_nodes:
        children_by_parent.setdefault(node["parent_id"], []).append(node)

    roots = children_by_parent.get(None, [])
    roots = sorted(roots, key=lambda c: c["created_at"], reverse=True)
    roots = sorted(roots, key=lambda c: bool(c.get("pinned_at")), reverse=True)

    return jsonify({
        "comments": [_serialize_node(root, children_by_parent, current_user_id) for root in roots]
    }), 200


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
        "parent_id": None,
        "user_id": user_id,
        "text": text,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": None,
        "deleted": False,
        "pinned_at": None,
        "likes": [],
        "dislikes": [],
    }

    data = load_json("comments.json")
    data["comments"].append(comment)
    save_json("comments.json", data)

    return jsonify({"comment": _serialize_node(comment, {}, user_id)}), 201


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
    parent = _find_node(data, destination_id, comment_id)
    if not parent or parent["deleted"]:
        return jsonify({"error": "comment not found"}), 404

    user_id = get_jwt_identity()

    reply = {
        "id": f"cmt_{uuid.uuid4().hex[:8]}",
        "destination_id": destination_id,
        "parent_id": comment_id,
        "user_id": user_id,
        "text": text,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": None,
        "deleted": False,
        "pinned_at": None,
        "likes": [],
        "dislikes": [],
    }

    data["comments"].append(reply)
    save_json("comments.json", data)

    return jsonify({"reply": _serialize_flat(reply, user_id)}), 201


@comments_bp.route("/destinations/<destination_id>/comments/<comment_id>", methods=["PATCH"])
@jwt_required()
def edit_comment(destination_id, comment_id):
    if not _get_destination(destination_id):
        return jsonify({"error": "destination not found"}), 404

    body = request.get_json(silent=True) or {}
    text = (body.get("text") or "").strip()
    if not text:
        return jsonify({"error": "text is required"}), 400

    data = load_json("comments.json")
    node = _find_node(data, destination_id, comment_id)
    if not node:
        return jsonify({"error": "comment not found"}), 404

    if node["deleted"]:
        return jsonify({"error": "cannot edit a deleted comment"}), 400

    user_id = get_jwt_identity()
    if node["user_id"] != user_id:
        return jsonify({"error": "you can only edit your own comment"}), 403

    created_at = datetime.fromisoformat(node["created_at"])
    if datetime.now(timezone.utc) - created_at > EDIT_WINDOW:
        return jsonify({"error": "edit window has expired"}), 403

    node["text"] = text
    node["updated_at"] = datetime.now(timezone.utc).isoformat()
    save_json("comments.json", data)

    return jsonify({"comment": _serialize_flat(node, user_id)}), 200


@comments_bp.route("/destinations/<destination_id>/comments/<comment_id>/like", methods=["POST"])
@jwt_required()
def like_comment(destination_id, comment_id):
    if not _get_destination(destination_id):
        return jsonify({"error": "destination not found"}), 404

    data = load_json("comments.json")
    node = _find_node(data, destination_id, comment_id)
    if not node or node["deleted"]:
        return jsonify({"error": "comment not found"}), 404

    user_id = get_jwt_identity()
    likes = node.setdefault("likes", [])
    dislikes = node.setdefault("dislikes", [])
    if user_id in dislikes:
        dislikes.remove(user_id)
    if user_id not in likes:
        likes.append(user_id)
    save_json("comments.json", data)

    return jsonify({
        "comment_id": comment_id,
        "like_count": len(likes),
        "liked_by_me": True,
        "dislike_count": len(dislikes),
        "disliked_by_me": False,
    }), 200


@comments_bp.route("/destinations/<destination_id>/comments/<comment_id>/like", methods=["DELETE"])
@jwt_required()
def unlike_comment(destination_id, comment_id):
    if not _get_destination(destination_id):
        return jsonify({"error": "destination not found"}), 404

    data = load_json("comments.json")
    node = _find_node(data, destination_id, comment_id)
    if not node:
        return jsonify({"error": "comment not found"}), 404

    user_id = get_jwt_identity()
    likes = node.setdefault("likes", [])
    dislikes = node.setdefault("dislikes", [])
    if user_id in likes:
        likes.remove(user_id)
        save_json("comments.json", data)

    return jsonify({
        "comment_id": comment_id,
        "like_count": len(likes),
        "liked_by_me": False,
        "dislike_count": len(dislikes),
        "disliked_by_me": user_id in dislikes,
    }), 200


@comments_bp.route("/destinations/<destination_id>/comments/<comment_id>/dislike", methods=["POST"])
@jwt_required()
def dislike_comment(destination_id, comment_id):
    if not _get_destination(destination_id):
        return jsonify({"error": "destination not found"}), 404

    data = load_json("comments.json")
    node = _find_node(data, destination_id, comment_id)
    if not node or node["deleted"]:
        return jsonify({"error": "comment not found"}), 404

    user_id = get_jwt_identity()
    likes = node.setdefault("likes", [])
    dislikes = node.setdefault("dislikes", [])
    if user_id in likes:
        likes.remove(user_id)
    if user_id not in dislikes:
        dislikes.append(user_id)
    save_json("comments.json", data)

    return jsonify({
        "comment_id": comment_id,
        "like_count": len(likes),
        "liked_by_me": False,
        "dislike_count": len(dislikes),
        "disliked_by_me": True,
    }), 200


@comments_bp.route("/destinations/<destination_id>/comments/<comment_id>/dislike", methods=["DELETE"])
@jwt_required()
def undislike_comment(destination_id, comment_id):
    if not _get_destination(destination_id):
        return jsonify({"error": "destination not found"}), 404

    data = load_json("comments.json")
    node = _find_node(data, destination_id, comment_id)
    if not node:
        return jsonify({"error": "comment not found"}), 404

    user_id = get_jwt_identity()
    likes = node.setdefault("likes", [])
    dislikes = node.setdefault("dislikes", [])
    if user_id in dislikes:
        dislikes.remove(user_id)
        save_json("comments.json", data)

    return jsonify({
        "comment_id": comment_id,
        "like_count": len(likes),
        "liked_by_me": user_id in likes,
        "dislike_count": len(dislikes),
        "disliked_by_me": False,
    }), 200


@comments_bp.route("/destinations/<destination_id>/comments/<comment_id>/pin", methods=["POST"])
@jwt_required()
def pin_comment(destination_id, comment_id):
    destination = _get_destination(destination_id)
    if not destination:
        return jsonify({"error": "destination not found"}), 404

    user_id = get_jwt_identity()
    if destination.get("owner_id") != user_id:
        return jsonify({"error": "only the destination owner can pin comments"}), 403

    data = load_json("comments.json")
    node = _find_node(data, destination_id, comment_id)
    if not node or node["deleted"]:
        return jsonify({"error": "comment not found"}), 404

    if node["parent_id"] is not None:
        return jsonify({"error": "only top-level comments can be pinned"}), 400

    now = datetime.now(timezone.utc).isoformat()
    for other in data["comments"]:
        if other["destination_id"] == destination_id and other["parent_id"] is None:
            other["pinned_at"] = now if other["id"] == comment_id else None

    save_json("comments.json", data)

    return jsonify({"comment_id": comment_id, "pinned": True}), 200


@comments_bp.route("/destinations/<destination_id>/comments/<comment_id>/pin", methods=["DELETE"])
@jwt_required()
def unpin_comment(destination_id, comment_id):
    destination = _get_destination(destination_id)
    if not destination:
        return jsonify({"error": "destination not found"}), 404

    user_id = get_jwt_identity()
    if destination.get("owner_id") != user_id:
        return jsonify({"error": "only the destination owner can unpin comments"}), 403

    data = load_json("comments.json")
    node = _find_node(data, destination_id, comment_id)
    if not node:
        return jsonify({"error": "comment not found"}), 404

    node["pinned_at"] = None
    save_json("comments.json", data)

    return jsonify({"comment_id": comment_id, "pinned": False}), 200


@comments_bp.route("/destinations/<destination_id>/comments/<comment_id>", methods=["DELETE"])
@jwt_required()
def delete_comment(destination_id, comment_id):
    if not _get_destination(destination_id):
        return jsonify({"error": "destination not found"}), 404

    data = load_json("comments.json")
    node = _find_node(data, destination_id, comment_id)
    if not node:
        return jsonify({"error": "comment not found"}), 404

    user_id = get_jwt_identity()
    if node["user_id"] != user_id:
        return jsonify({"error": "you can only delete your own comment"}), 403

    for other in data["comments"]:
        if other["parent_id"] == comment_id:
            other["parent_id"] = node["parent_id"]

    data["comments"] = [c for c in data["comments"] if c["id"] != comment_id]
    save_json("comments.json", data)

    return jsonify({"deleted_id": comment_id}), 200