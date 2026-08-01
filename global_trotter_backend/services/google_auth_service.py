from flask import current_app


class GoogleAuthError(Exception):
    pass


def verify_google_token(credential: str) -> dict:
    """
    Verifies a Google Identity Services ID token (the `credential` string
    the frontend receives from Google's sign-in button) and returns the
    decoded payload (email, name, sub, email_verified, ...).

    Raises GoogleAuthError with a user-facing message on any failure,
    including when GOOGLE_CLIENT_ID isn't configured yet.
    """
    client_id = current_app.config.get("GOOGLE_CLIENT_ID", "")
    if not client_id:
        raise GoogleAuthError(
            "Google sign-in isn't configured yet. Set GOOGLE_CLIENT_ID on the "
            "backend and VITE_GOOGLE_CLIENT_ID on the frontend."
        )

    try:
        from google.oauth2 import id_token as google_id_token
        from google.auth.transport import requests as google_requests
    except ImportError as e:
        raise GoogleAuthError(
            "Google sign-in support isn't installed. Run "
            "`pip install google-auth` on the backend."
        ) from e

    try:
        payload = google_id_token.verify_oauth2_token(
            credential, google_requests.Request(), client_id
        )
    except ValueError as e:
        raise GoogleAuthError("Invalid or expired Google credential") from e

    if not payload.get("email_verified", False):
        raise GoogleAuthError("Google account email is not verified")

    return payload