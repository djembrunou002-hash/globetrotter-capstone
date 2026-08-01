import sys
import uuid
from pathlib import Path

import pytest
from flask_jwt_extended import create_access_token

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import routes.itineraries as itinerary_routes
import services.storage as storage
from app import create_app
from services.service_client import ServiceUnavailable

FIXTURE_DESTINATIONS = [
    {
        "id": "dest_001",
        "name": "Marche Central",
        "tags": ["food", "shopping", "local"],
        "budget_level": "low",
    },
    {
        "id": "dest_002",
        "name": "Le Bantoo Village",
        "tags": ["food", "culture"],
        "budget_level": "medium",
    },
    {
        "id": "dest_003",
        "name": "Mont Febe",
        "tags": ["nature", "hiking", "viewpoint"],
        "budget_level": "low",
    },
]


class FakeUserService:
    def __init__(self):
        self._by_id = {}
        self.available = True

    def add(self, name, email=None, number=None):
        user_id = f"usr_{uuid.uuid4().hex[:8]}"
        user = {
            "id": user_id,
            "name": name,
            "email": email,
            "number": number,
            "role": "user",
            "favorites": [],
            "preferences": {},
        }
        self._by_id[user_id] = user
        return user

    def batch(self, user_ids):
        if not self.available:
            return {}
        return {uid: self._by_id[uid] for uid in set(user_ids) if uid in self._by_id}

    def lookup(self, email=None, number=None):
        if not self.available:
            raise ServiceUnavailable("user-service is unreachable (simulated)")
        for user in self._by_id.values():
            if email and (user.get("email") or "").lower() == email.lower():
                return user
            if number and user.get("number") == number:
                return user
        return None


class FakeDestinationService:
    def __init__(self, destinations):
        self._by_id = {d["id"]: d for d in destinations}
        self.available = True

    def batch(self, destination_ids):
        if not self.available:
            raise ServiceUnavailable("destination-service is unreachable (simulated)")
        return [self._by_id[d] for d in destination_ids if d in self._by_id]

    def get(self, destination_id):
        if not self.available:
            raise ServiceUnavailable("destination-service is unreachable (simulated)")
        return self._by_id.get(destination_id)


@pytest.fixture
def users():
    return FakeUserService()


@pytest.fixture
def destinations():
    return FakeDestinationService(FIXTURE_DESTINATIONS)


@pytest.fixture
def client(tmp_path, monkeypatch, users, destinations):
    monkeypatch.setattr(storage, "DATA_DIR", str(tmp_path / "data"))
    monkeypatch.setenv("INTERNAL_API_KEY", "test-internal-key")

    monkeypatch.setattr(itinerary_routes, "fetch_users", users.batch)
    monkeypatch.setattr(
        itinerary_routes,
        "lookup_user",
        lambda email=None, number=None: users.lookup(email=email, number=number),
    )
    monkeypatch.setattr(itinerary_routes, "fetch_destinations", destinations.batch)
    monkeypatch.setattr(itinerary_routes, "fetch_destination", destinations.get)

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