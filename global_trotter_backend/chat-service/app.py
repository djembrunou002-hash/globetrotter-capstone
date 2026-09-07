import eventlet

eventlet.monkey_patch()

import os

from flask import Flask, jsonify, request as flask_request, send_from_directory
from flask_jwt_extended import JWTManager, decode_token
from flask_socketio import SocketIO, emit, join_room, leave_room

from config import Config
from services import messages as message_store
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
    return [_user_room(uid) for uid in room_utils.participants(room)]


def _broadcast(event, payload, room):
    for target in _targets(room):
        socketio.emit(event, payload, to=target)


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

    @app.route("/chat/conversations", methods=["GET"])
    def list_conversations():
        user_id = _identity_from_header()
        if not user_id:
            return jsonify({"error": "authentication required"}), 401

        return jsonify({"conversations": message_store.conversations(user_id)}), 200

    @app.route("/chat/conversations/<room>", methods=["DELETE"])
    def clear_conversation(room):
        user_id = _identity_from_header()
        if not user_id:
            return jsonify({"error": "authentication required"}), 401

        room = room_utils.normalize(room)

        try:
            removed = message_store.clear_room(user_id, room)
        except PermissionError as err:
            return jsonify({"error": str(err)}), 403

        _broadcast("chat:cleared", {"room": room}, room)
        return jsonify({"room": room, "removed": removed}), 200

    @app.route("/chat/upload", methods=["POST"])
    def upload():
        user_id = _identity_from_header()
        if not user_id:
            return jsonify({"error": "authentication required"}), 401

        room = room_utils.normalize(flask_request.form.get("room"))
        if not room_utils.is_valid(room):
            return jsonify({"error": "unknown conversation"}), 400
        if not room_utils.can_access(room, user_id):
            return jsonify({"error": "this conversation is not yours"}), 403

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


def _authorize(payload):
    user_id = _current_user()
    if not user_id:
        _fail("not authenticated")
        return None, None

    room = room_utils.normalize((payload or {}).get("room"))
    if not room_utils.is_valid(room):
        _fail("unknown conversation")
        return None, None

    if not room_utils.can_access(room, user_id):
        _fail("this conversation is not yours")
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
    return True


@socketio.on("disconnect")
def on_disconnect():
    from flask import request

    _sessions.pop(request.sid, None)


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


@socketio.on("chat:send")
def on_send(payload):
    user_id, room = _authorize(payload)
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
    user_id, room = _authorize(payload)
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