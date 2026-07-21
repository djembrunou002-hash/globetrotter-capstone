from tests.conftest import auth_headers, register_and_login


def test_register_success(client):
    resp = client.post(
        "/register",
        json={"name": "Alice", "email": "alice@example.com", "password": "secret123"},
    )

    assert resp.status_code == 201
    body = resp.get_json()
    assert body["user"]["name"] == "Alice"
    assert body["user"]["email"] == "alice@example.com"
    assert "password_hash" not in body["user"]
    assert body["user"]["favorites"] == []


def test_register_missing_fields(client):
    resp = client.post("/register", json={"name": "Alice"})

    assert resp.status_code == 400


def test_register_duplicate_email_rejected(client):
    client.post(
        "/register",
        json={"name": "Alice", "email": "dup@example.com", "password": "secret123"},
    )
    resp = client.post(
        "/register",
        json={"name": "Bob", "email": "dup@example.com", "password": "otherpass"},
    )

    assert resp.status_code == 409


def test_login_success(client):
    client.post(
        "/register",
        json={"name": "Alice", "email": "alice@example.com", "password": "secret123"},
    )
    resp = client.post("/login", json={"email": "alice@example.com", "password": "secret123"})

    assert resp.status_code == 200
    assert "token" in resp.get_json()


def test_login_wrong_password(client):
    client.post(
        "/register",
        json={"name": "Alice", "email": "alice@example.com", "password": "secret123"},
    )
    resp = client.post("/login", json={"email": "alice@example.com", "password": "wrongpass"})

    assert resp.status_code == 401


def test_login_unknown_user(client):
    resp = client.post("/login", json={"email": "nobody@example.com", "password": "whatever"})

    assert resp.status_code == 401


def test_me_route_no_longer_exists(client):
    token = register_and_login(client)
    resp = client.get("/me", headers=auth_headers(token))

    assert resp.status_code == 404
