from flask import request

from config import Config


def public_base_url():
    forwarded = request.headers.get("X-Gateway-Public-Url")
    if forwarded:
        return forwarded.rstrip("/")
    if Config.PUBLIC_BASE_URL:
        return Config.PUBLIC_BASE_URL.rstrip("/")
    return request.host_url.rstrip("/")


def absolute_images(images):
    base = public_base_url()
    return [
        img if img.startswith("http://") or img.startswith("https://") else f"{base}{img}"
        for img in images or []
    ]