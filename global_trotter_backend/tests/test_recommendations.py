from tests.conftest import auth_headers, register_and_login

DEST_MARKET = "dest_001"      # tags: food, shopping, local
DEST_VILLAGE = "dest_002"     # tags: food, culture
DEST_MOUNTAIN = "dest_003"    # tags: nature, hiking, viewpoint
DEST_RESTAURANT = "dest_004"  # tags: food, urban
DEST_PARK = "dest_005"        # tags: nature, wildlife, family


def test_recommendations_requires_auth(client):
    resp = client.get("/recommendations")

    assert resp.status_code == 401


def test_recommendations_returns_results(client):
    token = register_and_login(client)

    resp = client.get("/recommendations", headers=auth_headers(token))

    assert resp.status_code == 200
    body = resp.get_json()
    assert "recommendations" in body
    assert len(body["recommendations"]) > 0


def test_recommendations_excludes_visited_destinations(client):
    token = register_and_login(client)

    client.post(
        "/itineraries",
        json={"title": "Trip", "destinations": [DEST_MARKET]},
        headers=auth_headers(token),
    )

    resp = client.get("/recommendations", headers=auth_headers(token))

    ids = [r["destination_id"] for r in resp.get_json()["recommendations"]]
    assert DEST_MARKET not in ids


def test_recommendations_respects_limit_param(client):
    token = register_and_login(client)

    resp = client.get("/recommendations?limit=2", headers=auth_headers(token))

    assert resp.status_code == 200
    assert len(resp.get_json()["recommendations"]) == 2


def test_favoriting_a_destination_boosts_similar_ones(client):
    """
    Favoriting a nature/hiking destination should push other nature-tagged
    destinations higher in the recommendation list (tests the favorites ->
    scoring wiring added today).
    """
    token = register_and_login(client)

    resp_before = client.get("/recommendations?limit=10", headers=auth_headers(token))
    scores_before = {
        r["destination_id"]: r["score"] for r in resp_before.get_json()["recommendations"]
    }

    client.post(f"/destinations/{DEST_MOUNTAIN}/favorite", headers=auth_headers(token))

    resp_after = client.get("/recommendations?limit=10", headers=auth_headers(token))
    scores_after = {
        r["destination_id"]: r["score"] for r in resp_after.get_json()["recommendations"]
    }

    # DEST_PARK shares the "nature" tag with the newly favorited DEST_MOUNTAIN
    assert scores_after[DEST_PARK] > scores_before[DEST_PARK]


def test_favorited_destination_itself_excluded_only_if_visited(client):
    """
    Favoriting a destination does not remove it from recommendations by
    itself -- only visiting it (via an itinerary) does.
    """
    token = register_and_login(client)
    client.post(f"/destinations/{DEST_MOUNTAIN}/favorite", headers=auth_headers(token))

    resp = client.get("/recommendations?limit=10", headers=auth_headers(token))

    ids = [r["destination_id"] for r in resp.get_json()["recommendations"]]
    assert DEST_MOUNTAIN in ids
