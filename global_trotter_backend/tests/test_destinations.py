from tests.conftest import auth_headers, register_and_login

# Known seed destination ids (see data/destinations.json)
DEST_MARKET = "dest_001"      # tags: food, shopping, local
DEST_MOUNTAIN = "dest_003"    # tags: nature, hiking, viewpoint
UNKNOWN_DEST = "dest_does_not_exist"


# ---- GET /destinations (search/filter) ----

def test_get_all_destinations(client):
    resp = client.get("/destinations")

    assert resp.status_code == 200
    body = resp.get_json()
    assert len(body["destinations"]) == 5


def test_filter_destinations_by_tag(client):
    resp = client.get("/destinations?tag=nature")

    assert resp.status_code == 200
    ids = [d["id"] for d in resp.get_json()["destinations"]]
    assert DEST_MOUNTAIN in ids
    assert DEST_MARKET not in ids


def test_filter_destinations_by_query_text(client):
    resp = client.get("/destinations?q=market")

    assert resp.status_code == 200
    names = [d["name"].lower() for d in resp.get_json()["destinations"]]
    assert any("marche" in n or "market" in n for n in names)


# ---- POST /destinations/<id>/rating ----

def test_rate_destination_requires_auth(client):
    resp = client.post(f"/destinations/{DEST_MARKET}/rating", json={"stars": 5})

    assert resp.status_code == 401


def test_rate_destination_valid(client):
    token = register_and_login(client)

    resp = client.post(
        f"/destinations/{DEST_MARKET}/rating",
        json={"stars": 5},
        headers=auth_headers(token),
    )

    assert resp.status_code == 200
    rating = resp.get_json()["rating"]
    assert rating["count"] == 57  # seed count was 56
    assert 0 <= rating["average"] <= 5


def test_rate_destination_rejects_out_of_range_stars(client):
    token = register_and_login(client)

    resp = client.post(
        f"/destinations/{DEST_MARKET}/rating",
        json={"stars": 6},
        headers=auth_headers(token),
    )

    assert resp.status_code == 400


def test_rate_destination_rejects_non_integer_stars(client):
    token = register_and_login(client)

    resp = client.post(
        f"/destinations/{DEST_MARKET}/rating",
        json={"stars": "five"},
        headers=auth_headers(token),
    )

    assert resp.status_code == 400


def test_rate_unknown_destination_returns_404(client):
    token = register_and_login(client)

    resp = client.post(
        f"/destinations/{UNKNOWN_DEST}/rating",
        json={"stars": 3},
        headers=auth_headers(token),
    )

    assert resp.status_code == 404


# ---- favorites ----

def test_add_favorite_requires_auth(client):
    resp = client.post(f"/destinations/{DEST_MARKET}/favorite")

    assert resp.status_code == 401


def test_add_and_list_favorite(client):
    token = register_and_login(client)

    add_resp = client.post(f"/destinations/{DEST_MARKET}/favorite", headers=auth_headers(token))
    assert add_resp.status_code == 200
    assert DEST_MARKET in add_resp.get_json()["favorites"]

    list_resp = client.get("/favorites", headers=auth_headers(token))
    assert list_resp.status_code == 200
    ids = [d["id"] for d in list_resp.get_json()["favorites"]]
    assert DEST_MARKET in ids


def test_adding_same_favorite_twice_does_not_duplicate(client):
    token = register_and_login(client)

    client.post(f"/destinations/{DEST_MARKET}/favorite", headers=auth_headers(token))
    resp = client.post(f"/destinations/{DEST_MARKET}/favorite", headers=auth_headers(token))

    favorites = resp.get_json()["favorites"]
    assert favorites.count(DEST_MARKET) == 1


def test_favorite_unknown_destination_returns_404(client):
    token = register_and_login(client)

    resp = client.post(f"/destinations/{UNKNOWN_DEST}/favorite", headers=auth_headers(token))

    assert resp.status_code == 404


def test_remove_favorite(client):
    token = register_and_login(client)
    client.post(f"/destinations/{DEST_MARKET}/favorite", headers=auth_headers(token))

    resp = client.delete(f"/destinations/{DEST_MARKET}/favorite", headers=auth_headers(token))

    assert resp.status_code == 200
    assert DEST_MARKET not in resp.get_json()["favorites"]


def test_list_favorites_empty_by_default(client):
    token = register_and_login(client)

    resp = client.get("/favorites", headers=auth_headers(token))

    assert resp.status_code == 200
    assert resp.get_json()["favorites"] == []
