import json
import uuid
from datetime import datetime, timezone

from services.images import is_allowed_image, save_destination_image, delete_destination_image
from services.storage import load_json, save_json

REQUESTS_FILE = "destination_requests.json"
DESTINATIONS_FILE = "destinations.json"


def _now():
    return datetime.now(timezone.utc).isoformat()


def load_requests():
    return load_json(REQUESTS_FILE)["requests"]


def save_requests(requests):
    save_json(REQUESTS_FILE, {"requests": requests})


def find_request(request_id):
    requests = load_requests()
    return next((r for r in requests if r["id"] == request_id), None), requests


def _bool_field(form, key, default=False):
    value = form.get(key)
    if value is None:
        return default
    return str(value).strip().lower() in ("true", "1", "yes", "on")


def _float_field(form, key):
    value = form.get(key)
    if value is None or value == "":
        return None
    try:
        return float(value)
    except ValueError:
        return None


def parse_destination_form(form, files, existing=None):
    existing = existing or {}
    errors = []

    def text(key, required=False, default=""):
        raw = form.get(key)
        value = raw.strip() if isinstance(raw, str) else raw
        if not value:
            value = existing.get(key, default)
        if required and not value:
            errors.append(f"{key} is required")
        return value

    name = text("name", required=True)
    country = text("country", required=True)
    region = text("region", required=True)
    area = text("area", required=True)
    place_type = text("type", required=True)
    budget_level = text("budget_level", required=True)
    description = text("description")
    advice = text("advice")

    tags_raw = form.get("tags")
    if tags_raw is not None:
        tags = [t.strip().lower() for t in tags_raw.split(",") if t.strip()]
    else:
        tags = existing.get("tags", [])

    existing_budget = existing.get("budget", {})
    budget = {
        "is_free": _bool_field(form, "budget_is_free", existing_budget.get("is_free", False)),
        "amount_label": form.get("budget_amount_label", existing_budget.get("amount_label", "")).strip()
        if form.get("budget_amount_label") is not None
        else existing_budget.get("amount_label", ""),
        "note": form.get("budget_note", existing_budget.get("note", "")).strip()
        if form.get("budget_note") is not None
        else existing_budget.get("note", ""),
    }

    existing_hours = existing.get("hours", {})
    hours = {
        "always_open": _bool_field(form, "hours_always_open", existing_hours.get("always_open", False)),
        "open": form.get("hours_open", existing_hours.get("open", "")).strip()
        if form.get("hours_open") is not None
        else existing_hours.get("open", ""),
        "close": form.get("hours_close", existing_hours.get("close", "")).strip()
        if form.get("hours_close") is not None
        else existing_hours.get("close", ""),
        "note": form.get("hours_note", existing_hours.get("note", "")).strip()
        if form.get("hours_note") is not None
        else existing_hours.get("note", ""),
    }

    existing_location = existing.get("location", {})
    lat = _float_field(form, "location_lat")
    lng = _float_field(form, "location_lng")
    location = {
        "lat": lat if lat is not None else existing_location.get("lat"),
        "lng": lng if lng is not None else existing_location.get("lng"),
        "address": form.get("location_address", existing_location.get("address", "")).strip()
        if form.get("location_address") is not None
        else existing_location.get("address", ""),
    }

    existing_contact = existing.get("contact", {})
    contact = {
        "phone": form.get("contact_phone", existing_contact.get("phone", "")).strip()
        if form.get("contact_phone") is not None
        else existing_contact.get("phone", ""),
        "email": form.get("contact_email", existing_contact.get("email", "")).strip()
        if form.get("contact_email") is not None
        else existing_contact.get("email", ""),
    }
    contact = {
        "phone": contact["phone"] or None,
        "email": contact["email"] or None,
    }

    nearby_services = existing.get("nearby_services", [])
    nearby_raw = form.get("nearby_services")
    if nearby_raw:
        try:
            parsed = json.loads(nearby_raw)
            if isinstance(parsed, list):
                nearby_services = [
                    {"name": item.get("name", ""), "type": item.get("type", "")}
                    for item in parsed
                    if isinstance(item, dict) and item.get("name")
                ]
        except (ValueError, TypeError):
            errors.append("nearby_services must be valid JSON")

    existing_images = existing.get("images", [None, None, None, None])
    existing_images = (existing_images + [None, None, None, None])[:4]
    images = list(existing_images)
    for index in range(4):
        field_name = f"image_{index + 1}"
        uploaded = files.get(field_name)
        if uploaded and uploaded.filename:
            if not is_allowed_image(uploaded):
                errors.append(f"{field_name} must be a jpg, jpeg, png, or webp file")
                continue
            images[index] = save_destination_image(uploaded)

    if not images[0]:
        errors.append("A principal image is required")

    payload = {
        "name": name,
        "country": country,
        "region": region,
        "area": area,
        "type": place_type,
        "tags": tags,
        "budget_level": budget_level,
        "budget": budget,
        "hours": hours,
        "location": location,
        "images": [img for img in images if img],
        "nearby_services": nearby_services,
        "contact": contact,
        "advice": advice,
        "description": description,
    }

    return payload, errors


def create_request(request_type, submitted_by, payload, destination_id=None):
    requests = load_requests()
    request_obj = {
        "id": f"req_{uuid.uuid4().hex[:10]}",
        "type": request_type,
        "status": "pending",
        "destination_id": destination_id,
        "submitted_by": submitted_by,
        "payload": payload,
        "created_at": _now(),
        "reviewed_at": None,
        "admin_note": None,
    }
    requests.append(request_obj)
    save_requests(requests)
    return request_obj


def create_admin_action_request(request_type, destination, admin_id):
    """Record a direct admin edit/delete so the owner sees a notification.

    Admin edits/deletes on a spot apply immediately (no review needed), but the
    owner still needs to find out. We piggyback on the existing request model:
    an already-"approved" request is created so `/my-destinations` picks it up
    the same way it already does for approved user-submitted delete requests.
    """
    requests = load_requests()
    request_obj = {
        "id": f"req_{uuid.uuid4().hex[:10]}",
        "type": request_type,
        "status": "approved",
        "destination_id": destination["id"],
        "submitted_by": destination.get("owner_id"),
        "payload": dict(destination),
        "created_at": _now(),
        "reviewed_at": _now(),
        "reviewed_by": admin_id,
        "admin_action": True,
        "admin_note": None,
    }
    requests.append(request_obj)
    save_requests(requests)
    return request_obj


def has_pending_request_for_destination(destination_id, request_type=None):
    requests = load_requests()
    return any(
        r["destination_id"] == destination_id
        and r["status"] == "pending"
        and (request_type is None or r["type"] == request_type)
        for r in requests
    )


def approve_request(request_obj):
    data = load_json(DESTINATIONS_FILE)
    destinations = data["destinations"]

    if request_obj["type"] == "create":
        new_id = f"dest_{uuid.uuid4().hex[:8]}"
        destination = {
            "id": new_id,
            **request_obj["payload"],
            "rating": {"average": 0, "count": 0},
            "last_updated": _now(),
            "owner_id": request_obj["submitted_by"],
        }
        destinations.append(destination)
        save_json(DESTINATIONS_FILE, data)
        request_obj["destination_id"] = new_id

    elif request_obj["type"] == "edit":
        destination = next((d for d in destinations if d["id"] == request_obj["destination_id"]), None)
        if destination:
            destination.update(request_obj["payload"])
            destination["last_updated"] = _now()
            save_json(DESTINATIONS_FILE, data)

    elif request_obj["type"] == "delete":
        destination = next((d for d in destinations if d["id"] == request_obj["destination_id"]), None)
        if destination:
            for image in destination.get("images", []):
                delete_destination_image(image)
            data["destinations"] = [d for d in destinations if d["id"] != request_obj["destination_id"]]
            save_json(DESTINATIONS_FILE, data)

    request_obj["status"] = "approved"
    request_obj["reviewed_at"] = _now()
    _persist_request(request_obj)
    return request_obj


def reject_request(request_obj, note=None):
    request_obj["status"] = "rejected"
    request_obj["reviewed_at"] = _now()
    if note is not None:
        request_obj["admin_note"] = note
    _persist_request(request_obj)
    return request_obj


def set_admin_note(request_obj, note):
    request_obj["admin_note"] = note or None
    _persist_request(request_obj)
    return request_obj


def update_pending_payload(request_obj, payload):
    request_obj["payload"] = payload
    _persist_request(request_obj)
    return request_obj


def delete_request(request_id):
    requests = load_requests()
    remaining = [r for r in requests if r["id"] != request_id]
    save_requests(remaining)


def _persist_request(request_obj):
    requests = load_requests()
    for index, existing in enumerate(requests):
        if existing["id"] == request_obj["id"]:
            requests[index] = request_obj
            break
    save_requests(requests)