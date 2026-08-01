import json
import os
import threading

_lock = threading.Lock()

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
UPLOADS_DIR = os.path.join(BASE_DIR, "uploads")
DESTINATION_IMAGES_DIR = os.path.join(UPLOADS_DIR, "destinations")

EMPTY_SCHEMAS = {
    "users.json": {"users": []},
    "otp_pending.json": {"pending": []},
    "otp_reset.json": {"resets": []},
    "itineraries.json": {"itineraries": []},
    "destinations.json": {"destinations": []},
    "comments.json": {"comments": []},
    "destination_requests.json": {"requests": []},
}


def _path(filename):
    return os.path.join(DATA_DIR, filename)


def _ensure_exists(filename):
    path = _path(filename)
    if os.path.exists(path):
        return

    schema = EMPTY_SCHEMAS.get(filename)
    if schema is None:
        raise FileNotFoundError(f"{path} is missing and has no known empty schema")

    os.makedirs(DATA_DIR, exist_ok=True)
    with open(path, "w") as f:
        json.dump(schema, f, indent=2)


def load_json(filename):
    with _lock:
        _ensure_exists(filename)
        with open(_path(filename), "r") as f:
            return json.load(f)


def save_json(filename, data):
    with _lock:
        os.makedirs(DATA_DIR, exist_ok=True)
        with open(_path(filename), "w") as f:
            json.dump(data, f, indent=2)