import uuid
from datetime import datetime, timezone

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from services.storage import load_json, save_json

friends_bp = Blueprint("friends", __name__)

FILE = "friends.json"


def _now():
    return datetime.now(timezone.utc).isoformat()


def _users():
    return {u["id"]: u for u in load_json("users.json")["users"]}


def _card(user, since=None):
    return {
        "id": user["id"],
        "name": user.get("name") or "Traveler",
        "email": user.get("email"),
        "number": user.get("number"),
        "since": since,
    }


def _find_user(email, number):
    users = load_json("users.json")["users"]
    return next(
        (
            u
            for u in users
            if (email and (u.get("email") or "").lower() == email)
            or (number and u.get("number") == number)
        ),
        None,
    )


@friends_bp.route("/friends", methods=["GET"])
@jwt_required()
def list_friends():
    user_id = get_jwt_identity()
    links = load_json(FILE)["links"]
    users = _users()

    friends = []
    for link in links:
        if link["status"] != "accepted":
            continue
        if link["from_user_id"] == user_id:
            other = users.get(link["to_user_id"])
        elif link["to_user_id"] == user_id:
            other = users.get(link["from_user_id"])
        else:
            continue
        if other:
            friends.append(_card(other, link.get("responded_at")))

    friends.sort(key=lambda f: (f["name"] or "").lower())
    return jsonify({"friends": friends}), 200


@friends_bp.route("/friends/requests", methods=["GET"])
@jwt_required()
def list_requests():
    user_id = get_jwt_identity()
    links = load_json(FILE)["links"]
    users = _users()

    incoming = []
    outgoing = []

    for link in links:
        if link["status"] != "pending":
            continue

        if link["to_user_id"] == user_id:
            sender = users.get(link["from_user_id"])
            if sender:
                incoming.append({"id": link["id"], "user": _card(sender), "created_at": link["created_at"]})
        elif link["from_user_id"] == user_id:
            target = users.get(link["to_user_id"])
            if target:
                outgoing.append({"id": link["id"], "user": _card(target), "created_at": link["created_at"]})

    return jsonify({"incoming": incoming, "outgoing": outgoing}), 200


@friends_bp.route("/friends", methods=["POST"])
@jwt_required()
def send_request():
    user_id = get_jwt_identity()
    body = request.get_json(silent=True) or {}

    email = (body.get("email") or "").strip().lower()
    number = (body.get("number") or "").strip()

    if not email and not number:
        return jsonify({"error": "an email or phone number is required"}), 400

    target = _find_user(email, number)
    if not target:
        return jsonify({"error": "no traveller found with that contact"}), 404

    if target["id"] == user_id:
        return jsonify({"error": "you cannot add yourself"}), 400

    data = load_json(FILE)
    pair = {user_id, target["id"]}

    existing = next(
        (
            link
            for link in data["links"]
            if {link["from_user_id"], link["to_user_id"]} == pair
            and link["status"] in ("pending", "accepted")
        ),
        None,
    )

    if existing:
        if existing["status"] == "accepted":
            return jsonify({"error": "this traveller is already your friend"}), 409
        if existing["from_user_id"] == user_id:
            return jsonify({"error": "a request is already pending"}), 409

        existing["status"] = "accepted"
        existing["responded_at"] = _now()
        save_json(FILE, data)
        return jsonify({"friend": _card(target, existing["responded_at"]), "accepted": True}), 200

    link = {
        "id": f"frq_{uuid.uuid4().hex[:12]}",
        "from_user_id": user_id,
        "to_user_id": target["id"],
        "status": "pending",
        "created_at": _now(),
        "responded_at": None,
    }
    data["links"].append(link)
    save_json(FILE, data)

    return jsonify({"request": {"id": link["id"], "user": _card(target), "created_at": link["created_at"]}}), 201


def _respond(request_id, accept):
    user_id = get_jwt_identity()
    data = load_json(FILE)

    link = next((l for l in data["links"] if l["id"] == request_id), None)
    if not link or link["status"] != "pending":
        return None, (jsonify({"error": "request not found"}), 404)

    if link["to_user_id"] != user_id:
        return None, (jsonify({"error": "this request is not yours to answer"}), 403)

    link["status"] = "accepted" if accept else "declined"
    link["responded_at"] = _now()
    save_json(FILE, data)

    return link, None


@friends_bp.route("/friends/requests/<request_id>/accept", methods=["POST"])
@jwt_required()
def accept_request(request_id):
    link, error = _respond(request_id, True)
    if error:
        return error

    sender = _users().get(link["from_user_id"])
    if not sender:
        return jsonify({"error": "request not found"}), 404

    return jsonify({"friend": _card(sender, link["responded_at"])}), 200


@friends_bp.route("/friends/requests/<request_id>/decline", methods=["POST"])
@jwt_required()
def decline_request(request_id):
    _, error = _respond(request_id, False)
    if error:
        return error
    return jsonify({"declined": request_id}), 200


@friends_bp.route("/friends/<friend_id>", methods=["DELETE"])
@jwt_required()
def remove_friend(friend_id):
    user_id = get_jwt_identity()
    pair = {user_id, friend_id}

    data = load_json(FILE)
    before = len(data["links"])
    data["links"] = [
        link
        for link in data["links"]
        if not ({link["from_user_id"], link["to_user_id"]} == pair and link["status"] == "accepted")
    ]

    if len(data["links"]) == before:
        return jsonify({"error": "friend not found"}), 404

    save_json(FILE, data)
    return jsonify({"removed": friend_id}), 200