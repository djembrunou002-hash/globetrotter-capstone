from tests.conftest import auth_headers, internal_headers, register_and_get_user, register_and_login


def test_update_preferences_requires_auth(client):
    resp = client.put("/users/preferences", json={"travel_style": ["nature"]})

    assert resp.status_code == 401


def test_update_preferences_success(client):
    token = register_and_login(client)

    resp = client.put(
        "/users/preferences",
        json={"travel_style": ["Nature", "food", "  Nature  "]},
        headers=auth_headers(token),
    )

    assert resp.status_code == 200
    user = resp.get_json()["user"]
    assert user["preferences"]["travel_style"] == ["food", "nature"]
    assert "password_hash" not in user


def test_update_preferences_rejects_non_list(client):
    token = register_and_login(client)

    resp = client.put(
        "/users/preferences",
        json={"travel_style": "nature"},
        headers=auth_headers(token),
    )

    assert resp.status_code == 400


def test_preferences_visible_to_other_services(client):
    user, token = register_and_get_user(client, email="a@example.com", name="A")

    client.put(
        "/users/preferences",
        json={"travel_style": ["nature"]},
        headers=auth_headers(token),
    )

    resp = client.get(f"/internal/users/{user['id']}", headers=internal_headers())

    assert resp.get_json()["user"]["preferences"]["travel_style"] == ["nature"]


def test_health(client):
    resp = client.get("/health")

    assert resp.status_code == 200
    assert resp.get_json()["service"] == "user-service"