from tests.conftest import auth_headers, token_for

DEST_MARKET = "dest_001"
DEST_VILLAGE = "dest_002"
DEST_MOUNTAIN = "dest_003"
DEST_RESTAURANT = "dest_004"
DEST_PARK = "dest_005"


def test_recommendations_requires_auth(client):
    resp = client.get("/recommendations")

    assert resp.status_code == 401


def test_recommendations_returns_results(client, users):
    token = token_for(client, users.add("Test User"))

    resp = client.get("/recommendations", headers=auth_headers(token))

    assert resp.status_code == 200
    body = resp.get_json()
    assert "recommendations" in body
    assert len(body["recommendations"]) > 0


def test_recommendations_unknown_user_returns_404(client, users):
    ghost = {"id": "usr_deleted"}
    token = token_for(client, ghost)

    resp = client.get("/recommendations", headers=auth_headers(token))

    assert resp.status_code == 404


def test_recommendations_excludes_visited_destinations(client, users, itineraries):
    user = users.add("Test User")
    token = token_for(client, user)

    itineraries.add(user["id"], [DEST_MARKET])

    resp = client.get("/recommendations", headers=auth_headers(token))

    ids = [r["destination_id"] for r in resp.get_json()["recommendations"]]
    assert DEST_MARKET not in ids


def test_recommendations_respects_limit_param(client, users):
    token = token_for(client, users.add("Test User"))

    resp = client.get("/recommendations?limit=2", headers=auth_headers(token))

    assert resp.status_code == 200
    assert len(resp.get_json()["recommendations"]) == 2


def test_favoriting_a_destination_boosts_similar_ones(client, users):
    token = token_for(client, users.add("Test User"))

    resp_before = client.get("/recommendations?limit=10", headers=auth_headers(token))
    scores_before = {
        r["destination_id"]: r["score"] for r in resp_before.get_json()["recommendations"]
    }

    client.post(f"/destinations/{DEST_MOUNTAIN}/favorite", headers=auth_headers(token))

    resp_after = client.get("/recommendations?limit=10", headers=auth_headers(token))
    scores_after = {
        r["destination_id"]: r["score"] for r in resp_after.get_json()["recommendations"]
    }

    assert scores_after[DEST_PARK] > scores_before[DEST_PARK]


def test_favorited_destination_itself_excluded_only_if_visited(client, users):
    token = token_for(client, users.add("Test User"))
    client.post(f"/destinations/{DEST_MOUNTAIN}/favorite", headers=auth_headers(token))

    resp = client.get("/recommendations?limit=10", headers=auth_headers(token))

    ids = [r["destination_id"] for r in resp.get_json()["recommendations"]]
    assert DEST_MOUNTAIN in ids


def test_recommendations_still_work_when_itinerary_service_is_down(client, users, itineraries):
    user = users.add("Test User")
    token = token_for(client, user)

    itineraries.add(user["id"], [DEST_MARKET])
    itineraries.available = False

    resp = client.get("/recommendations", headers=auth_headers(token))

    assert resp.status_code == 200
    ids = [r["destination_id"] for r in resp.get_json()["recommendations"]]
    assert DEST_MARKET in ids


def test_recommendations_return_503_when_user_service_is_down(client, users):
    token = token_for(client, users.add("Test User"))
    users.available = False

    resp = client.get("/recommendations", headers=auth_headers(token))

    assert resp.status_code == 503