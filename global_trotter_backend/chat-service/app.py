import eventlet

eventlet.monkey_patch()

import os

from flask import Flask, jsonify, request as flask_request, send_from_directory
from flask_jwt_extended import JWTManager, decode_token
from flask_socketio import SocketIO, emit, join_room, leave_room

from config import Config
from services import calls as call_store
from services import groups as group_store
from services import messages as message_store
from services import presence as presence_store
from services import rooms as room_utils
from services.service_client import ServiceUnavailable

INLINE_MIME = {
    "image/jpeg", "image/png", "image/webp", "image/gif",
    "video/mp4", "video/webm", "video/quicktime",
}

AUDIO_TYPES = {
    ".weba": "audio/webm",
    ".webm": "audio/webm",
    ".oga": "audio/ogg",
    ".ogg": "audio/ogg",
    ".m4a": "audio/mp4",
    ".mp3": "audio/mpeg",
    ".aac": "audio/aac",
}

socketio = SocketIO(
    cors_allowed_origins=[o.strip() for o in Config.ALLOWED_ORIGINS.split(",") if o.strip()],
    async_mode="eventlet",
    path="/socket.io",
)

_sessions = {}


def _user_room(user_id):
    return f"user_{user_id}"


def _targets(room):
    if room == room_utils.GENERAL:
        return [room_utils.GENERAL]

    if room_utils.is_group(room):
        group = group_store.get(room)
        return [_user_room(uid) for uid in (group["members"] if group else [])]

    return [_user_room(uid) for uid in room_utils.participants(room)]


def _broadcast(event, payload, room):
    for target in _targets(room):
        socketio.emit(event, payload, to=target)


def _notify_members(group_id, member_ids):
    for member_id in set(member_ids):
        socketio.emit("chat:groups", {"room": group_id}, to=_user_room(member_id))


def _room_members(room):
    if room == room_utils.GENERAL:
        return []

    if room_utils.is_group(room):
        group = group_store.get(room)
        return list(group["members"]) if group else []

    return room_utils.participants(room)


def _rooms_for(user_id):
    rooms = {room_utils.GENERAL}
    rooms.update(group_store.room_ids_for_user(user_id))
    rooms.update(message_store.direct_rooms_for(user_id))
    return rooms


def _call_targets(room):
    members = _room_members(room)
    if members:
        return members
    return presence_store.online_ids()


def _push_call(room, call):
    payload = {"room": room, "call": call_store.public(call)}
    for member_id in _call_targets(room):
        socketio.emit("call:state", payload, to=_user_room(member_id))


def _announce_presence(user_id, online):
    socketio.emit(
        "chat:presence",
        {
            "user_id": user_id,
            "online": online,
            "last_seen": None if online else presence_store.last_seen(user_id),
        },
    )


def _group_error(err):
    if isinstance(err, LookupError):
        return jsonify({"error": str(err)}), 404
    if isinstance(err, PermissionError):
        return jsonify({"error": str(err)}), 403
    return jsonify({"error": str(err)}), 400


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    JWTManager(app)

    @app.errorhandler(ServiceUnavailable)
    def handle_service_unavailable(err):
        app.logger.error("dependency unavailable: %s", err)
        return jsonify({"error": "a dependent service is unavailable, please try again"}), 503

    @app.route("/voice/<path:filename>", methods=["GET"])
    def voice_file(filename):
        os.makedirs(Config.VOICE_DIR, exist_ok=True)
        response = send_from_directory(Config.VOICE_DIR, filename, max_age=31536000)
        for suffix, mime in AUDIO_TYPES.items():
            if filename.endswith(suffix):
                response.headers["Content-Type"] = mime
                break
        return response

    @app.route("/media/<path:filename>", methods=["GET"])
    def media_file(filename):
        os.makedirs(Config.MEDIA_DIR, exist_ok=True)
        response = send_from_directory(Config.MEDIA_DIR, filename, max_age=31536000)
        mime = (response.headers.get("Content-Type") or "").split(";")[0].strip()
        if mime not in INLINE_MIME:
            response.headers["Content-Disposition"] = f"attachment; filename={filename}"
            response.headers["Content-Type"] = "application/octet-stream"
        response.headers["X-Content-Type-Options"] = "nosniff"
        return response

    @app.route("/chat/presence", methods=["GET"])
    def read_presence():
        user_id = _identity_from_header()
        if not user_id:
            return jsonify({"error": "authentication required"}), 401

        raw = flask_request.args.get("ids") or ""
        ids = [item.strip() for item in raw.split(",") if item.strip()]
        return jsonify({"presence": presence_store.snapshot(ids)}), 200

    @app.route("/chat/conversations", methods=["GET"])
    def list_conversations():
        user_id = _identity_from_header()
        if not user_id:
            return jsonify({"error": "authentication required"}), 401

        summaries = [
            group_store.summary(group, user_id) for group in group_store.list_for_user(user_id)
        ]
        return jsonify({"conversations": message_store.conversations(user_id, summaries)}), 200

    @app.route("/chat/conversations/<room>", methods=["DELETE"])
    def clear_conversation(room):
        user_id = _identity_from_header()
        if not user_id:
            return jsonify({"error": "authentication required"}), 401

        room = room_utils.normalize(room)

        if room_utils.is_group(room):
            group = group_store.get(room)
            if not group_store.is_admin(group, user_id):
                return jsonify({"error": "only admins can clear this group"}), 403

        try:
            removed = message_store.clear_room(user_id, room, group_store.room_ids_for_user(user_id))
        except PermissionError as err:
            return jsonify({"error": str(err)}), 403

        _broadcast("chat:cleared", {"room": room}, room)
        return jsonify({"room": room, "removed": removed}), 200

    @app.route("/chat/groups", methods=["POST"])
    def create_group():
        user_id = _identity_from_header()
        if not user_id:
            return jsonify({"error": "authentication required"}), 401

        body = flask_request.get_json(silent=True) or {}

        try:
            group = group_store.create(user_id, body.get("name"), body.get("member_ids"))
        except ValueError as err:
            return jsonify({"error": str(err)}), 400

        _notify_members(group["id"], group["members"])
        return jsonify({"group": group_store.decorate(group, user_id)}), 201

    @app.route("/chat/groups/join", methods=["POST"])
    def join_group():
        user_id = _identity_from_header()
        if not user_id:
            return jsonify({"error": "authentication required"}), 401

        body = flask_request.get_json(silent=True) or {}

        try:
            group = group_store.join_by_token(user_id, body.get("token"))
        except (LookupError, ValueError) as err:
            return _group_error(err)

        _notify_members(group["id"], group["members"])
        return jsonify({"group": group_store.decorate(group, user_id)}), 200

    @app.route("/chat/groups/<group_id>", methods=["GET"])
    def get_group(group_id):
        user_id = _identity_from_header()
        if not user_id:
            return jsonify({"error": "authentication required"}), 401

        group = group_store.get(group_id)
        if not group:
            return jsonify({"error": "group not found"}), 404
        if not group_store.is_member(group, user_id):
            return jsonify({"error": "you are not a member of this group"}), 403

        return jsonify({"group": group_store.decorate(group, user_id)}), 200

    @app.route("/chat/groups/<group_id>", methods=["PUT"])
    def rename_group(group_id):
        user_id = _identity_from_header()
        if not user_id:
            return jsonify({"error": "authentication required"}), 401

        body = flask_request.get_json(silent=True) or {}

        try:
            group = group_store.rename(user_id, group_id, body.get("name"))
        except (LookupError, PermissionError, ValueError) as err:
            return _group_error(err)

        _notify_members(group["id"], group["members"])
        return jsonify({"group": group_store.decorate(group, user_id)}), 200

    @app.route("/chat/groups/<group_id>/members", methods=["POST"])
    def add_group_member(group_id):
        user_id = _identity_from_header()
        if not user_id:
            return jsonify({"error": "authentication required"}), 401

        body = flask_request.get_json(silent=True) or {}

        try:
            group = group_store.add_member(user_id, group_id, body.get("user_id"))
        except (LookupError, PermissionError, ValueError) as err:
            return _group_error(err)

        _notify_members(group["id"], group["members"])
        return jsonify({"group": group_store.decorate(group, user_id)}), 200

    @app.route("/chat/groups/<group_id>/members/<member_id>", methods=["DELETE"])
    def remove_group_member(group_id, member_id):
        user_id = _identity_from_header()
        if not user_id:
            return jsonify({"error": "authentication required"}), 401

        before = group_store.get(group_id)
        audience = list(before["members"]) if before else []

        try:
            group = group_store.remove_member(user_id, group_id, member_id)
        except (LookupError, PermissionError) as err:
            return _group_error(err)

        _notify_members(group_id, audience)

        if not group:
            return jsonify({"group": None, "removed": member_id}), 200

        if member_id == user_id:
            return jsonify({"group": None, "removed": member_id}), 200

        return jsonify({"group": group_store.decorate(group, user_id)}), 200

    @app.route("/chat/groups/<group_id>/admins", methods=["PUT"])
    def set_group_admin(group_id):
        user_id = _identity_from_header()
        if not user_id:
            return jsonify({"error": "authentication required"}), 401

        body = flask_request.get_json(silent=True) or {}

        try:
            group = group_store.set_admin(
                user_id, group_id, body.get("user_id"), bool(body.get("admin"))
            )
        except (LookupError, PermissionError) as err:
            return _group_error(err)

        _notify_members(group["id"], group["members"])
        return jsonify({"group": group_store.decorate(group, user_id)}), 200

    @app.route("/chat/groups/<group_id>/settings", methods=["PUT"])
    def update_group_settings(group_id):
        user_id = _identity_from_header()
        if not user_id:
            return jsonify({"error": "authentication required"}), 401

        body = flask_request.get_json(silent=True) or {}

        try:
            group = group_store.update_settings(user_id, group_id, body)
        except (LookupError, PermissionError) as err:
            return _group_error(err)

        _notify_members(group["id"], group["members"])
        return jsonify({"group": group_store.decorate(group, user_id)}), 200

    @app.route("/chat/groups/<group_id>/invite", methods=["POST"])
    def rotate_group_invite(group_id):
        user_id = _identity_from_header()
        if not user_id:
            return jsonify({"error": "authentication required"}), 401

        try:
            group = group_store.rotate_invite(user_id, group_id)
        except (LookupError, PermissionError) as err:
            return _group_error(err)

        return jsonify({"group": group_store.decorate(group, user_id)}), 200

    @app.route("/chat/upload", methods=["POST"])
    def upload():
        user_id = _identity_from_header()
        if not user_id:
            return jsonify({"error": "authentication required"}), 401

        room = room_utils.normalize(flask_request.form.get("room"))
        if not room_utils.is_valid(room):
            return jsonify({"error": "unknown conversation"}), 400

        if not room_utils.can_access(room, user_id, group_store.room_ids_for_user(user_id)):
            return jsonify({"error": "this conversation is not yours"}), 403

        if room_utils.is_group(room):
            if not group_store.can_post(group_store.get(room), user_id):
                return jsonify({"error": "only admins can post in this group"}), 403

        upload_file = flask_request.files.get("file")
        if not upload_file:
            return jsonify({"error": "no file received"}), 400

        try:
            message = message_store.create_media(
                user_id,
                room,
                upload_file.stream,
                upload_file.mimetype,
                upload_file.filename,
                flask_request.form.get("caption"),
                flask_request.form.get("reply_to") or None,
            )
        except ValueError as err:
            return jsonify({"error": str(err)}), 400

        _broadcast("chat:message", {"message": message}, room)
        return jsonify({"message": message}), 201

    @app.route("/health", methods=["GET"])
    def health():
        return jsonify({"service": Config.SERVICE_NAME, "status": "ok"}), 200

    socketio.init_app(app)
    return app


app = create_app()


def _identity(token):
    if not token:
        return None
    try:
        with app.app_context():
            return decode_token(token)["sub"]
    except Exception:
        return None


def _identity_from_header():
    from flask import request as req

    header = req.headers.get("Authorization", "")
    if not header.lower().startswith("bearer "):
        return None
    return _identity(header.split(" ", 1)[1].strip())


def _current_user():
    from flask import request

    return _sessions.get(request.sid)


def _fail(reason):
    emit("chat:error", {"error": reason})


def _authorize(payload, posting=False):
    user_id = _current_user()
    if not user_id:
        _fail("not authenticated")
        return None, None

    room = room_utils.normalize((payload or {}).get("room"))
    if not room_utils.is_valid(room):
        _fail("unknown conversation")
        return None, None

    if not room_utils.can_access(room, user_id, group_store.room_ids_for_user(user_id)):
        _fail("this conversation is not yours")
        return None, None

    if posting and room_utils.is_group(room):
        if not group_store.can_post(group_store.get(room), user_id):
            _fail("only admins can post in this group")
            return None, None

    return user_id, room


@socketio.on("connect")
def on_connect(auth):
    user_id = _identity((auth or {}).get("token"))
    if not user_id:
        return False

    from flask import request

    _sessions[request.sid] = user_id
    join_room(_user_room(user_id))

    if presence_store.connect(user_id, request.sid):
        _announce_presence(user_id, True)

    touched = message_store.mark_delivered(user_id, _rooms_for(user_id))
    for room, message_ids in touched.items():
        _broadcast(
            "chat:receipt",
            {"room": room, "user_id": user_id, "state": "delivered", "ids": message_ids},
            room,
        )

    emit("chat:online", {"ids": presence_store.online_ids()})
    emit("call:active", {"calls": call_store.active_for(_rooms_for(user_id))})
    return True


@socketio.on("disconnect")
def on_disconnect():
    from flask import request

    _sessions.pop(request.sid, None)
    user_id, went_offline = presence_store.disconnect(request.sid)

    if not user_id:
        return

    changed, ended = call_store.drop_user(user_id)

    for call in changed:
        _push_call(call["room"], call)

    for room in ended:
        _push_call(room, None)

    if went_offline:
        _announce_presence(user_id, False)


@socketio.on("chat:join")
def on_join(payload=None):
    user_id, room = _authorize(payload)
    if not user_id:
        return

    if room == room_utils.GENERAL:
        join_room(room_utils.GENERAL)

    emit("chat:history", {"room": room, "messages": message_store.history(room)})


@socketio.on("chat:leave")
def on_leave(payload=None):
    room = room_utils.normalize((payload or {}).get("room"))
    if room == room_utils.GENERAL:
        leave_room(room_utils.GENERAL)


@socketio.on("chat:typing")
def on_typing(payload=None):
    user_id, room = _authorize(payload)
    if not user_id:
        return

    payload = payload or {}
    mode = payload.get("mode")
    if mode not in ("text", "voice", "stop"):
        mode = "stop"

    for member_id in _room_members(room) or presence_store.online_ids():
        if member_id == user_id:
            continue
        socketio.emit(
            "chat:typing",
            {
                "room": room,
                "user_id": user_id,
                "name": (payload.get("name") or "")[:60],
                "mode": mode,
            },
            to=_user_room(member_id),
        )


@socketio.on("chat:read")
def on_read(payload=None):
    user_id, room = _authorize(payload)
    if not user_id:
        return

    ids = message_store.mark_read(user_id, room)
    if not ids:
        return

    _broadcast(
        "chat:receipt",
        {"room": room, "user_id": user_id, "state": "read", "ids": ids},
        room,
    )


def _display_name(user_id):
    from services.clients import fetch_users

    record = fetch_users([user_id]).get(user_id) or {}
    return record.get("name") or "Traveler"


@socketio.on("call:start")
def on_call_start(payload=None):
    user_id, room = _authorize(payload)
    if not user_id:
        return

    payload = payload or {}
    kind = payload.get("kind") if payload.get("kind") in ("audio", "video") else "audio"

    call, created = call_store.start(room, user_id, _display_name(user_id), kind)
    if not call:
        return _fail("this call is no longer available")

    _push_call(room, call)

    if created:
        for member_id in _call_targets(room):
            if member_id == user_id:
                continue
            socketio.emit(
                "call:incoming",
                {"room": room, "call": call_store.public(call)},
                to=_user_room(member_id),
            )


@socketio.on("call:join")
def on_call_join(payload=None):
    user_id, room = _authorize(payload)
    if not user_id:
        return

    call = call_store.join(room, user_id, _display_name(user_id))
    if not call:
        return _fail("this call has ended")

    _push_call(room, call)


@socketio.on("call:leave")
def on_call_leave(payload=None):
    user_id, room = _authorize(payload)
    if not user_id:
        return

    call, ended = call_store.leave(room, user_id)
    _push_call(room, None if ended else call)


@socketio.on("call:media")
def on_call_media(payload=None):
    user_id, room = _authorize(payload)
    if not user_id:
        return

    call = call_store.set_media(room, user_id, payload or {})
    if call:
        _push_call(room, call)


@socketio.on("call:signal")
def on_call_signal(payload=None):
    user_id, room = _authorize(payload)
    if not user_id:
        return

    payload = payload or {}
    target = payload.get("to")

    if not target or not call_store.is_participant(room, target):
        return

    socketio.emit(
        "call:signal",
        {"room": room, "from": user_id, "data": payload.get("data")},
        to=_user_room(target),
    )


@socketio.on("chat:send")
def on_send(payload):
    user_id, room = _authorize(payload, posting=True)
    if not user_id:
        return

    payload = payload or {}
    try:
        message = message_store.create(user_id, room, payload.get("text"), payload.get("reply_to"))
    except ValueError as err:
        return _fail(str(err))

    _broadcast("chat:message", {"message": message}, room)


@socketio.on("chat:voice")
def on_voice(payload):
    user_id, room = _authorize(payload, posting=True)
    if not user_id:
        return

    payload = payload or {}

    try:
        message = message_store.create_voice(
            user_id,
            room,
            payload.get("blob"),
            payload.get("mime"),
            payload.get("duration"),
            payload.get("reply_to"),
        )
    except ValueError as err:
        return _fail(str(err))

    _broadcast("chat:message", {"message": message}, room)


@socketio.on("chat:edit")
def on_edit(payload):
    user_id = _current_user()
    if not user_id:
        return _fail("not authenticated")

    payload = payload or {}
    try:
        message = message_store.edit(user_id, payload.get("id"), payload.get("text"))
    except (ValueError, LookupError, PermissionError) as err:
        return _fail(str(err))

    _broadcast("chat:updated", {"message": message}, message["room"])


@socketio.on("chat:delete")
def on_delete(payload):
    user_id = _current_user()
    if not user_id:
        return _fail("not authenticated")

    try:
        message_id, room = message_store.remove(user_id, (payload or {}).get("id"))
    except (LookupError, PermissionError) as err:
        return _fail(str(err))

    _broadcast("chat:deleted", {"id": message_id, "room": room}, room)


if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=Config.PORT, debug=True)