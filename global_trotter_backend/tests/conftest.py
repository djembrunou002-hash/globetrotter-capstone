import shutil
import sys
from pathlib import Path

import pytest

# Make the project root importable when running `pytest` from the project root
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import services.storage as storage
from app import create_app


@pytest.fixture
def client(tmp_path, monkeypatch):
    """
    Flask test client backed by a throwaway copy of data/.

    Copies the real data/ folder into a temp directory and points
    storage.DATA_DIR at it, so tests never touch the real JSON files
    and each test starts from a known, disposable snapshot.
    """
    project_root = Path(__file__).resolve().parent.parent
    tmp_data_dir = tmp_path / "data"
    shutil.copytree(project_root / "data", tmp_data_dir)

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
