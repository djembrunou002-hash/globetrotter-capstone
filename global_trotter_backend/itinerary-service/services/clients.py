from config import Config
from services.service_client import ServiceUnavailable, get_json, post_json


def fetch_users(user_ids):
    ids = sorted({uid for uid in user_ids if uid})
    if not ids:
        return {}

    try:
        data = post_json(Config.USER_SERVICE_URL, "/internal/users/batch", {"ids": ids})
    except ServiceUnavailable:
        return {}

    return (data or {}).get("users", {})


def lookup_user(email=None, number=None):
    params = {}
    if email:
        params["email"] = email
    if number:
        params["number"] = number

    data = get_json(Config.USER_SERVICE_URL, "/internal/users/lookup", params=params)
    return data["user"] if data else None


def fetch_destinations(destination_ids):
    ids = [d for d in destination_ids if d]
    if not ids:
        return []

    data = post_json(Config.DESTINATION_SERVICE_URL, "/internal/destinations/batch", {"ids": ids})
    return (data or {}).get("destinations", [])


def fetch_destination(destination_id):
    data = get_json(Config.DESTINATION_SERVICE_URL, f"/internal/destinations/{destination_id}")
    return data["destination"] if data else None