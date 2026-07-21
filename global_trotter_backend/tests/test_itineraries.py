from tests.conftest import auth_headers, register_and_login

DEST_MARKET = "dest_001"      # tags: food, shopping, local
DEST_MOUNTAIN = "dest_003"    # tags: nature, hiking, viewpoint
UNKNOWN_DEST = "dest_does_not_exist"


def test_create_itinerary_requires_auth(client):
    resp = client.post("/itineraries", json={"title": "Trip", "destinations": [DEST_MARKET]})

    assert resp.status_code == 401


def test_create_itinerary_success(client):
    token = register_and_login(client)

    resp = client.post(
        "/itineraries",
        json={"title": "Weekend Trip", "destinations": [DEST_MARKET, DEST_MOUNTAIN]},
        headers=auth_headers(token),
    )

    assert resp.status_code == 201
    itinerary = resp.get_json()["itinerary"]
    assert itinerary["title"] == "Weekend Trip"
    assert set(itinerary["destinations"]) == {DEST_MARKET, DEST_MOUNTAIN}
    # tags should be the union of both destinations' tags
    assert "food" in itinerary["tags"]
    assert "nature" in itinerary["tags"]


def test_create_itinerary_missing_title(client):
    token = register_and_login(client)

    resp = client.post(
        "/itineraries",
        json={"destinations": [DEST_MARKET]},
        headers=auth_headers(token),
    )

    assert resp.status_code == 400


def test_create_itinerary_invalid_destination_id(client):
    token = register_and_login(client)

    resp = client.post(
        "/itineraries",
        json={"title": "Bad Trip", "destinations": [UNKNOWN_DEST]},
        headers=auth_headers(token),
    )

    assert resp.status_code == 400


def test_get_itineraries_only_returns_own(client):
    token_a = register_and_login(client, email="a@example.com", name="A")
    token_b = register_and_login(client, email="b@example.com", name="B")

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


def test_add_destination_to_itinerary(client):
    token = register_and_login(client)

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


def test_add_unknown_destination_to_itinerary_returns_404(client):
    token = register_and_login(client)

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


def test_cannot_modify_another_users_itinerary(client):
    token_a = register_and_login(client, email="a@example.com", name="A")
    token_b = register_and_login(client, email="b@example.com", name="B")

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
