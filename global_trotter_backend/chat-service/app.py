import eventlet

eventlet.monkey_patch()

import os

from flask import Flask, jsonify, send_from_directory
from flask_jwt_extended import JWTManager, decode_token
from flask_socketio import SocketIO, emit, join_room, leave_room

from config import Config
from services import messages as message_store
from services.service_client import ServiceUnavailable

ROOM = "general"

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


def _current_user():
    from flask import request

    return _sessions.get(request.sid)


def _fail(reason):
    emit("chat:error", {"error": reason})


@socketio.on("connect")
def on_connect(auth):
    user_id = _identity((auth or {}).get("token"))
    if not user_id:
        return False

    from flask import request

    _sessions[request.sid] = user_id
    return True


@socketio.on("disconnect")
def on_disconnect():
    from flask import request

    _sessions.pop(request.sid, None)


@socketio.on("chat:join")
def on_join():
    user_id = _current_user()
    if not user_id:
        return _fail("not authenticated")

    join_room(ROOM)
    emit("chat:history", {"messages": message_store.history()})


@socketio.on("chat:leave")
def on_leave():
    leave_room(ROOM)


@socketio.on("chat:send")
def on_send(payload):
    user_id = _current_user()
    if not user_id:
        return _fail("not authenticated")

    payload = payload or {}
    try:
        message = message_store.create(user_id, payload.get("text"), payload.get("reply_to"))
    except ValueError as err:
        return _fail(str(err))

    socketio.emit("chat:message", {"message": message}, to=ROOM)


@socketio.on("chat:voice")
def on_voice(payload):
    user_id = _current_user()
    if not user_id:
        return _fail("not authenticated")

    payload = payload or {}
    blob = payload.get("blob")
    print(
        f"CHAT voice: type={type(blob).__name__} "
        f"len={len(blob) if hasattr(blob, '__len__') else 'n/a'} "
        f"mime={payload.get('mime')!r} dur={payload.get('duration')}",
        flush=True,
    )

    try:
        message = message_store.create_voice(
            user_id,
            blob,
            payload.get("mime"),
            payload.get("duration"),
            payload.get("reply_to"),
        )
    except ValueError as err:
        print(f"CHAT voice rejected: {err}", flush=True)
        return _fail(str(err))

    socketio.emit("chat:message", {"message": message}, to=ROOM)


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

    socketio.emit("chat:updated", {"message": message}, to=ROOM)


@socketio.on("chat:delete")
def on_delete(payload):
    user_id = _current_user()
    if not user_id:
        return _fail("not authenticated")

    try:
        message_id = message_store.remove(user_id, (payload or {}).get("id"))
    except (LookupError, PermissionError) as err:
        return _fail(str(err))

    socketio.emit("chat:deleted", {"id": message_id}, to=ROOM)


if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=Config.PORT, debug=True)