import os

from dotenv import load_dotenv

load_dotenv()


class Config:
    SERVICE_NAME = "user-service"
    PORT = int(os.environ.get("PORT", "5001"))

    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "dev-secret-change-me")
    INTERNAL_API_KEY = os.environ.get("INTERNAL_API_KEY", "dev-internal-key")

    BREVO_API_KEY = os.environ.get("BREVO_API_KEY", "")
    BREVO_SENDER_EMAIL = os.environ.get("BREVO_SENDER_EMAIL", "no-reply@globaltrotter.app")
    BREVO_SENDER_NAME = os.environ.get("BREVO_SENDER_NAME", "GlobalTrotter")
    BREVO_SMS_SENDER = os.environ.get("BREVO_SMS_SENDER", "GlobTrot")
    OTP_EXPIRY_MINUTES = int(os.environ.get("OTP_EXPIRY_MINUTES", "10"))

    GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")