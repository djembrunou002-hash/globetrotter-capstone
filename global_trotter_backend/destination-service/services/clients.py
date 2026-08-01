from config import Config
from services.service_client import ServiceUnavailable, get_json, post_json, put_json


def fetch_user(user_id):
    data = get_json(Config.USER_SERVICE_URL, f"/internal/users/{user_id}")
    return data["user"] if data else None


def fetch_users(user_ids):
    ids = sorted({uid for uid in user_ids if uid})
    if not ids:
        return {}

    try:
        data = post_json(Config.USER_SERVICE_URL, "/internal/users/batch", {"ids": ids})
    except ServiceUnavailable:
        return {}

    return (data or {}).get("users", {})


def update_favorite(user_id, destination_id, action):
    data = put_json(
        Config.USER_SERVICE_URL,
        f"/internal/users/{user_id}/favorites",
        {"destination_id": destination_id, "action": action},
    )
    return (data or {}).get("favorites")


def fetch_user_itineraries(user_id):
    try:
        data = get_json(
            Config.ITINERARY_SERVICE_URL, "/internal/itineraries", params={"user_id": user_id}
        )
    except ServiceUnavailable:
        return []

    return (data or {}).get("itineraries", [])