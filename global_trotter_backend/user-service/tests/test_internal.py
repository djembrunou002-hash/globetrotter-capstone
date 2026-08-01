from tests.conftest import internal_headers, register_and_get_user


def test_internal_endpoints_reject_missing_key(client):
    assert client.get("/internal/users/usr_whatever").status_code == 403
    assert client.post("/internal/users/batch", json={"ids": []}).status_code == 403
    assert client.get("/internal/users/lookup?email=a@example.com").status_code == 403


def test_internal_endpoints_reject_wrong_key(client):
    resp = client.get("/internal/users/usr_whatever", headers={"X-Internal-Key": "nope"})

    assert resp.status_code == 403


def test_get_user_returns_public_fields_only(client):
    user, _ = register_and_get_user(client, email="a@example.com", name="A")

    resp = client.get(f"/internal/users/{user['id']}", headers=internal_headers())

    assert resp.status_code == 200
    body = resp.get_json()["user"]
    assert body["name"] == "A"
    assert body["email"] == "a@example.com"
    assert "password_hash" not in body


def test_get_unknown_user_returns_404(client):
    resp = client.get("/internal/users/usr_nope", headers=internal_headers())

    assert resp.status_code == 404


def test_batch_returns_only_requested_users(client):
    user_a, _ = register_and_get_user(client, email="a@example.com", name="A")
    user_b, _ = register_and_get_user(client, email="b@example.com", name="B")
    register_and_get_user(client, email="c@example.com", name="C")

    resp = client.post(
        "/internal/users/batch",
        json={"ids": [user_a["id"], user_b["id"], "usr_nope"]},
        headers=internal_headers(),
    )

    assert resp.status_code == 200
    users = resp.get_json()["users"]
    assert set(users) == {user_a["id"], user_b["id"]}
    assert users[user_a["id"]]["name"] == "A"
    assert "password_hash" not in users[user_a["id"]]


def test_batch_with_empty_ids_returns_empty(client):
    resp = client.post("/internal/users/batch", json={"ids": []}, headers=internal_headers())

    assert resp.status_code == 200
    assert resp.get_json()["users"] == {}


def test_lookup_by_email_is_case_insensitive(client):
    user, _ = register_and_get_user(client, email="a@example.com", name="A")

    resp = client.get("/internal/users/lookup?email=A@Example.COM", headers=internal_headers())

    assert resp.status_code == 200
    assert resp.get_json()["user"]["id"] == user["id"]


def test_lookup_by_number(client):
    reg = client.post(
        "/register",
        json={"name": "Phone User", "number": "677123456", "password": "secret123"},
    )
    user_id = reg.get_json()["user"]["id"]

    resp = client.get("/internal/users/lookup?number=%2B237677123456", headers=internal_headers())

    assert resp.status_code == 200
    assert resp.get_json()["user"]["id"] == user_id


def test_lookup_without_params_returns_400(client):
    resp = client.get("/internal/users/lookup", headers=internal_headers())

    assert resp.status_code == 400


def test_lookup_unknown_returns_404(client):
    resp = client.get("/internal/users/lookup?email=nobody@example.com", headers=internal_headers())

    assert resp.status_code == 404


def test_add_and_remove_favorite(client):
    user, _ = register_and_get_user(client, email="a@example.com", name="A")

    add = client.put(
        f"/internal/users/{user['id']}/favorites",
        json={"destination_id": "dest_001", "action": "add"},
        headers=internal_headers(),
    )
    assert add.status_code == 200
    assert add.get_json()["favorites"] == ["dest_001"]

    again = client.put(
        f"/internal/users/{user['id']}/favorites",
        json={"destination_id": "dest_001", "action": "add"},
        headers=internal_headers(),
    )
    assert again.get_json()["favorites"] == ["dest_001"]

    remove = client.put(
        f"/internal/users/{user['id']}/favorites",
        json={"destination_id": "dest_001", "action": "remove"},
        headers=internal_headers(),
    )
    assert remove.status_code == 200
    assert remove.get_json()["favorites"] == []


def test_favorites_rejects_bad_action(client):
    user, _ = register_and_get_user(client, email="a@example.com", name="A")

    resp = client.put(
        f"/internal/users/{user['id']}/favorites",
        json={"destination_id": "dest_001", "action": "toggle"},
        headers=internal_headers(),
    )

    assert resp.status_code == 400


def test_favorites_for_unknown_user_returns_404(client):
    resp = client.put(
        "/internal/users/usr_nope/favorites",
        json={"destination_id": "dest_001", "action": "add"},
        headers=internal_headers(),
    )

    assert resp.status_code == 404