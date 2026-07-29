from tests.conftest import auth_headers, register_and_login

DEST_MARKET = "dest_001"
DEST_MOUNTAIN = "dest_003"
UNKNOWN_DEST = "dest_does_not_exist"


# ---- GET /destinations/<id>/comments ----

def test_get_comments_empty_by_default(client):
    resp = client.get(f"/destinations/{DEST_MARKET}/comments")

    assert resp.status_code == 200
    assert resp.get_json()["comments"] == []


def test_get_comments_unknown_destination_returns_404(client):
    resp = client.get(f"/destinations/{UNKNOWN_DEST}/comments")

    assert resp.status_code == 404


# ---- POST /destinations/<id>/comments ----

def test_add_comment_requires_auth(client):
    resp = client.post(f"/destinations/{DEST_MARKET}/comments", json={"text": "Great spot!"})

    assert resp.status_code == 401


def test_add_comment_valid(client):
    token = register_and_login(client, email="commenter@example.com", name="Ada")

    resp = client.post(
        f"/destinations/{DEST_MARKET}/comments",
        json={"text": "Loved the atmosphere here."},
        headers=auth_headers(token),
    )

    assert resp.status_code == 201
    comment = resp.get_json()["comment"]
    assert comment["text"] == "Loved the atmosphere here."
    assert comment["destination_id"] == DEST_MARKET
    assert comment["author"]["name"] == "Ada"
    assert comment["replies"] == []
    assert "id" in comment
    assert "created_at" in comment


def test_added_comment_appears_in_get(client):
    token = register_and_login(client)
    client.post(
        f"/destinations/{DEST_MARKET}/comments",
        json={"text": "Will visit again."},
        headers=auth_headers(token),
    )

    resp = client.get(f"/destinations/{DEST_MARKET}/comments")

    assert resp.status_code == 200
    texts = [c["text"] for c in resp.get_json()["comments"]]
    assert "Will visit again." in texts


def test_add_comment_rejects_blank_text(client):
    token = register_and_login(client)

    resp = client.post(
        f"/destinations/{DEST_MARKET}/comments",
        json={"text": "   "},
        headers=auth_headers(token),
    )

    assert resp.status_code == 400


def test_add_comment_unknown_destination_returns_404(client):
    token = register_and_login(client)

    resp = client.post(
        f"/destinations/{UNKNOWN_DEST}/comments",
        json={"text": "Nice place"},
        headers=auth_headers(token),
    )

    assert resp.status_code == 404


# ---- POST /destinations/<id>/comments/<comment_id>/replies ----

def test_add_reply_requires_auth(client):
    token = register_and_login(client)
    comment_resp = client.post(
        f"/destinations/{DEST_MARKET}/comments",
        json={"text": "Original comment"},
        headers=auth_headers(token),
    )
    comment_id = comment_resp.get_json()["comment"]["id"]

    resp = client.post(
        f"/destinations/{DEST_MARKET}/comments/{comment_id}/replies",
        json={"text": "A reply"},
    )

    assert resp.status_code == 401


def test_add_reply_valid(client):
    author_token = register_and_login(client, email="author@example.com", name="Ada")
    comment_resp = client.post(
        f"/destinations/{DEST_MARKET}/comments",
        json={"text": "Original comment"},
        headers=auth_headers(author_token),
    )
    comment_id = comment_resp.get_json()["comment"]["id"]

    replier_token = register_and_login(client, email="replier@example.com", name="Beno")
    resp = client.post(
        f"/destinations/{DEST_MARKET}/comments/{comment_id}/replies",
        json={"text": "Totally agree!"},
        headers=auth_headers(replier_token),
    )

    assert resp.status_code == 201
    reply = resp.get_json()["reply"]
    assert reply["text"] == "Totally agree!"
    assert reply["author"]["name"] == "Beno"

    list_resp = client.get(f"/destinations/{DEST_MARKET}/comments")
    comments = list_resp.get_json()["comments"]
    target = next(c for c in comments if c["id"] == comment_id)
    assert len(target["replies"]) == 1
    assert target["replies"][0]["text"] == "Totally agree!"


def test_add_reply_rejects_blank_text(client):
    token = register_and_login(client)
    comment_resp = client.post(
        f"/destinations/{DEST_MARKET}/comments",
        json={"text": "Original comment"},
        headers=auth_headers(token),
    )
    comment_id = comment_resp.get_json()["comment"]["id"]

    resp = client.post(
        f"/destinations/{DEST_MARKET}/comments/{comment_id}/replies",
        json={"text": ""},
        headers=auth_headers(token),
    )

    assert resp.status_code == 400


def test_add_reply_unknown_comment_returns_404(client):
    token = register_and_login(client)

    resp = client.post(
        f"/destinations/{DEST_MARKET}/comments/cmt_doesnotexist/replies",
        json={"text": "A reply"},
        headers=auth_headers(token),
    )

    assert resp.status_code == 404


def test_add_reply_unknown_destination_returns_404(client):
    token = register_and_login(client)
    comment_resp = client.post(
        f"/destinations/{DEST_MARKET}/comments",
        json={"text": "Original comment"},
        headers=auth_headers(token),
    )
    comment_id = comment_resp.get_json()["comment"]["id"]

    resp = client.post(
        f"/destinations/{UNKNOWN_DEST}/comments/{comment_id}/replies",
        json={"text": "A reply"},
        headers=auth_headers(token),
    )

    assert resp.status_code == 404


# ---- comment_count on destinations/favorites ----

def test_destination_comment_count_reflects_comments_and_replies(client):
    token = register_and_login(client)
    comment_resp = client.post(
        f"/destinations/{DEST_MARKET}/comments",
        json={"text": "First comment"},
        headers=auth_headers(token),
    )
    comment_id = comment_resp.get_json()["comment"]["id"]
    client.post(
        f"/destinations/{DEST_MARKET}/comments/{comment_id}/replies",
        json={"text": "A reply"},
        headers=auth_headers(token),
    )
    client.post(
        f"/destinations/{DEST_MARKET}/comments",
        json={"text": "Second comment"},
        headers=auth_headers(token),
    )

    resp = client.get("/destinations")

    destinations = {d["id"]: d for d in resp.get_json()["destinations"]}
    assert destinations[DEST_MARKET]["comment_count"] == 3
    assert destinations[DEST_MOUNTAIN]["comment_count"] == 0


def test_favorites_include_comment_count(client):
    token = register_and_login(client)
    client.post(
        f"/destinations/{DEST_MARKET}/comments",
        json={"text": "First comment"},
        headers=auth_headers(token),
    )
    client.post(f"/destinations/{DEST_MARKET}/favorite", headers=auth_headers(token))

    resp = client.get("/favorites", headers=auth_headers(token))

    favorites = {d["id"]: d for d in resp.get_json()["favorites"]}
    assert favorites[DEST_MARKET]["comment_count"] == 1