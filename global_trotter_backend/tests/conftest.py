import json
import shutil
import sys
from pathlib import Path

import pytest


sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import services.storage as storage
from app import create_app

# Fixed destination fixtures used by the test suite. Tests should NEVER
# depend on the real data/destinations.json content, since that file is
# expected to grow/change as more destinations are added to the app.

FIXTURE_DESTINATIONS = {
    "destinations": [
        {
            "id": "dest_001",
            "name": "Marche Central",
            "country": "Cameroon",
            "region": "Centre",
            "area": "Centre-ville",
            "type": "market",
            "tags": ["food", "shopping", "local"],
            "budget_level": "low",
            "location": {"lat": 3.8667, "lng": 11.5167, "address": "Centre-ville, Yaounde"},
            "rating": {"average": 4.3, "count": 56},
            "images": ["https://cdn.globetrotter.com/dest_001/main.jpg"],
            "last_updated": "2026-07-10T09:00:00Z",
            "description": "Bustling central market known for local produce and crafts."
        },
        {
            "id": "dest_002",
            "name": "Le Bantoo Village",
            "country": "Cameroon",
            "region": "Centre",
            "area": "Nkolbisson",
            "type": "restaurant",
            "tags": ["food", "culture"],
            "budget_level": "medium",
            "location": {"lat": 3.87, "lng": 11.47, "address": "Nkolbisson, Yaounde"},
            "rating": {"average": 4.5, "count": 97},
            "images": ["https://cdn.globetrotter.com/dest_002/main.jpg"],
            "last_updated": "2026-07-10T09:00:00Z",
            "description": "Traditional restaurant showcasing regional Cameroonian cuisine."
        },
        {
            "id": "dest_003",
            "name": "Mont Febe",
            "country": "Cameroon",
            "region": "Centre",
            "area": "Bastos",
            "type": "nature",
            "tags": ["nature", "hiking", "viewpoint"],
            "budget_level": "low",
            "location": {"lat": 3.9, "lng": 11.53, "address": "Bastos, Yaounde"},
            "rating": {"average": 4.4, "count": 63},
            "images": ["https://cdn.globetrotter.com/dest_003/main.jpg"],
            "last_updated": "2026-07-10T09:00:00Z",
            "description": "A forested hill with panoramic views over Yaounde."
        },
        {
            "id": "dest_004",
            "name": "Restaurant Le Sultan",
            "country": "Cameroon",
            "region": "Centre",
            "area": "Bastos",
            "type": "restaurant",
            "tags": ["food", "urban"],
            "budget_level": "high",
            "location": {"lat": 3.89, "lng": 11.52, "address": "Bastos, Yaounde"},
            "rating": {"average": 4.1, "count": 41},
            "images": ["https://cdn.globetrotter.com/dest_004/main.jpg"],
            "last_updated": "2026-07-10T09:00:00Z",
            "description": "Upscale dining spot known for its evening ambiance."
        },
        {
            "id": "dest_005",
            "name": "Parc National de Mefou",
            "country": "Cameroon",
            "region": "Centre",
            "area": "Mfou",
            "type": "park",
            "tags": ["nature", "wildlife", "family"],
            "budget_level": "medium",
            "location": {"lat": 3.62, "lng": 11.65, "address": "Mfou, Centre"},
            "rating": {"average": 4.6, "count": 88},
            "images": ["https://cdn.globetrotter.com/dest_005/main.jpg"],
            "last_updated": "2026-07-10T09:00:00Z",
            "description": "Wildlife sanctuary home to primates rescued from the bushmeat and pet trades."
        }
    ]
}


@pytest.fixture
def client(tmp_path, monkeypatch):
    """
    Flask test client backed by a throwaway copy of data/.

    Copies the real data/ folder into a temp directory and points
    storage.DATA_DIR at it, so tests never touch the real JSON files
    and each test starts from a known, disposable snapshot.

    destinations.json and comments.json are then overwritten with fixed,
    empty/known fixture state (see FIXTURE_DESTINATIONS above), so tests
    never break just because the real seed/dev data grows or changes.
    """
    project_root = Path(__file__).resolve().parent.parent
    tmp_data_dir = tmp_path / "data"
    shutil.copytree(project_root / "data", tmp_data_dir)

    with open(tmp_data_dir / "destinations.json", "w") as f:
        json.dump(FIXTURE_DESTINATIONS, f, indent=2)

    with open(tmp_data_dir / "comments.json", "w") as f:
        json.dump({"comments": []}, f, indent=2)

    monkeypatch.setattr(storage, "DATA_DIR", str(tmp_data_dir))

    app = create_app()
    app.config["TESTING"] = True
    return app.test_client()


def register_and_login(client, email="test@example.com", password="pass1234", name="Test User"):
    """Helper: register a fresh user and return their JWT token."""
    client.post(
        "/register",
        json={"name": name, "email": email, "password": password},
    )
    resp = client.post("/login", json={"email": email, "password": password})
    return resp.get_json()["token"]


def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}