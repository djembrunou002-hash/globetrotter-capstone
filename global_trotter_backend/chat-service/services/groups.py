import secrets
import uuid
from datetime import datetime, timezone

from services.clients import fetch_users
from services.storage import load_json, save_json

FILE = "groups.json"
MAX_NAME_LENGTH = 60
MAX_MEMBERS = 100
FALLBACK_NAME = "Traveler"

DEFAULT_SETTINGS = {
    "restrict_invites": False,
    "admins_only_messages": False,
}


def _now():
    return datetime.now(timezone.utc).isoformat()


def _load():
    return load_json(FILE)


def _find(data, group_id):
    return next((g for g in data["groups"] if g["id"] == group_id), None)


def _settings_of(group):
    merged = dict(DEFAULT_SETTINGS)
    merged.update(group.get("settings") or {})
    return merged


def get(group_id):
    return _find(_load(), group_id)


def list_for_user(user_id):
    return [g for g in _load()["groups"] if user_id in g["members"]]


def room_ids_for_user(user_id):
    return [g["id"] for g in list_for_user(user_id)]


def is_member(group, user_id):
    return bool(group) and user_id in group["members"]


def is_owner(group, user_id):
    return bool(group) and group["owner_id"] == user_id


def is_admin(group, user_id):
    if not group:
        return False
    return user_id == group["owner_id"] or user_id in (group.get("admins") or [])


def can_post(group, user_id):
    if not is_member(group, user_id):
        return False
    if _settings_of(group)["admins_only_messages"]:
        return is_admin(group, user_id)
    return True


def can_invite(group, user_id):
    if not is_member(group, user_id):
        return False
    if _settings_of(group)["restrict_invites"]:
        return is_admin(group, user_id)
    return True


def decorate(group, viewer_id):
    users = fetch_users(group["members"])

    members = []
    for member_id in group["members"]:
        record = users.get(member_id) or {}
        members.append({
            "id": member_id,
            "name": record.get("name") or FALLBACK_NAME,
            "email": record.get("email"),
            "number": record.get("number"),
            "is_owner": member_id == group["owner_id"],
            "is_admin": is_admin(group, member_id),
        })

    viewer_is_admin = is_admin(group, viewer_id)

    return {
        "id": group["id"],
        "name": group["name"],
        "owner_id": group["owner_id"],
        "created_at": group["created_at"],
        "members": members,
        "member_count": len(members),
        "settings": _settings_of(group),
        "is_owner": is_owner(group, viewer_id),
        "is_admin": viewer_is_admin,
        "can_invite": can_invite(group, viewer_id),
        "can_post": can_post(group, viewer_id),
        "invite_token": group["invite_token"] if can_invite(group, viewer_id) else None,
    }


def summary(group, viewer_id):
    return {
        "id": group["id"],
        "name": group["name"],
        "owner_id": group["owner_id"],
        "member_ids": list(group["members"]),
        "member_count": len(group["members"]),
        "is_owner": is_owner(group, viewer_id),
        "is_admin": is_admin(group, viewer_id),
        "can_post": can_post(group, viewer_id),
    }


def _require_member(data, group_id, user_id):
    group = _find(data, group_id)
    if not group:
        raise LookupError("group not found")
    if user_id not in group["members"]:
        raise PermissionError("you are not a member of this group")
    return group


def create(user_id, name, member_ids=None):
    name = (name or "").strip()
    if not name:
        raise ValueError("a group name is required")
    if len(name) > MAX_NAME_LENGTH:
        raise ValueError(f"group name cannot exceed {MAX_NAME_LENGTH} characters")

    members = [user_id]
    for member in member_ids or []:
        if member and member not in members:
            members.append(member)

    if len(members) > MAX_MEMBERS:
        raise ValueError(f"a group cannot exceed {MAX_MEMBERS} members")

    data = _load()
    group = {
        "id": f"grp_{uuid.uuid4().hex[:12]}",
        "name": name,
        "owner_id": user_id,
        "admins": [user_id],
        "members": members,
        "invite_token": secrets.token_urlsafe(12),
        "settings": dict(DEFAULT_SETTINGS),
        "created_at": _now(),
    }

    data["groups"].append(group)
    save_json(FILE, data)
    return group


def rename(actor_id, group_id, name):
    name = (name or "").strip()
    if not name:
        raise ValueError("a group name is required")
    if len(name) > MAX_NAME_LENGTH:
        raise ValueError(f"group name cannot exceed {MAX_NAME_LENGTH} characters")

    data = _load()
    group = _require_member(data, group_id, actor_id)

    if not is_admin(group, actor_id):
        raise PermissionError("only admins can rename this group")

    group["name"] = name
    save_json(FILE, data)
    return group


def add_member(actor_id, group_id, user_id):
    data = _load()
    group = _require_member(data, group_id, actor_id)

    if not can_invite(group, actor_id):
        raise PermissionError("only admins can add people to this group")

    if user_id in group["members"]:
        raise ValueError("this traveller is already in the group")

    if len(group["members"]) >= MAX_MEMBERS:
        raise ValueError(f"a group cannot exceed {MAX_MEMBERS} members")

    group["members"].append(user_id)
    save_json(FILE, data)
    return group


def remove_member(actor_id, group_id, user_id):
    data = _load()
    group = _require_member(data, group_id, actor_id)

    if user_id != actor_id and not is_admin(group, actor_id):
        raise PermissionError("only admins can remove people from this group")

    if user_id == group["owner_id"] and user_id != actor_id:
        raise PermissionError("the group creator cannot be removed")

    if user_id not in group["members"]:
        raise LookupError("this traveller is not in the group")

    group["members"] = [m for m in group["members"] if m != user_id]
    group["admins"] = [m for m in (group.get("admins") or []) if m != user_id]

    if not group["members"]:
        data["groups"] = [g for g in data["groups"] if g["id"] != group_id]
        save_json(FILE, data)
        return None

    if user_id == group["owner_id"]:
        successor = next((m for m in group["members"] if m in group["admins"]), group["members"][0])
        group["owner_id"] = successor
        if successor not in group["admins"]:
            group["admins"].append(successor)

    save_json(FILE, data)
    return group


def set_admin(actor_id, group_id, user_id, value):
    data = _load()
    group = _require_member(data, group_id, actor_id)

    if not is_owner(group, actor_id):
        raise PermissionError("only the group creator can change admins")

    if user_id not in group["members"]:
        raise LookupError("this traveller is not in the group")

    if user_id == group["owner_id"]:
        raise PermissionError("the group creator is always an admin")

    admins = group.get("admins") or []

    if value and user_id not in admins:
        admins.append(user_id)
    elif not value:
        admins = [m for m in admins if m != user_id]

    group["admins"] = admins
    save_json(FILE, data)
    return group


def update_settings(actor_id, group_id, patch):
    data = _load()
    group = _require_member(data, group_id, actor_id)

    if not is_admin(group, actor_id):
        raise PermissionError("only admins can change these settings")

    settings = _settings_of(group)

    for key in DEFAULT_SETTINGS:
        if key in (patch or {}):
            settings[key] = bool(patch[key])

    group["settings"] = settings
    save_json(FILE, data)
    return group


def rotate_invite(actor_id, group_id):
    data = _load()
    group = _require_member(data, group_id, actor_id)

    if not is_owner(group, actor_id):
        raise PermissionError("only the group creator can reset the invite link")

    group["invite_token"] = secrets.token_urlsafe(12)
    save_json(FILE, data)
    return group


def join_by_token(user_id, token):
    token = (token or "").strip()
    if not token:
        raise LookupError("invalid invite link")

    data = _load()
    group = next((g for g in data["groups"] if g["invite_token"] == token), None)

    if not group:
        raise LookupError("this invite link is no longer valid")

    if user_id in group["members"]:
        return group

    if len(group["members"]) >= MAX_MEMBERS:
        raise ValueError(f"a group cannot exceed {MAX_MEMBERS} members")

    group["members"].append(user_id)
    save_json(FILE, data)
    return group