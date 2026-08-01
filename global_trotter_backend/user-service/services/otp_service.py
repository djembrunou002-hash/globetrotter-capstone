import random
from datetime import datetime, timedelta, timezone

from flask import current_app

from services.storage import load_json, save_json

PENDING_FILE = "otp_pending.json"
RESET_FILE = "otp_reset.json"


def _now():
    return datetime.now(timezone.utc)


def _is_expired(expires_at_iso: str) -> bool:
    return _now() > datetime.fromisoformat(expires_at_iso)


def generate_code() -> str:
    return f"{random.randint(0, 999999):06d}"


def _expiry_minutes() -> int:
    return current_app.config.get("OTP_EXPIRY_MINUTES", 10)


def _new_expiry() -> str:
    return (_now() + timedelta(minutes=_expiry_minutes())).isoformat()


def _identifier_fields(identifier):
    """Returns the (email, number) pair used as the lookup key."""
    return identifier.as_user_fields()


# =================================================================
# PENDING REGISTRATIONS  (register -> verify-email)
# =================================================================
def upsert_pending(identifier, name: str, password_hash: str, code: str) -> dict:
    email, number = _identifier_fields(identifier)
    data = load_json(PENDING_FILE)

    data["pending"] = [
        p for p in data["pending"]
        if not (p.get("email") == email and p.get("number") == number)
    ]

    entry = {
        "email": email,
        "number": number,
        "name": name,
        "password_hash": password_hash,
        "code": code,
        "expires_at": _new_expiry(),
        "created_at": _now().isoformat(),
    }
    data["pending"].append(entry)
    save_json(PENDING_FILE, data)
    return entry


def find_pending(identifier) -> dict | None:
    email, number = _identifier_fields(identifier)
    data = load_json(PENDING_FILE)
    return next(
        (p for p in data["pending"] if p.get("email") == email and p.get("number") == number),
        None,
    )


def find_pending_by_code(identifier, code: str) -> dict | None:
    pending = find_pending(identifier)
    if pending and pending["code"] == code:
        return pending
    return None


def update_pending_code(identifier, code: str) -> dict | None:
    email, number = _identifier_fields(identifier)
    data = load_json(PENDING_FILE)
    pending = next(
        (p for p in data["pending"] if p.get("email") == email and p.get("number") == number),
        None,
    )
    if not pending:
        return None
    pending["code"] = code
    pending["expires_at"] = _new_expiry()
    save_json(PENDING_FILE, data)
    return pending


def delete_pending(identifier) -> None:
    email, number = _identifier_fields(identifier)
    data = load_json(PENDING_FILE)
    data["pending"] = [
        p for p in data["pending"]
        if not (p.get("email") == email and p.get("number") == number)
    ]
    save_json(PENDING_FILE, data)


def is_pending_expired(pending: dict) -> bool:
    return _is_expired(pending["expires_at"])


# =================================================================
# PASSWORD RESET CODES
# =================================================================
def upsert_reset(identifier, code: str) -> dict:
    email, number = _identifier_fields(identifier)
    data = load_json(RESET_FILE)

    data["resets"] = [
        r for r in data["resets"]
        if not (r.get("email") == email and r.get("number") == number)
    ]

    entry = {
        "email": email,
        "number": number,
        "code": code,
        "expires_at": _new_expiry(),
        "created_at": _now().isoformat(),
    }
    data["resets"].append(entry)
    save_json(RESET_FILE, data)
    return entry


def find_reset_by_code(identifier, code: str) -> dict | None:
    email, number = _identifier_fields(identifier)
    data = load_json(RESET_FILE)
    return next(
        (r for r in data["resets"]
         if r.get("email") == email and r.get("number") == number and r["code"] == code),
        None,
    )


def delete_reset(identifier) -> None:
    email, number = _identifier_fields(identifier)
    data = load_json(RESET_FILE)
    data["resets"] = [
        r for r in data["resets"]
        if not (r.get("email") == email and r.get("number") == number)
    ]
    save_json(RESET_FILE, data)


def is_reset_expired(reset: dict) -> bool:
    return _is_expired(reset["expires_at"])