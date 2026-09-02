import os
import uuid

from config import Config

EXTENSIONS = {
    "audio/webm": "weba",
    "audio/ogg": "oga",
    "audio/mp4": "m4a",
    "audio/mpeg": "mp3",
    "audio/aac": "aac",
}


def _dir():
    os.makedirs(Config.VOICE_DIR, exist_ok=True)
    return Config.VOICE_DIR


def _extension(mime):
    base = (mime or "").split(";")[0].strip().lower()
    return EXTENSIONS.get(base)


def save(blob, mime, duration):
    if not blob:
        raise ValueError("no audio received")

    if isinstance(blob, memoryview):
        blob = blob.tobytes()

    if isinstance(blob, dict) and "data" in blob:
        blob = bytes(blob["data"])

    if isinstance(blob, list):
        blob = bytes(blob)

    if not isinstance(blob, (bytes, bytearray)):
        raise ValueError(f"audio must be binary, got {type(blob).__name__}")

    if len(blob) > Config.VOICE_MAX_BYTES:
        raise ValueError("voice note is too large")

    extension = _extension(mime)
    if not extension:
        raise ValueError("unsupported audio format")

    try:
        duration = float(duration or 0)
    except (TypeError, ValueError):
        raise ValueError("invalid duration")

    if duration <= 0 or duration > Config.VOICE_MAX_SECONDS:
        raise ValueError(f"voice notes must be under {Config.VOICE_MAX_SECONDS} seconds")

    filename = f"voice_{uuid.uuid4().hex[:16]}.{extension}"
    with open(os.path.join(_dir(), filename), "wb") as f:
        f.write(bytes(blob))

    return {
        "url": f"/voice/{filename}",
        "duration": round(duration, 1),
        "mime": mime,
        "size": len(blob),
    }


def remove(audio):
    if not audio or not audio.get("url"):
        return

    filename = os.path.basename(audio["url"])
    path = os.path.join(Config.VOICE_DIR, filename)

    try:
        os.remove(path)
    except OSError:
        return