import os

import requests

GEOAPIFY_GEOCODE_URL = "https://api.geoapify.com/v1/geocode/autocomplete"
GEOAPIFY_PLACES_URL = "https://api.geoapify.com/v2/places"
GEOAPIFY_ROUTING_URL = "https://api.geoapify.com/v1/routing"

CATEGORY_MAP = {
    "catering.restaurant": "restaurant",
    "catering.cafe": "cafe",
    "catering.fast_food": "restaurant",
    "accommodation.hotel": "hotel",
    "accommodation": "hotel",
    "healthcare.pharmacy": "pharmacy",
    "healthcare.hospital": "hospital",
    "healthcare": "hospital",
    "service.financial.atm": "atm",
    "service.financial": "atm",
    "service.vehicle.fuel": "fuel",
    "public_transport": "transport",
}

DEFAULT_CATEGORIES = [
    "catering.restaurant",
    "catering.cafe",
    "accommodation.hotel",
    "healthcare.pharmacy",
    "healthcare.hospital",
    "service.financial.atm",
    "service.vehicle.fuel",
    "public_transport",
]


def _get_api_key():
    api_key = os.environ.get("GEOAPIFY_API_KEY")
    if not api_key:
        raise RuntimeError("GEOAPIFY_API_KEY is not configured")
    return api_key


def _primary_category(categories_list):
    for cat in categories_list:
        if cat in CATEGORY_MAP:
            return CATEGORY_MAP[cat]
    for cat in categories_list:
        for prefix, label in CATEGORY_MAP.items():
            if cat.startswith(prefix):
                return label
    return "other"


def search_places(text, lat=None, lon=None, limit=5):
    params = {"text": text, "limit": limit, "apiKey": _get_api_key(), "format": "geojson"}
    if lat is not None and lon is not None:
        params["bias"] = f"proximity:{lon},{lat}"

    response = requests.get(GEOAPIFY_GEOCODE_URL, params=params, timeout=10)
    response.raise_for_status()
    data = response.json()

    results = []
    for feature in data.get("features", []):
        props = feature.get("properties", {})
        coordinates = feature.get("geometry", {}).get("coordinates", [])
        if len(coordinates) < 2:
            continue
        results.append({
            "name": props.get("formatted"),
            "lat": coordinates[1],
            "lng": coordinates[0],
        })
    return results


def nearby_places(lat, lng, radius=1200, categories=None, limit=20):
    selected = categories or DEFAULT_CATEGORIES
    params = {
        "categories": ",".join(selected),
        "filter": f"circle:{lng},{lat},{radius}",
        "bias": f"proximity:{lng},{lat}",
        "limit": limit,
        "apiKey": _get_api_key(),
    }

    response = requests.get(GEOAPIFY_PLACES_URL, params=params, timeout=10)
    response.raise_for_status()
    data = response.json()

    results = []
    for feature in data.get("features", []):
        props = feature.get("properties", {})
        coordinates = feature.get("geometry", {}).get("coordinates", [])
        if len(coordinates) < 2:
            continue
        categories_list = props.get("categories", [])
        results.append({
            "name": props.get("name") or props.get("address_line1") or "Unnamed place",
            "lat": coordinates[1],
            "lng": coordinates[0],
            "category": _primary_category(categories_list),
            "address": props.get("address_line2") or props.get("formatted"),
        })
    return results


def get_route(waypoints, mode="drive"):
    waypoints_param = "|".join(f"{lat},{lng}" for lat, lng in waypoints)
    params = {"waypoints": waypoints_param, "mode": mode, "apiKey": _get_api_key()}

    response = requests.get(GEOAPIFY_ROUTING_URL, params=params, timeout=15)
    response.raise_for_status()
    return response.json()