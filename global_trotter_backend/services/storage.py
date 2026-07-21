import json
import os
import threading

_lock = threading.Lock()

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")


def _path(filename):
    return os.path.join(DATA_DIR, filename)


def load_json(filename):
    with _lock:
        with open(_path(filename), "r") as f:
            return json.load(f)


def save_json(filename, data):
    with _lock:
        with open(_path(filename), "w") as f:
            json.dump(data, f, indent=2)