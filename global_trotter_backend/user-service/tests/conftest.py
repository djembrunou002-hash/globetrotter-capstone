import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import services.storage as storage
from app import create_app


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setattr(storage, "DATA_DIR", str(tmp_path / "data"))
    monkeypatch.setenv("INTERNAL_API_KEY", "test-internal-key")

    app = create_app()
    app.config["TESTING"] = True
    app.config["JWT_SECRET_KEY"] = "test-secret"

    app.config["BREVO_API_KEY"] = ""
    app.config["GOOGLE_CLIENT_ID"] = ""

    return app.test_client()


def register_and_login(client, email="test@example.com", password="pass1234", name="Test User"):
    reg = client.post(
        "/register",
        json={"name": name, "email": email, "password": password},
    )
    code = reg.get_json()["dev_otp"]
    verify = client.post(
        "/verify-email",
        json={"email": email, "code": code},
    )
    return verify.get_json()["token"]


def register_and_get_user(client, email="test@example.com", password="pass1234", name="Test User"):
    reg = client.post(
        "/register",
        json={"name": name, "email": email, "password": password},
    )
    code = reg.get_json()["dev_otp"]
    verify = client.post("/verify-email", json={"email": email, "code": code})
    body = verify.get_json()
    return body["user"], body["token"]


def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


def internal_headers():
    return {"X-Internal-Key": "test-internal-key"}