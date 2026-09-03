import uuid
from datetime import datetime, timezone

from config import Config
from services.clients import fetch_users
from services.storage import load_json, save_json
from services import media as media_store
from services import voice as voice_store

FILE = "messages.json"
FALLBACK_NAME = "Traveler"


def _now():
    return datetime.now(timezone.utc).isoformat()


def _load():
    return load_json(FILE)


def _visible(message):
    return not message.get("deleted")


def decorate(messages):
    author_ids = {m["user_id"] for m in messages}
    parent_ids = {m["reply_to"] for m in messages if m.get("reply_to")}

    by_id = {m["id"]: m for m in _load()["messages"]}
    parents = {pid: by_id.get(pid) for pid in parent_ids}
    author_ids |= {p["user_id"] for p in parents.values() if p}

    users = fetch_users(author_ids)

    decorated = []
    for message in messages:
        author = users.get(message["user_id"]) or {}
        item = {
            "id": message["id"],
            "user_id": message["user_id"],
            "author_name": author.get("name") or FALLBACK_NAME,
            "kind": message.get("kind", "text"),
            "text": message["text"],
            "audio": message.get("audio"),
            "media": message.get("media"),
            "created_at": message["created_at"],
            "edited_at": message.get("edited_at"),
            "reply_to": message.get("reply_to"),
            "reply_preview": None,
        }

        parent = parents.get(message.get("reply_to"))
        if parent:
            parent_author = users.get(parent["user_id"]) or {}
            item["reply_preview"] = {
                "id": parent["id"],
                "author_name": parent_author.get("name") or FALLBACK_NAME,
                "kind": parent.get("kind", "text"),
                "text": "" if parent.get("deleted") else parent["text"],
                "deleted": bool(parent.get("deleted")),
            }

        decorated.append(item)

    return decorated


def history(limit=None):
    limit = limit or Config.HISTORY_LIMIT
    messages = [m for m in _load()["messages"] if _visible(m)]
    return decorate(messages[-limit:])


def create(user_id, text, reply_to=None):
    text = (text or "").strip()
    if not text:
        raise ValueError("message cannot be empty")
    if len(text) > Config.MAX_MESSAGE_LENGTH:
        raise ValueError(f"message cannot exceed {Config.MAX_MESSAGE_LENGTH} characters")

    data = _load()

    if reply_to:
        parent = next((m for m in data["messages"] if m["id"] == reply_to), None)
        if not parent or parent.get("deleted"):
            reply_to = None

    message = {
        "id": f"msg_{uuid.uuid4().hex[:12]}",
        "user_id": user_id,
        "kind": "text",
        "text": text,
        "audio": None,
        "reply_to": reply_to,
        "created_at": _now(),
        "edited_at": None,
        "deleted": False,
    }

    data["messages"].append(message)
    save_json(FILE, data)

    return decorate([message])[0]


def create_voice(user_id, blob, mime, duration, reply_to=None):
    audio = voice_store.save(blob, mime, duration)

    data = _load()

    if reply_to:
        parent = next((m for m in data["messages"] if m["id"] == reply_to), None)
        if not parent or parent.get("deleted"):
            reply_to = None

    message = {
        "id": f"msg_{uuid.uuid4().hex[:12]}",
        "user_id": user_id,
        "kind": "voice",
        "text": "",
        "audio": audio,
        "media": None,
        "reply_to": reply_to,
        "created_at": _now(),
        "edited_at": None,
        "deleted": False,
    }

    data["messages"].append(message)
    save_json(FILE, data)

    return decorate([message])[0]


def create_media(user_id, stream, mime, original_name, caption=None, reply_to=None):
    media = media_store.save(stream, mime, original_name)

    caption = (caption or "").strip()[: Config.MAX_MESSAGE_LENGTH]

    data = _load()

    if reply_to:
        parent = next((m for m in data["messages"] if m["id"] == reply_to), None)
        if not parent or parent.get("deleted"):
            reply_to = None

    message = {
        "id": f"msg_{uuid.uuid4().hex[:12]}",
        "user_id": user_id,
        "kind": media["kind"],
        "text": caption,
        "audio": None,
        "media": media,
        "reply_to": reply_to,
        "created_at": _now(),
        "edited_at": None,
        "deleted": False,
    }

    data["messages"].append(message)
    save_json(FILE, data)

    return decorate([message])[0]


def edit(user_id, message_id, text):
    text = (text or "").strip()
    if not text:
        raise ValueError("message cannot be empty")
    if len(text) > Config.MAX_MESSAGE_LENGTH:
        raise ValueError(f"message cannot exceed {Config.MAX_MESSAGE_LENGTH} characters")

    data = _load()
    message = next((m for m in data["messages"] if m["id"] == message_id), None)

    if not message or message.get("deleted"):
        raise LookupError("message not found")
    if message["user_id"] != user_id:
        raise PermissionError("you can only edit your own messages")
    if message.get("kind") not in (None, "text"):
        raise PermissionError("only text messages can be edited")

    message["text"] = text
    message["edited_at"] = _now()
    save_json(FILE, data)

    return decorate([message])[0]


def remove(user_id, message_id):
    data = _load()
    message = next((m for m in data["messages"] if m["id"] == message_id), None)

    if not message or message.get("deleted"):
        raise LookupError("message not found")
    if message["user_id"] != user_id:
        raise PermissionError("you can only delete your own messages")

    if message.get("audio"):
        voice_store.remove(message["audio"])

    if message.get("media"):
        media_store.remove(message["media"])

    message["deleted"] = True
    message["text"] = ""
    message["audio"] = None
    message["media"] = None
    message["edited_at"] = _now()
    save_json(FILE, data)

    return message["id"]