from tests.conftest import auth_headers, register_and_login

DEST_MARKET = "dest_001"


def test_share_itinerary_requires_auth(client):
    resp = client.post("/itineraries/itin_fake/share", json={"email": "b@example.com"})
    assert resp.status_code == 401


def test_share_itinerary_by_email_grants_access_to_target(client):
    token_a = register_and_login(client, email="a@example.com", name="A")
    token_b = register_and_login(client, email="b@example.com", name="B")

    create_resp = client.post(
        "/itineraries",
        json={"title": "A's Trip", "destinations": [DEST_MARKET]},
        headers=auth_headers(token_a),
    )
    itinerary_id = create_resp.get_json()["itinerary"]["id"]

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


def test_share_itinerary_with_unknown_contact_returns_404(client):
    token_a = register_and_login(client, email="a@example.com", name="A")

    create_resp = client.post(
        "/itineraries",
        json={"title": "A's Trip", "destinations": [DEST_MARKET]},
        headers=auth_headers(token_a),
    )
    itinerary_id = create_resp.get_json()["itinerary"]["id"]

    resp = client.post(
        f"/itineraries/{itinerary_id}/share",
        json={"email": "nobody@example.com"},
        headers=auth_headers(token_a),
    )

    assert resp.status_code == 404


def test_cannot_share_itinerary_you_do_not_own(client):
    token_a = register_and_login(client, email="a@example.com", name="A")
    token_b = register_and_login(client, email="b@example.com", name="B")
    register_and_login(client, email="c@example.com", name="C")

    create_resp = client.post(
        "/itineraries",
        json={"title": "A's Trip", "destinations": [DEST_MARKET]},
        headers=auth_headers(token_a),
    )
    itinerary_id = create_resp.get_json()["itinerary"]["id"]

    resp = client.post(
        f"/itineraries/{itinerary_id}/share",
        json={"email": "c@example.com"},
        headers=auth_headers(token_b),
    )

    assert resp.status_code == 404


def test_cannot_share_itinerary_with_yourself(client):
    token_a = register_and_login(client, email="a@example.com", name="A")

    create_resp = client.post(
        "/itineraries",
        json={"title": "A's Trip", "destinations": [DEST_MARKET]},
        headers=auth_headers(token_a),
    )
    itinerary_id = create_resp.get_json()["itinerary"]["id"]

    resp = client.post(
        f"/itineraries/{itinerary_id}/share",
        json={"email": "a@example.com"},
        headers=auth_headers(token_a),
    )

    assert resp.status_code == 400


def test_sharing_same_user_twice_returns_conflict(client):
    token_a = register_and_login(client, email="a@example.com", name="A")
    register_and_login(client, email="b@example.com", name="B")

    create_resp = client.post(
        "/itineraries",
        json={"title": "A's Trip", "destinations": [DEST_MARKET]},
        headers=auth_headers(token_a),
    )
    itinerary_id = create_resp.get_json()["itinerary"]["id"]

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


def test_unshare_removes_access(client):
    token_a = register_and_login(client, email="a@example.com", name="A")
    token_b = register_and_login(client, email="b@example.com", name="B")

    create_resp = client.post(
        "/itineraries",
        json={"title": "A's Trip", "destinations": [DEST_MARKET]},
        headers=auth_headers(token_a),
    )
    itinerary_id = create_resp.get_json()["itinerary"]["id"]

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


def test_list_shared_users(client):
    token_a = register_and_login(client, email="a@example.com", name="A")
    register_and_login(client, email="b@example.com", name="B")

    create_resp = client.post(
        "/itineraries",
        json={"title": "A's Trip", "destinations": [DEST_MARKET]},
        headers=auth_headers(token_a),
    )
    itinerary_id = create_resp.get_json()["itinerary"]["id"]

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