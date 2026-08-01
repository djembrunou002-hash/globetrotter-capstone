from tests.conftest import auth_headers, token_for

DEST_MARKET = "dest_001"


def _create_trip(client, token, title="A's Trip"):
    resp = client.post(
        "/itineraries",
        json={"title": title, "destinations": [DEST_MARKET]},
        headers=auth_headers(token),
    )
    return resp.get_json()["itinerary"]["id"]


def test_share_itinerary_requires_auth(client):
    resp = client.post("/itineraries/itin_fake/share", json={"email": "b@example.com"})

    assert resp.status_code == 401


def test_share_itinerary_by_email_grants_access_to_target(client, users):
    token_a = token_for(client, users.add("A", email="a@example.com"))
    token_b = token_for(client, users.add("B", email="b@example.com"))

    itinerary_id = _create_trip(client, token_a)

    share_resp = client.post(
        f"/itineraries/{itinerary_id}/share",
        json={"email": "b@example.com"},
        headers=auth_headers(token_a),
    )

    assert share_resp.status_code == 200
    assert share_resp.get_json()["shared_user"]["name"] == "B"

    list_resp = client.get("/itineraries", headers=auth_headers(token_b))
    itineraries = list_resp.get_json()["itineraries"]
    assert len(itineraries) == 1
    assert itineraries[0]["id"] == itinerary_id
    assert itineraries[0]["is_owner"] is False
    assert itineraries[0]["owner_name"] == "A"


def test_share_itinerary_with_unknown_contact_returns_404(client, users):
    token_a = token_for(client, users.add("A", email="a@example.com"))
    itinerary_id = _create_trip(client, token_a)

    resp = client.post(
        f"/itineraries/{itinerary_id}/share",
        json={"email": "nobody@example.com"},
        headers=auth_headers(token_a),
    )

    assert resp.status_code == 404


def test_cannot_share_itinerary_you_do_not_own(client, users):
    token_a = token_for(client, users.add("A", email="a@example.com"))
    token_b = token_for(client, users.add("B", email="b@example.com"))
    users.add("C", email="c@example.com")

    itinerary_id = _create_trip(client, token_a)

    resp = client.post(
        f"/itineraries/{itinerary_id}/share",
        json={"email": "c@example.com"},
        headers=auth_headers(token_b),
    )

    assert resp.status_code == 404


def test_cannot_share_itinerary_with_yourself(client, users):
    token_a = token_for(client, users.add("A", email="a@example.com"))
    itinerary_id = _create_trip(client, token_a)

    resp = client.post(
        f"/itineraries/{itinerary_id}/share",
        json={"email": "a@example.com"},
        headers=auth_headers(token_a),
    )

    assert resp.status_code == 400


def test_sharing_same_user_twice_returns_conflict(client, users):
    token_a = token_for(client, users.add("A", email="a@example.com"))
    users.add("B", email="b@example.com")

    itinerary_id = _create_trip(client, token_a)

    client.post(
        f"/itineraries/{itinerary_id}/share",
        json={"email": "b@example.com"},
        headers=auth_headers(token_a),
    )
    resp = client.post(
        f"/itineraries/{itinerary_id}/share",
        json={"email": "b@example.com"},
        headers=auth_headers(token_a),
    )

    assert resp.status_code == 409


def test_share_by_number(client, users):
    token_a = token_for(client, users.add("A", email="a@example.com"))
    users.add("B", number="655443322")

    itinerary_id = _create_trip(client, token_a)

    resp = client.post(
        f"/itineraries/{itinerary_id}/share",
        json={"number": "655443322"},
        headers=auth_headers(token_a),
    )

    assert resp.status_code == 200
    assert resp.get_json()["shared_user"]["name"] == "B"


def test_unshare_removes_access(client, users):
    token_a = token_for(client, users.add("A", email="a@example.com"))
    token_b = token_for(client, users.add("B", email="b@example.com"))

    itinerary_id = _create_trip(client, token_a)

    share_resp = client.post(
        f"/itineraries/{itinerary_id}/share",
        json={"email": "b@example.com"},
        headers=auth_headers(token_a),
    )
    shared_user_id = share_resp.get_json()["shared_user"]["id"]

    unshare_resp = client.delete(
        f"/itineraries/{itinerary_id}/share/{shared_user_id}",
        headers=auth_headers(token_a),
    )
    assert unshare_resp.status_code == 200

    list_resp = client.get("/itineraries", headers=auth_headers(token_b))
    assert list_resp.get_json()["itineraries"] == []


def test_list_shared_users(client, users):
    token_a = token_for(client, users.add("A", email="a@example.com"))
    users.add("B", email="b@example.com")

    itinerary_id = _create_trip(client, token_a)

    client.post(
        f"/itineraries/{itinerary_id}/share",
        json={"email": "b@example.com"},
        headers=auth_headers(token_a),
    )

    resp = client.get(f"/itineraries/{itinerary_id}/shared-users", headers=auth_headers(token_a))

    assert resp.status_code == 200
    shared_users = resp.get_json()["shared_users"]
    assert len(shared_users) == 1
    assert shared_users[0]["name"] == "B"


def test_share_returns_503_when_user_service_is_down(client, users):
    token_a = token_for(client, users.add("A", email="a@example.com"))
    users.add("B", email="b@example.com")

    itinerary_id = _create_trip(client, token_a)
    users.available = False

    resp = client.post(
        f"/itineraries/{itinerary_id}/share",
        json={"email": "b@example.com"},
        headers=auth_headers(token_a),
    )

    assert resp.status_code == 503


def test_owner_name_degrades_when_user_service_is_down(client, users):
    token_a = token_for(client, users.add("A", email="a@example.com"))
    user_b = users.add("B", email="b@example.com")
    token_b = token_for(client, user_b)

    itinerary_id = _create_trip(client, token_a)
    client.post(
        f"/itineraries/{itinerary_id}/share",
        json={"email": "b@example.com"},
        headers=auth_headers(token_a),
    )

    users.available = False

    resp = client.get("/itineraries", headers=auth_headers(token_b))

    assert resp.status_code == 200
    itineraries = resp.get_json()["itineraries"]
    assert len(itineraries) == 1
    assert itineraries[0]["owner_name"] == "Unknown"