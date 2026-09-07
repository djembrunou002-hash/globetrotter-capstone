from datetime import datetime, timezone

_calls = {}


def _now():
    return datetime.now(timezone.utc).isoformat()


def _participant(user_id, name):
    return {
        "id": user_id,
        "name": name or "Traveler",
        "muted": False,
        "video": False,
    }


def get(room):
    return _calls.get(room)


def public(call):
    if not call:
        return None

    return {
        "room": call["room"],
        "kind": call["kind"],
        "started_by": call["started_by"],
        "started_at": call["started_at"],
        "participants": list(call["participants"].values()),
    }


def start(room, user_id, name, kind):
    existing = _calls.get(room)

    if existing:
        return join(room, user_id, name), False

    _calls[room] = {
        "room": room,
        "kind": kind if kind in ("audio", "video") else "audio",
        "started_by": user_id,
        "started_at": _now(),
        "participants": {user_id: _participant(user_id, name)},
    }

    if kind == "video":
        _calls[room]["participants"][user_id]["video"] = True

    return _calls[room], True


def join(room, user_id, name):
    call = _calls.get(room)
    if not call:
        return None

    if user_id not in call["participants"]:
        call["participants"][user_id] = _participant(user_id, name)

    return call


def leave(room, user_id):
    call = _calls.get(room)
    if not call:
        return None, False

    call["participants"].pop(user_id, None)

    if not call["participants"]:
        _calls.pop(room, None)
        return None, True

    return call, False


def set_media(room, user_id, patch):
    call = _calls.get(room)
    if not call:
        return None

    participant = call["participants"].get(user_id)
    if not participant:
        return None

    if "muted" in patch:
        participant["muted"] = bool(patch["muted"])
    if "video" in patch:
        participant["video"] = bool(patch["video"])

    return call


def is_participant(room, user_id):
    call = _calls.get(room)
    return bool(call) and user_id in call["participants"]


def active_for(rooms):
    return [public(call) for room, call in _calls.items() if room in rooms]


def drop_user(user_id):
    ended = []
    changed = []

    for room in list(_calls.keys()):
        call = _calls.get(room)
        if not call or user_id not in call["participants"]:
            continue

        call["participants"].pop(user_id, None)

        if not call["participants"]:
            _calls.pop(room, None)
            ended.append(room)
        else:
            changed.append(call)

    return changed, ended