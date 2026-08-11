import services.destination_requests as destination_requests
from tests.conftest import auth_headers, token_for

DEST_MARKET = "dest_001"


def _create_request(request_type, submitted_by, name="New Spot", destination_id=None):
    return destination_requests.create_request(
        request_type,
        submitted_by,
        {"name": name, "images": ["img.jpg"]},
        destination_id=destination_id,
    )


def test_notifications_requires_auth(client):
    resp = client.get("/notifications")

    assert resp.status_code == 401


def test_admin_sees_pending_requests(client, users):
    owner = users.add("Owner")
    admin = users.add_admin()
    _create_request("create", owner["id"], name="Chutes de la Lobe")

    resp = client.get("/notifications", headers=auth_headers(token_for(client, admin)))

    assert resp.status_code == 200
    items = resp.get_json()["notifications"]
    assert len(items) == 1
    assert items[0]["scope"] == "admin"
    assert items[0]["status"] == "pending"
    assert items[0]["name"] == "Chutes de la Lobe"


def test_admin_does_not_see_reviewed_requests(client, users):
    owner = users.add("Owner")
    admin = users.add_admin()
    req = _create_request("create", owner["id"])
    destination_requests.reject_request(req, "not enough detail")

    resp = client.get("/notifications", headers=auth_headers(token_for(client, admin)))

    assert resp.status_code == 200
    assert resp.get_json()["notifications"] == []


def test_owner_does_not_see_pending_request(client, users):
    owner = users.add("Owner")
    _create_request("create", owner["id"])

    resp = client.get("/notifications", headers=auth_headers(token_for(client, owner)))

    assert resp.status_code == 200
    assert resp.get_json()["notifications"] == []


def test_owner_sees_rejected_request(client, users):
    owner = users.add("Owner")
    req = _create_request("create", owner["id"], name="Mefou")
    destination_requests.reject_request(req, "missing photos")

    resp = client.get("/notifications", headers=auth_headers(token_for(client, owner)))

    assert resp.status_code == 200
    items = resp.get_json()["notifications"]
    assert len(items) == 1
    assert items[0]["scope"] == "owner"
    assert items[0]["status"] == "rejected"
    assert items[0]["request_id"] == req["id"]


def test_owner_sees_approved_request(client, users):
    owner = users.add("Owner")
    req = _create_request("edit", owner["id"], destination_id=DEST_MARKET)
    destination_requests.approve_request(req)

    resp = client.get("/notifications", headers=auth_headers(token_for(client, owner)))

    assert resp.status_code == 200
    items = resp.get_json()["notifications"]
    assert len(items) == 1
    assert items[0]["status"] == "approved"
    assert items[0]["destination_id"] == DEST_MARKET


def test_owner_sees_direct_admin_action(client, users):
    owner = users.add("Owner")
    admin = users.add_admin()
    destination = {"id": DEST_MARKET, "name": "Marche Central", "owner_id": owner["id"]}
    destination_requests.create_admin_action_request("edit", destination, admin["id"])

    resp = client.get("/notifications", headers=auth_headers(token_for(client, owner)))

    assert resp.status_code == 200
    items = resp.get_json()["notifications"]
    assert len(items) == 1
    assert items[0]["admin_action"] is True


def test_owner_only_sees_own_requests(client, users):
    owner = users.add("Owner")
    other = users.add("Other")
    req = _create_request("create", other["id"])
    destination_requests.reject_request(req, "no")

    resp = client.get("/notifications", headers=auth_headers(token_for(client, owner)))

    assert resp.status_code == 200
    assert resp.get_json()["notifications"] == []


def test_notification_key_is_stable(client, users):
    owner = users.add("Owner")
    req = _create_request("create", owner["id"])
    destination_requests.reject_request(req, "try again")
    headers = auth_headers(token_for(client, owner))

    first = client.get("/notifications", headers=headers).get_json()["notifications"]
    second = client.get("/notifications", headers=headers).get_json()["notifications"]

    assert first[0]["key"] == second[0]["key"]