import uuid
from datetime import datetime, timezone

from config import Config
from services.clients import fetch_users
from services.storage import load_json, save_json
from services import media as media_store
from services import rooms as room_utils
from services import voice as voice_store

FILE = "messages.json"
FALLBACK_NAME = "Traveler"


def _now():
    return datetime.now(timezone.utc).isoformat()


def _load():
    return load_json(FILE)


def _visible(message):
    return not message.get("deleted")


def _room_of(message):
    return message.get("room") or room_utils.GENERAL


def _resolve_reply(all_messages, reply_to, room):
    if not reply_to:
        return None

    parent = next((m for m in all_messages if m["id"] == reply_to), None)
    if not parent or parent.get("deleted") or _room_of(parent) != room:
        return None

    return reply_to


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
            "room": _room_of(message),
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


def history(room, limit=None):
    room = room_utils.normalize(room)
    limit = limit or Config.HISTORY_LIMIT
    messages = [m for m in _load()["messages"] if _visible(m) and _room_of(m) == room]
    return decorate(messages[-limit:])


def room_of(message_id):
    message = next((m for m in _load()["messages"] if m["id"] == message_id), None)
    return _room_of(message) if message else None


def conversations(user_id, groups=None):
    groups = groups or []
    group_by_id = {group["id"]: group for group in groups}

    latest = {}
    incoming = {}

    for message in _load()["messages"]:
        if not _visible(message):
            continue

        room = _room_of(message)
        if not room_utils.can_access(room, user_id, group_by_id.keys()):
            continue

        latest[room] = message
        if message["user_id"] != user_id:
            incoming[room] = incoming.get(room, 0) + 1

    peer_ids = {room_utils.peer_id(room, user_id) for room in latest}
    author_ids = {m["user_id"] for m in latest.values()}
    users = fetch_users({uid for uid in peer_ids | author_ids if uid})

    items = []
    for room, message in latest.items():
        pid = room_utils.peer_id(room, user_id)
        peer = None

        if pid:
            record = users.get(pid) or {}
            peer = {
                "id": pid,
                "name": record.get("name") or FALLBACK_NAME,
                "email": record.get("email"),
                "number": record.get("number"),
            }

        group = group_by_id.get(room)

        author = users.get(message["user_id"]) or {}
        items.append({
            "room": room,
            "kind": "group" if group else "direct" if peer else "general",
            "peer": peer,
            "group": group,
            "updated_at": message["created_at"],
            "incoming_count": incoming.get(room, 0),
            "last_message": {
                "author_name": author.get("name") or FALLBACK_NAME,
                "kind": message.get("kind", "text"),
                "text": message.get("text") or "",
                "created_at": message["created_at"],
                "mine": message["user_id"] == user_id,
            },
        })

    for group in groups:
        if group["id"] in latest:
            continue
        items.append({
            "room": group["id"],
            "kind": "group",
            "peer": None,
            "group": group,
            "updated_at": None,
            "incoming_count": 0,
            "last_message": None,
        })

    if room_utils.GENERAL not in latest:
        items.append({
            "room": room_utils.GENERAL,
            "kind": "general",
            "peer": None,
            "group": None,
            "updated_at": None,
            "incoming_count": 0,
            "last_message": None,
        })

    items.sort(key=lambda c: c["updated_at"] or "", reverse=True)
    return items


def clear_room(user_id, room, group_ids=()):
    if room == room_utils.GENERAL:
        raise PermissionError("the general chat cannot be deleted")
    if not room_utils.can_access(room, user_id, group_ids):
        raise PermissionError("this conversation is not yours")

    data = _load()
    removed = 0

    for message in data["messages"]:
        if _room_of(message) != room or message.get("deleted"):
            continue

        if message.get("audio"):
            voice_store.remove(message["audio"])
        if message.get("media"):
            media_store.remove(message["media"])

        message["deleted"] = True
        message["text"] = ""
        message["audio"] = None
        message["media"] = None
        message["edited_at"] = _now()
        removed += 1

    if removed:
        save_json(FILE, data)

    return removed


def create(user_id, room, text, reply_to=None):
    text = (text or "").strip()
    if not text:
        raise ValueError("message cannot be empty")
    if len(text) > Config.MAX_MESSAGE_LENGTH:
        raise ValueError(f"message cannot exceed {Config.MAX_MESSAGE_LENGTH} characters")

    room = room_utils.normalize(room)
    data = _load()

    message = {
        "id": f"msg_{uuid.uuid4().hex[:12]}",
        "user_id": user_id,
        "room": room,
        "kind": "text",
        "text": text,
        "audio": None,
        "media": None,
        "reply_to": _resolve_reply(data["messages"], reply_to, room),
        "created_at": _now(),
        "edited_at": None,
        "deleted": False,
    }

    data["messages"].append(message)
    save_json(FILE, data)

    return decorate([message])[0]


def create_voice(user_id, room, blob, mime, duration, reply_to=None):
    audio = voice_store.save(blob, mime, duration)

    room = room_utils.normalize(room)
    data = _load()

    message = {
        "id": f"msg_{uuid.uuid4().hex[:12]}",
        "user_id": user_id,
        "room": room,
        "kind": "voice",
        "text": "",
        "audio": audio,
        "media": None,
        "reply_to": _resolve_reply(data["messages"], reply_to, room),
        "created_at": _now(),
        "edited_at": None,
        "deleted": False,
    }

    data["messages"].append(message)
    save_json(FILE, data)

    return decorate([message])[0]


def create_media(user_id, room, stream, mime, original_name, caption=None, reply_to=None):
    media = media_store.save(stream, mime, original_name)

    caption = (caption or "").strip()[: Config.MAX_MESSAGE_LENGTH]
    room = room_utils.normalize(room)
    data = _load()

    message = {
        "id": f"msg_{uuid.uuid4().hex[:12]}",
        "user_id": user_id,
        "room": room,
        "kind": media["kind"],
        "text": caption,
        "audio": None,
        "media": media,
        "reply_to": _resolve_reply(data["messages"], reply_to, room),
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

    room = _room_of(message)

    message["deleted"] = True
    message["text"] = ""
    message["audio"] = None
    message["media"] = None
    message["edited_at"] = _now()
    save_json(FILE, data)

    return message["id"], room