import pytest

from tests.conftest import auth_headers, internal_headers, token_for

DEST_MARKET = "dest_001"
DEST_MOUNTAIN = "dest_003"
UNKNOWN_DEST = "dest_does_not_exist"


def test_create_itinerary_requires_auth(client):
    resp = client.post("/itineraries", json={"title": "Trip", "destinations": [DEST_MARKET]})

    assert resp.status_code == 401


def test_create_itinerary_success(client, users):
    token = token_for(client, users.add("Test User", email="test@example.com"))

    resp = client.post(
        "/itineraries",
        json={"title": "Weekend Trip", "destinations": [DEST_MARKET, DEST_MOUNTAIN]},
        headers=auth_headers(token),
    )

    assert resp.status_code == 201
    itinerary = resp.get_json()["itinerary"]
    assert itinerary["title"] == "Weekend Trip"
    assert set(itinerary["destinations"]) == {DEST_MARKET, DEST_MOUNTAIN}
    assert "food" in itinerary["tags"]
    assert "nature" in itinerary["tags"]


def test_create_itinerary_missing_title(client, users):
    token = token_for(client, users.add("Test User"))

    resp = client.post(
        "/itineraries",
        json={"destinations": [DEST_MARKET]},
        headers=auth_headers(token),
    )

    assert resp.status_code == 400


def test_create_itinerary_invalid_destination_id(client, users):
    token = token_for(client, users.add("Test User"))

    resp = client.post(
        "/itineraries",
        json={"title": "Bad Trip", "destinations": [UNKNOWN_DEST]},
        headers=auth_headers(token),
    )

    assert resp.status_code == 400


def test_get_itineraries_only_returns_own(client, users):
    token_a = token_for(client, users.add("A", email="a@example.com"))
    token_b = token_for(client, users.add("B", email="b@example.com"))

    client.post(
        "/itineraries",
        json={"title": "A's Trip", "destinations": [DEST_MARKET]},
        headers=auth_headers(token_a),
    )
    client.post(
        "/itineraries",
        json={"title": "B's Trip", "destinations": [DEST_MOUNTAIN]},
        headers=auth_headers(token_b),
    )

    resp = client.get("/itineraries", headers=auth_headers(token_a))

    assert resp.status_code == 200
    itineraries = resp.get_json()["itineraries"]
    assert len(itineraries) == 1
    assert itineraries[0]["title"] == "A's Trip"


def test_add_destination_to_itinerary(client, users):
    token = token_for(client, users.add("Test User"))

    create_resp = client.post(
        "/itineraries",
        json={"title": "Trip", "destinations": [DEST_MARKET]},
        headers=auth_headers(token),
    )
    itinerary_id = create_resp.get_json()["itinerary"]["id"]

    resp = client.put(
        f"/itineraries/{itinerary_id}/destinations",
        json={"destination_id": DEST_MOUNTAIN, "time": "2026-08-02T10:00:00"},
        headers=auth_headers(token),
    )

    assert resp.status_code == 200
    itinerary = resp.get_json()["itinerary"]
    assert DEST_MOUNTAIN in itinerary["destinations"]
    assert itinerary["destination_times"][DEST_MOUNTAIN] == "2026-08-02T10:00:00"
    assert "nature" in itinerary["tags"]


def test_add_unknown_destination_to_itinerary_returns_404(client, users):
    token = token_for(client, users.add("Test User"))

    create_resp = client.post(
        "/itineraries",
        json={"title": "Trip", "destinations": [DEST_MARKET]},
        headers=auth_headers(token),
    )
    itinerary_id = create_resp.get_json()["itinerary"]["id"]

    resp = client.put(
        f"/itineraries/{itinerary_id}/destinations",
        json={"destination_id": UNKNOWN_DEST},
        headers=auth_headers(token),
    )

    assert resp.status_code == 404


def test_cannot_modify_another_users_itinerary(client, users):
    token_a = token_for(client, users.add("A", email="a@example.com"))
    token_b = token_for(client, users.add("B", email="b@example.com"))

    create_resp = client.post(
        "/itineraries",
        json={"title": "A's Trip", "destinations": [DEST_MARKET]},
        headers=auth_headers(token_a),
    )
    itinerary_id = create_resp.get_json()["itinerary"]["id"]

    resp = client.put(
        f"/itineraries/{itinerary_id}/destinations",
        json={"destination_id": DEST_MOUNTAIN},
        headers=auth_headers(token_b),
    )

    assert resp.status_code == 404


def test_reorder_itinerary(client, users):
    token = token_for(client, users.add("Test User"))

    create_resp = client.post(
        "/itineraries",
        json={"title": "Trip", "destinations": [DEST_MARKET, DEST_MOUNTAIN]},
        headers=auth_headers(token),
    )
    itinerary_id = create_resp.get_json()["itinerary"]["id"]

    resp = client.put(
        f"/itineraries/{itinerary_id}/order",
        json={"destinations": [DEST_MOUNTAIN, DEST_MARKET]},
        headers=auth_headers(token),
    )

    assert resp.status_code == 200
    assert resp.get_json()["itinerary"]["destinations"] == [DEST_MOUNTAIN, DEST_MARKET]


def test_delete_itinerary(client, users):
    token = token_for(client, users.add("Test User"))

    create_resp = client.post(
        "/itineraries",
        json={"title": "Trip", "destinations": [DEST_MARKET]},
        headers=auth_headers(token),
    )
    itinerary_id = create_resp.get_json()["itinerary"]["id"]

    resp = client.delete(f"/itineraries/{itinerary_id}", headers=auth_headers(token))

    assert resp.status_code == 200
    assert client.get("/itineraries", headers=auth_headers(token)).get_json()["itineraries"] == []


def test_destination_service_down_returns_503(client, users, destinations):
    token = token_for(client, users.add("Test User"))
    destinations.available = False

    resp = client.post(
        "/itineraries",
        json={"title": "Trip", "destinations": [DEST_MARKET]},
        headers=auth_headers(token),
    )

    assert resp.status_code == 503


def test_internal_itineraries_requires_key(client, users):
    token = token_for(client, users.add("Test User"))
    client.post(
        "/itineraries",
        json={"title": "Trip", "destinations": [DEST_MARKET]},
        headers=auth_headers(token),
    )

    assert client.get("/internal/itineraries?user_id=whatever").status_code == 403


def test_internal_itineraries_returns_only_that_users_trips(client, users):
    user_a = users.add("A", email="a@example.com")
    user_b = users.add("B", email="b@example.com")

    client.post(
        "/itineraries",
        json={"title": "A's Trip", "destinations": [DEST_MARKET]},
        headers=auth_headers(token_for(client, user_a)),
    )
    client.post(
        "/itineraries",
        json={"title": "B's Trip", "destinations": [DEST_MOUNTAIN]},
        headers=auth_headers(token_for(client, user_b)),
    )

    resp = client.get(f"/internal/itineraries?user_id={user_a['id']}", headers=internal_headers())

    assert resp.status_code == 200
    itineraries = resp.get_json()["itineraries"]
    assert len(itineraries) == 1
    assert itineraries[0]["title"] == "A's Trip"


def test_health(client):
    resp = client.get("/health")

    assert resp.status_code == 200
    assert resp.get_json()["service"] == "itinerary-service"