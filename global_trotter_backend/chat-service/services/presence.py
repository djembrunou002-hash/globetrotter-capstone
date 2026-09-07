from datetime import datetime, timezone

from services.storage import load_json, save_json

FILE = "presence.json"

_online = {}
_sids = {}


def _now():
    return datetime.now(timezone.utc).isoformat()


def _load_seen():
    return load_json(FILE)["last_seen"]


def _store_seen(user_id, stamp):
    data = load_json(FILE)
    data["last_seen"][user_id] = stamp
    save_json(FILE, data)


def connect(user_id, sid):
    _sids[sid] = user_id
    sessions = _online.setdefault(user_id, set())
    was_offline = len(sessions) == 0
    sessions.add(sid)
    return was_offline


def disconnect(sid):
    user_id = _sids.pop(sid, None)
    if not user_id:
        return None, False

    sessions = _online.get(user_id)
    if sessions:
        sessions.discard(sid)

    if sessions:
        return user_id, False

    _online.pop(user_id, None)
    _store_seen(user_id, _now())
    return user_id, True


def is_online(user_id):
    return bool(_online.get(user_id))


def online_ids():
    return list(_online.keys())


def last_seen(user_id):
    return _load_seen().get(user_id)


def snapshot(user_ids):
    seen = _load_seen()
    return {
        user_id: {
            "online": bool(_online.get(user_id)),
            "last_seen": seen.get(user_id),
        }
        for user_id in user_ids
    }