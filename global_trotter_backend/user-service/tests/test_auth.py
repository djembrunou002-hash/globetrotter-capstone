from tests.conftest import auth_headers, register_and_login


def test_register_sends_otp_and_does_not_create_user_yet(client):
    resp = client.post(
        "/register",
        json={"name": "Alice", "email": "alice@example.com", "password": "secret123"},
    )

    assert resp.status_code == 201
    body = resp.get_json()
    assert body["channel"] == "email"
    assert body["identifier"] == "alice@example.com"
    assert "dev_otp" in body  # dev-mode fallback since BREVO_API_KEY is unset in tests

    # Not a real user yet -- login should fail until verified.
    login_resp = client.post("/login", json={"email": "alice@example.com", "password": "secret123"})
    assert login_resp.status_code == 401


def test_register_missing_fields(client):
    resp = client.post("/register", json={"name": "Alice"})
    assert resp.status_code == 400


def test_register_duplicate_email_rejected(client):
    register_and_login(client, email="dup@example.com")
    resp = client.post(
        "/register",
        json={"name": "Bob", "email": "dup@example.com", "password": "otherpass"},
    )
    assert resp.status_code == 409


def test_verify_email_wrong_code_rejected(client):
    client.post(
        "/register",
        json={"name": "Alice", "email": "alice@example.com", "password": "secret123"},
    )
    resp = client.post("/verify-email", json={"email": "alice@example.com", "code": "000000"})
    assert resp.status_code == 400


def test_verify_email_creates_verified_user_and_logs_in(client):
    token = register_and_login(client, email="alice@example.com")
    assert token

    resp = client.post("/login", json={"email": "alice@example.com", "password": "pass1234"})
    assert resp.status_code == 200
    body = resp.get_json()
    assert body["user"]["email"] == "alice@example.com"
    assert body["user"]["verified"] is True
    assert "password_hash" not in body["user"]


def test_resend_otp_issues_new_code(client):
    reg = client.post(
        "/register",
        json={"name": "Alice", "email": "alice@example.com", "password": "secret123"},
    )
    old_code = reg.get_json()["dev_otp"]

    resend = client.post("/resend-otp", json={"email": "alice@example.com"})
    assert resend.status_code == 200
    new_code = resend.get_json()["dev_otp"]

    # Old code should no longer verify; new one should.
    stale = client.post("/verify-email", json={"email": "alice@example.com", "code": old_code})
    if old_code == new_code:
        assert stale.status_code == 201
    else:
        assert stale.status_code == 400
        fresh = client.post("/verify-email", json={"email": "alice@example.com", "code": new_code})
        assert fresh.status_code == 201


def test_login_success(client):
    register_and_login(client, email="alice@example.com", password="secret123")
    resp = client.post("/login", json={"email": "alice@example.com", "password": "secret123"})

    assert resp.status_code == 200
    body = resp.get_json()
    assert "token" in body
    assert body["user"]["email"] == "alice@example.com"
    assert "password_hash" not in body["user"]


def test_login_wrong_password(client):
    register_and_login(client, email="alice@example.com", password="secret123")
    resp = client.post("/login", json={"email": "alice@example.com", "password": "wrongpass"})
    assert resp.status_code == 401


def test_login_unknown_user(client):
    resp = client.post("/login", json={"email": "nobody@example.com", "password": "whatever"})
    assert resp.status_code == 401


def test_register_by_phone_skips_otp_and_logs_in_immediately(client):
    reg = client.post(
        "/register",
        json={"name": "Alice", "number": "677123456", "password": "secret123"},
    )
    assert reg.status_code == 201
    body = reg.get_json()
    assert "token" in body
    assert body["user"]["number"] == "+237677123456"
    assert body["user"]["verified"] is True
    assert "password_hash" not in body["user"]


def test_login_by_phone_number(client):
    client.post(
        "/register",
        json={"name": "Alice", "number": "677123456", "password": "secret123"},
    )

    resp = client.post("/login", json={"number": "677123456", "password": "secret123"})
    assert resp.status_code == 200
    assert resp.get_json()["user"]["number"] == "+237677123456"


def test_identifier_prioritizes_email_when_both_given(client):
    reg = client.post(
        "/register",
        json={"name": "Alice", "email": "alice@example.com", "number": "677123456", "password": "secret123"},
    )
    assert reg.get_json()["channel"] == "email"
    assert reg.get_json()["identifier"] == "alice@example.com"


def test_forgot_and_reset_password_flow(client):
    register_and_login(client, email="alice@example.com", password="secret123")

    forgot = client.post("/forgot-password", json={"email": "alice@example.com"})
    assert forgot.status_code == 200
    code = forgot.get_json()["dev_otp"]

    verify = client.post("/verify-reset-code", json={"email": "alice@example.com", "code": code})
    assert verify.status_code == 200

    reset = client.post("/reset-password", json={
        "email": "alice@example.com", "code": code, "new_password": "newpass456",
    })
    assert reset.status_code == 200

    old_login = client.post("/login", json={"email": "alice@example.com", "password": "secret123"})
    assert old_login.status_code == 401

    new_login = client.post("/login", json={"email": "alice@example.com", "password": "newpass456"})
    assert new_login.status_code == 200


def test_forgot_password_unknown_email_does_not_leak(client):
    resp = client.post("/forgot-password", json={"email": "nobody@example.com"})
    assert resp.status_code == 200  # same response whether or not the account exists


def test_forgot_password_rejects_phone_number(client):
    client.post(
        "/register",
        json={"name": "Alice", "number": "677123456", "password": "secret123"},
    )
    resp = client.post("/forgot-password", json={"number": "677123456"})
    assert resp.status_code == 400
    assert "phone number" in resp.get_json()["error"].lower()


def test_google_auth_without_client_id_returns_not_configured(client):
    resp = client.post("/auth/google", json={"credential": "fake-token"})
    assert resp.status_code == 501
    assert "configured" in resp.get_json()["error"]


def test_me_route_no_longer_exists(client):
    token = register_and_login(client)
    resp = client.get("/me", headers=auth_headers(token))
    assert resp.status_code == 404