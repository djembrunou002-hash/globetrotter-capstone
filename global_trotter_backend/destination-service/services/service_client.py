import os
from functools import wraps

import requests
from flask import jsonify, request

INTERNAL_KEY_HEADER = "X-Internal-Key"
DEFAULT_TIMEOUT = float(os.environ.get("INTERNAL_TIMEOUT", "5"))


class ServiceUnavailable(Exception):
    pass


def _internal_key():
    return os.environ.get("INTERNAL_API_KEY", "dev-internal-key")


def internal_only(view):
    @wraps(view)
    def wrapper(*args, **kwargs):
        if request.headers.get(INTERNAL_KEY_HEADER) != _internal_key():
            return jsonify({"error": "this endpoint is only callable between services"}), 403
        return view(*args, **kwargs)

    return wrapper


def _request(method, base_url, path, **kwargs):
    url = f"{base_url.rstrip('/')}{path}"
    headers = {INTERNAL_KEY_HEADER: _internal_key()}

    try:
        response = requests.request(method, url, headers=headers, timeout=DEFAULT_TIMEOUT, **kwargs)
    except requests.RequestException as err:
        raise ServiceUnavailable(f"{url} is unreachable ({err})") from err

    if response.status_code == 404:
        return None
    if response.status_code >= 500:
        raise ServiceUnavailable(f"{url} returned {response.status_code}")

    try:
        return response.json()
    except ValueError as err:
        raise ServiceUnavailable(f"{url} returned a non-JSON body") from err


def get_json(base_url, path, params=None):
    return _request("GET", base_url, path, params=params)


def post_json(base_url, path, payload=None):
    return _request("POST", base_url, path, json=payload or {})


def put_json(base_url, path, payload=None):
    return _request("PUT", base_url, path, json=payload or {})