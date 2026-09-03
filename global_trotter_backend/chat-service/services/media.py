import os
import uuid

from config import Config

IMAGE_TYPES = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
}

VIDEO_TYPES = {
    "video/mp4": "mp4",
    "video/webm": "webm",
    "video/quicktime": "mov",
}

FILE_TYPES = {
    "application/pdf": "pdf",
    "text/plain": "txt",
    "application/msword": "doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/vnd.ms-excel": "xls",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
    "application/zip": "zip",
}

KINDS = {
    "image": (IMAGE_TYPES, "MEDIA_MAX_IMAGE_BYTES"),
    "video": (VIDEO_TYPES, "MEDIA_MAX_VIDEO_BYTES"),
    "file": (FILE_TYPES, "MEDIA_MAX_FILE_BYTES"),
}


def _dir():
    os.makedirs(Config.MEDIA_DIR, exist_ok=True)
    return Config.MEDIA_DIR


def _clean_name(name):
    base = os.path.basename(name or "").strip()
    base = base.replace("\\", "").replace("/", "")
    if not base:
        return "attachment"
    return base[:120]


def detect_kind(mime):
    base = (mime or "").split(";")[0].strip().lower()
    if base in IMAGE_TYPES:
        return "image"
    if base in VIDEO_TYPES:
        return "video"
    if base in FILE_TYPES:
        return "file"
    return None


def save(stream, mime, original_name):
    base = (mime or "").split(";")[0].strip().lower()
    kind = detect_kind(base)

    if not kind:
        raise ValueError("this file type is not allowed")

    table, limit_attr = KINDS[kind]
    limit = getattr(Config, limit_attr)
    extension = table[base]

    payload = stream.read(limit + 1)
    if not payload:
        raise ValueError("the file is empty")
    if len(payload) > limit:
        raise ValueError(f"{kind} must be under {limit // (1024 * 1024)} MB")

    filename = f"{kind}_{uuid.uuid4().hex[:16]}.{extension}"
    with open(os.path.join(_dir(), filename), "wb") as f:
        f.write(payload)

    return {
        "kind": kind,
        "url": f"/media/{filename}",
        "name": _clean_name(original_name),
        "mime": base,
        "size": len(payload),
    }


def remove(media):
    if not media or not media.get("url"):
        return

    filename = os.path.basename(media["url"])
    path = os.path.join(Config.MEDIA_DIR, filename)

    try:
        os.remove(path)
    except OSError:
        return