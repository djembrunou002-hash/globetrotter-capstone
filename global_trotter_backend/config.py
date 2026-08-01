import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "dev-secret-change-me")
    ALLOWED_ORIGINS = os.environ.get(
        "ALLOWED_ORIGINS",
        "http://localhost:5173"
    ).split(",")
    GEOAPIFY_API_KEY = os.environ.get("GEOAPIFY_API_KEY", "")

    # --- Brevo (email + SMS OTP delivery) -----------------------------
    # Leave BREVO_API_KEY empty during local dev: the OTP service will
    # fall back to logging the code to the console and returning it in
    # the API response as "dev_otp" so you can test the full flow
    # without a Brevo account. Set a real key to disable that fallback.
    BREVO_API_KEY      = os.environ.get("BREVO_API_KEY", "")
    BREVO_SENDER_EMAIL = os.environ.get("BREVO_SENDER_EMAIL", "no-reply@globaltrotter.app")
    BREVO_SENDER_NAME  = os.environ.get("BREVO_SENDER_NAME", "GlobalTrotter")
    BREVO_SMS_SENDER    = os.environ.get("BREVO_SMS_SENDER", "GlobTrot")  # max 11 chars, alnum, no spaces
    OTP_EXPIRY_MINUTES = int(os.environ.get("OTP_EXPIRY_MINUTES", "10"))

    # --- Google Sign-In -------------------------------------------------
    # Leave empty locally; /auth/google will return a clear 501 until a
    # real Client ID (from Google Cloud Console -> OAuth Client, "Web
    # application" type) is set here AND on the frontend
    # (VITE_GOOGLE_CLIENT_ID).
    GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")