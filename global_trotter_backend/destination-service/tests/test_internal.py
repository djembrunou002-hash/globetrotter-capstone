from tests.conftest import auth_headers, internal_headers, token_for

DEST_MARKET = "dest_001"
DEST_MOUNTAIN = "dest_003"


def test_internal_endpoints_reject_missing_key(client):
    assert client.get(f"/internal/destinations/{DEST_MARKET}").status_code == 403
    assert client.post("/internal/destinations/batch", json={"ids": []}).status_code == 403


def test_internal_endpoints_reject_wrong_key(client):
    resp = client.get(f"/internal/destinations/{DEST_MARKET}", headers={"X-Internal-Key": "nope"})

    assert resp.status_code == 403


def test_get_destination_returns_tags(client):
    resp = client.get(f"/internal/destinations/{DEST_MOUNTAIN}", headers=internal_headers())

    assert resp.status_code == 200
    destination = resp.get_json()["destination"]
    assert destination["id"] == DEST_MOUNTAIN
    assert "nature" in destination["tags"]


def test_get_unknown_destination_returns_404(client):
    resp = client.get("/internal/destinations/dest_nope", headers=internal_headers())

    assert resp.status_code == 404


def test_batch_returns_only_requested_destinations(client):
    resp = client.post(
        "/internal/destinations/batch",
        json={"ids": [DEST_MARKET, DEST_MOUNTAIN, "dest_nope"]},
        headers=internal_headers(),
    )

    assert resp.status_code == 200
    ids = {d["id"] for d in resp.get_json()["destinations"]}
    assert ids == {DEST_MARKET, DEST_MOUNTAIN}


def test_batch_with_empty_ids_returns_empty(client):
    resp = client.post("/internal/destinations/batch", json={"ids": []}, headers=internal_headers())

    assert resp.status_code == 200
    assert resp.get_json()["destinations"] == []


def test_comment_author_degrades_when_user_service_is_down(client, users):
    token = token_for(client, users.add("Ada", email="ada@example.com"))

    client.post(
        f"/destinations/{DEST_MARKET}/comments",
        json={"text": "Lovely spot"},
        headers=auth_headers(token),
    )

    users.available = False

    resp = client.get(f"/destinations/{DEST_MARKET}/comments")

    assert resp.status_code == 200
    comments = resp.get_json()["comments"]
    assert len(comments) == 1
    assert comments[0]["author"]["name"] == "Traveler"
    assert comments[0]["text"] == "Lovely spot"


def test_favorite_returns_503_when_user_service_is_down(client, users):
    token = token_for(client, users.add("Test User"))
    users.available = False

    resp = client.post(f"/destinations/{DEST_MARKET}/favorite", headers=auth_headers(token))

    assert resp.status_code == 503


def test_admin_requests_requires_admin_role(client, users):
    token = token_for(client, users.add("Regular User"))

    resp = client.get("/admin/requests", headers=auth_headers(token))

    assert resp.status_code == 403


def test_admin_requests_allows_admin(client, users):
    token = token_for(client, users.add_admin())

    resp = client.get("/admin/requests", headers=auth_headers(token))

    assert resp.status_code == 200
    assert resp.get_json()["requests"] == []


def test_health(client):
    resp = client.get("/health")

    assert resp.status_code == 200
    assert resp.get_json()["service"] == "destination-service"