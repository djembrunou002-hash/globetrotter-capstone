GENERAL = "general"
DIRECT_PREFIX = "dm_"
SEPARATOR = "__"


def normalize(room):
    room = (room or "").strip()
    return room or GENERAL


def direct_room(user_a, user_b):
    first, second = sorted([user_a, user_b])
    return f"{DIRECT_PREFIX}{first}{SEPARATOR}{second}"


def participants(room):
    if not room or not room.startswith(DIRECT_PREFIX):
        return []

    parts = room[len(DIRECT_PREFIX):].split(SEPARATOR)
    if len(parts) != 2 or not all(parts):
        return []

    return parts


def is_direct(room):
    return len(participants(room)) == 2


def is_valid(room):
    return room == GENERAL or is_direct(room)


def can_access(room, user_id):
    if room == GENERAL:
        return True
    return user_id in participants(room)


def peer_id(room, user_id):
    members = participants(room)
    if len(members) != 2 or user_id not in members:
        return None
    return members[0] if members[1] == user_id else members[1]