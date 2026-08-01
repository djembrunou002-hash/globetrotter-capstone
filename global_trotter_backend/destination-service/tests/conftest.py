import json
import sys
import uuid
from pathlib import Path

import pytest
from flask_jwt_extended import create_access_token

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import routes.admin as admin_routes
import routes.comments as comment_routes
import routes.destinations as destination_routes
import routes.recommendations as recommendation_routes
import services.auth_helpers as auth_helpers
import services.storage as storage
from app import create_app
from services.service_client import ServiceUnavailable

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
            "description": "Bustling central market known for local produce and crafts.",
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
            "description": "Traditional restaurant showcasing regional Cameroonian cuisine.",
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
            "description": "A forested hill with panoramic views over Yaounde.",
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
            "description": "Upscale dining spot known for its evening ambiance.",
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
            "description": "Wildlife sanctuary home to primates rescued from the bushmeat and pet trades.",
        },
    ]
}


class FakeUserService:
    def __init__(self):
        self._by_id = {}
        self.available = True

    def add(self, name="Test User", email=None, number=None, role="user"):
        user_id = f"usr_{uuid.uuid4().hex[:8]}"
        user = {
            "id": user_id,
            "name": name,
            "email": email,
            "number": number,
            "role": role,
            "verified": True,
            "favorites": [],
            "preferences": {},
        }
        self._by_id[user_id] = user
        return user

    def add_admin(self, name="Admin", email="admin@example.com"):
        return self.add(name=name, email=email, role="admin")

    def get(self, user_id):
        if not self.available:
            raise ServiceUnavailable("user-service is unreachable (simulated)")
        return self._by_id.get(user_id)

    def batch(self, user_ids):
        if not self.available:
            return {}
        return {uid: self._by_id[uid] for uid in set(user_ids) if uid in self._by_id}

    def update_favorite(self, user_id, destination_id, action):
        if not self.available:
            raise ServiceUnavailable("user-service is unreachable (simulated)")

        user = self._by_id.get(user_id)
        if not user:
            return None

        favorites = user.setdefault("favorites", [])
        if action == "add" and destination_id not in favorites:
            favorites.append(destination_id)
        elif action == "remove" and destination_id in favorites:
            favorites.remove(destination_id)

        return list(favorites)


class FakeItineraryService:
    def __init__(self):
        self._by_user = {}
        self.available = True

    def add(self, user_id, destination_ids, title="Trip"):
        itinerary = {
            "id": f"itin_{uuid.uuid4().hex[:8]}",
            "user_id": user_id,
            "title": title,
            "destinations": list(destination_ids),
            "tags": [],
        }
        self._by_user.setdefault(user_id, []).append(itinerary)
        return itinerary

    def for_user(self, user_id):
        if not self.available:
            return []
        return list(self._by_user.get(user_id, []))


@pytest.fixture
def users():
    return FakeUserService()


@pytest.fixture
def itineraries():
    return FakeItineraryService()


@pytest.fixture
def client(tmp_path, monkeypatch, users, itineraries):
    data_dir = tmp_path / "data"
    data_dir.mkdir(parents=True, exist_ok=True)

    with open(data_dir / "destinations.json", "w") as f:
        json.dump(FIXTURE_DESTINATIONS, f, indent=2)
    with open(data_dir / "comments.json", "w") as f:
        json.dump({"comments": []}, f, indent=2)
    with open(data_dir / "destination_requests.json", "w") as f:
        json.dump({"requests": []}, f, indent=2)

    monkeypatch.setattr(storage, "DATA_DIR", str(data_dir))
    monkeypatch.setattr(storage, "UPLOADS_DIR", str(tmp_path / "uploads"))
    monkeypatch.setattr(
        storage, "DESTINATION_IMAGES_DIR", str(tmp_path / "uploads" / "destinations")
    )
    monkeypatch.setenv("INTERNAL_API_KEY", "test-internal-key")

    monkeypatch.setattr(auth_helpers, "fetch_user", users.get)
    monkeypatch.setattr(destination_routes, "fetch_user", users.get)
    monkeypatch.setattr(destination_routes, "update_favorite", users.update_favorite)
    monkeypatch.setattr(comment_routes, "fetch_users", users.batch)
    monkeypatch.setattr(admin_routes, "fetch_users", users.batch)
    monkeypatch.setattr(recommendation_routes, "fetch_user", users.get)
    monkeypatch.setattr(recommendation_routes, "fetch_user_itineraries", itineraries.for_user)

    app = create_app()
    app.config["TESTING"] = True
    app.config["JWT_SECRET_KEY"] = "test-secret"

    return app.test_client()


def token_for(client, user):
    with client.application.app_context():
        return create_access_token(identity=user["id"])


def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


def internal_headers():
    return {"X-Internal-Key": "test-internal-key"}