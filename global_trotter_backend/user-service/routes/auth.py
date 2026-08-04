import uuid
from datetime import datetime, timezone

from flask import Blueprint, jsonify, request
from flask_jwt_extended import create_access_token
from werkzeug.security import check_password_hash, generate_password_hash

import services.otp_service as otp_service
from services.brevo_service import BrevoService
from services.google_auth_service import GoogleAuthError, verify_google_token
from services.storage import load_json, save_json
from utils.identifier import Identifier

auth_bp = Blueprint("auth", __name__)


# =====================================================================
# Small in-file "repository" helpers over data/users.json.
# Kept here (rather than a separate repository layer) to match how the
# rest of this codebase talks to storage.py directly.
# =====================================================================
def _find_user_by_identifier(users, identifier):
    return next((u for u in users if identifier.matches_user(u)), None)


def _find_user_by_id(users, user_id):
    return next((u for u in users if u["id"] == user_id), None)


def _public_user(user):
    return {k: v for k, v in user.items() if k != "password_hash"}


def _parse_identifier(body):
    """Returns (Identifier|None, error_message|None)."""
    try:
        return Identifier.parse(email=body.get("email"), number=body.get("number")), None
    except ValueError as e:
        return None, str(e)


def _create_user(name, identifier, password_hash, verified, auth_provider="local", google_id=None):
    email, number = identifier.as_user_fields()
    data = load_json("users.json")
    user = {
        "id": f"usr_{uuid.uuid4().hex[:8]}",
        "name": name,
        "email": email,
        "number": number,
        "password_hash": password_hash,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "favorites": [],
        "preferences": {"travel_style": []},
        "role": "user",
        "verified": verified,
        "auth_provider": auth_provider,
        "google_id": google_id,
    }
    data["users"].append(user)
    save_json("users.json", data)
    return user


# =====================================================================
# REGISTER
# Email identifiers go through the 2-phase OTP flow (sends a code,
# user is created only after /verify-email succeeds).
# Phone identifiers skip OTP entirely (no SMS credits required) and
# create + log the user in immediately.
# =====================================================================
@auth_bp.route("/register", methods=["POST"])
def register():
    body = request.get_json(silent=True) or {}
    name = (body.get("name") or "").strip()
    password = body.get("password", "")

    identifier, ident_err = _parse_identifier(body)
    if ident_err:
        return jsonify({"error": ident_err}), 400

    if not name or not password:
        return jsonify({"error": "name, password, and email or number are required"}), 400

    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400

    users = load_json("users.json")["users"]
    if _find_user_by_identifier(users, identifier):
        kind = "email" if identifier.is_email() else "phone number"
        return jsonify({"error": f"{kind} already registered"}), 409

    password_hash = generate_password_hash(password, method="pbkdf2:sha256")

    # --- Phone: no OTP, create the account and log in right away. ---
    if identifier.is_phone():
        try:
            user = _create_user(name, identifier, password_hash, verified=True)
            token = create_access_token(identity=user["id"])
            return jsonify({"token": token, "user": _public_user(user)}), 201
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    # --- Email: send an OTP, create the account only once verified. ---
    try:
        code = otp_service.generate_code()
        otp_service.upsert_pending(identifier, name, password_hash, code)

        brevo = BrevoService()
        sent = brevo.send_otp(identifier, name, code, purpose="register")
        if not sent:
            return jsonify({"error": f"Failed to send verification code to your {brevo.channel_name(identifier)}"}), 502

        response = {
            "message": f"Verification code sent to your {brevo.channel_name(identifier)}",
            "identifier": identifier.value,
            "channel": brevo.channel_name(identifier),
        }
        if brevo.dev_mode:
            response["dev_otp"] = code  # only present when BREVO_API_KEY is unset
        return jsonify(response), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# =====================================================================
# VERIFY EMAIL/PHONE  (phase 2 of 2 -- creates the user, logs them in)
# =====================================================================
@auth_bp.route("/verify-email", methods=["POST"])
def verify_email():
    body = request.get_json(silent=True) or {}
    code = (body.get("code") or "").strip()

    identifier, ident_err = _parse_identifier(body)
    if ident_err:
        return jsonify({"error": ident_err}), 400
    if not code:
        return jsonify({"error": "code is required"}), 400

    pending = otp_service.find_pending_by_code(identifier, code)
    if not pending:
        return jsonify({"error": "Invalid verification code"}), 400
    if otp_service.is_pending_expired(pending):
        return jsonify({"error": "Code has expired"}), 400

    data = load_json("users.json")
    user = {
        "id": f"usr_{uuid.uuid4().hex[:8]}",
        "name": pending["name"],
        "email": pending["email"],
        "number": pending["number"],
        "password_hash": pending["password_hash"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "favorites": [],
        "preferences": {"travel_style": []},
        "role": "user",
        "verified": True,
        "auth_provider": "local",
        "google_id": None,
    }
    data["users"].append(user)
    save_json("users.json", data)
    otp_service.delete_pending(identifier)

    token = create_access_token(identity=user["id"])
    return jsonify({"token": token, "user": _public_user(user)}), 201


# =====================================================================
# RESEND OTP
# =====================================================================
@auth_bp.route("/resend-otp", methods=["POST"])
def resend_otp():
    body = request.get_json(silent=True) or {}

    identifier, ident_err = _parse_identifier(body)
    if ident_err:
        return jsonify({"error": ident_err}), 400

    pending = otp_service.find_pending(identifier)
    if not pending:
        return jsonify({"error": "No pending registration found"}), 404

    code = otp_service.generate_code()
    otp_service.update_pending_code(identifier, code)

    brevo = BrevoService()
    sent = brevo.send_otp(identifier, pending["name"], code, purpose="register")
    if not sent:
        return jsonify({"error": "Failed to send verification code"}), 502

    response = {"message": "New verification code sent"}
    if brevo.dev_mode:
        response["dev_otp"] = code
    return jsonify(response), 200


# =====================================================================
# LOGIN
# =====================================================================
@auth_bp.route("/login", methods=["POST"])
def login():
    body = request.get_json(silent=True) or {}
    password = body.get("password", "")

    identifier, ident_err = _parse_identifier(body)
    if ident_err:
        return jsonify({"error": ident_err}), 400
    if not password:
        return jsonify({"error": "password is required"}), 400

    users = load_json("users.json")["users"]
    user = _find_user_by_identifier(users, identifier)

    if not user or not user.get("password_hash") or not check_password_hash(user["password_hash"], password):
        return jsonify({"error": "invalid credentials"}), 401

    if not user.get("verified", True):
        return jsonify({"error": "Please verify your account first"}), 403

    token = create_access_token(identity=user["id"])
    return jsonify({"token": token, "user": _public_user(user)}), 200


# =====================================================================
# GOOGLE SIGN-IN / SIGN-UP
# Body: { credential }  -- the ID token from Google Identity Services
# Creates a verified user automatically on first sign-in (Google has
# already verified the email), or logs in an existing one.
# =====================================================================
@auth_bp.route("/auth/google", methods=["POST"])
def google_auth():
    body = request.get_json(silent=True) or {}
    credential = body.get("credential")
    if not credential:
        return jsonify({"error": "credential is required"}), 400

    try:
        payload = verify_google_token(credential)
    except GoogleAuthError as e:
        return jsonify({"error": str(e)}), 501 if "configured" in str(e) or "installed" in str(e) else 401

    email = (payload.get("email") or "").lower()
    google_id = payload.get("sub")
    name = payload.get("name") or email.split("@")[0]

    if not email or not google_id:
        return jsonify({"error": "Google account did not return an email"}), 400

    data = load_json("users.json")
    users = data["users"]
    user = next((u for u in users if (u.get("email") or "").lower() == email), None)

    if user:
        # Link the Google identity to an existing account and let them in.
        if not user.get("google_id"):
            user["google_id"] = google_id
            user["auth_provider"] = user.get("auth_provider", "local")
            save_json("users.json", data)
    else:
        user = {
            "id": f"usr_{uuid.uuid4().hex[:8]}",
            "name": name,
            "email": email,
            "number": None,
            "password_hash": None,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "favorites": [],
            "preferences": {"travel_style": []},
            "role": "user",
            "verified": True,
            "auth_provider": "google",
            "google_id": google_id,
        }
        users.append(user)
        save_json("users.json", data)

    token = create_access_token(identity=user["id"])
    return jsonify({"token": token, "user": _public_user(user)}), 200


# =====================================================================
# FORGOT PASSWORD  (step 1 of 3)
# =====================================================================
@auth_bp.route("/forgot-password", methods=["POST"])
def forgot_password():
    body = request.get_json(silent=True) or {}

    identifier, ident_err = _parse_identifier(body)
    if ident_err:
        return jsonify({"error": ident_err}), 400

    if identifier.is_phone():
        return jsonify({
            "error": "Password reset by phone number isn't available yet. "
                     "Please contact support or use an email address instead.",
        }), 400

    brevo = BrevoService()
    where = brevo.channel_name(identifier)

    users = load_json("users.json")["users"]
    user = _find_user_by_identifier(users, identifier)
    if not user:
        # Same response either way, to avoid account enumeration.
        return jsonify({
            "message": f"If this {where} is registered, a reset code has been sent",
            "identifier": identifier.value,
        }), 200

    code = otp_service.generate_code()
    otp_service.upsert_reset(identifier, code)

    sent = brevo.send_otp(identifier, user["name"], code, purpose="reset")
    if not sent:
        return jsonify({"error": f"Failed to send reset code to your {where}"}), 502

    response = {"message": f"Reset code sent to your {where}", "identifier": identifier.value}
    if brevo.dev_mode:
        response["dev_otp"] = code
    return jsonify(response), 200


# =====================================================================
# VERIFY RESET CODE  (step 2 of 3)
# =====================================================================
@auth_bp.route("/verify-reset-code", methods=["POST"])
def verify_reset_code():
    body = request.get_json(silent=True) or {}
    code = (body.get("code") or "").strip()

    identifier, ident_err = _parse_identifier(body)
    if ident_err:
        return jsonify({"error": ident_err}), 400
    if not code:
        return jsonify({"error": "code is required"}), 400
    if identifier.is_phone():
        return jsonify({"error": "Password reset by phone number isn't available yet."}), 400

    reset = otp_service.find_reset_by_code(identifier, code)
    if not reset:
        return jsonify({"error": "Invalid reset code"}), 400
    if otp_service.is_reset_expired(reset):
        return jsonify({"error": "Reset code has expired"}), 400

    return jsonify({"message": "Code verified", "identifier": identifier.value}), 200


# =====================================================================
# RESET PASSWORD  (step 3 of 3)
# =====================================================================
@auth_bp.route("/reset-password", methods=["POST"])
def reset_password():
    body = request.get_json(silent=True) or {}
    code = (body.get("code") or "").strip()
    new_password = body.get("new_password", "")

    identifier, ident_err = _parse_identifier(body)
    if ident_err:
        return jsonify({"error": ident_err}), 400
    if not code or not new_password:
        return jsonify({"error": "code and new_password are required"}), 400
    if len(new_password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400
    if identifier.is_phone():
        return jsonify({"error": "Password reset by phone number isn't available yet."}), 400

    reset = otp_service.find_reset_by_code(identifier, code)
    if not reset:
        return jsonify({"error": "Invalid or expired reset code"}), 400
    if otp_service.is_reset_expired(reset):
        return jsonify({"error": "Reset code has expired"}), 400

    data = load_json("users.json")
    user = _find_user_by_identifier(data["users"], identifier)
    if not user:
        return jsonify({"error": "User not found"}), 404

    user["password_hash"] = generate_password_hash(new_password, method="pbkdf2:sha256")
    save_json("users.json", data)
    otp_service.delete_reset(identifier)

    # Log the user in immediately so they land straight back in the app.
    token = create_access_token(identity=user["id"])
    return jsonify({"message": "Password reset successfully", "token": token, "user": _public_user(user)}), 200