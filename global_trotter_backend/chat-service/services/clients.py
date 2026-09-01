from config import Config
from services.service_client import ServiceUnavailable, post_json


def fetch_users(user_ids):
    ids = sorted({uid for uid in user_ids if uid})
    if not ids:
        return {}

    try:
        data = post_json(Config.USER_SERVICE_URL, "/internal/users/batch", {"ids": ids})
    except ServiceUnavailable:
        return {}

    return (data or {}).get("users", {})