import os

from dotenv import load_dotenv

load_dotenv()


class Config:
    SERVICE_NAME = "destination-service"
    PORT = int(os.environ.get("PORT", "5003"))

    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "dev-secret-change-me")
    INTERNAL_API_KEY = os.environ.get("INTERNAL_API_KEY", "dev-internal-key")

    USER_SERVICE_URL = os.environ.get("USER_SERVICE_URL", "http://localhost:5001")
    ITINERARY_SERVICE_URL = os.environ.get("ITINERARY_SERVICE_URL", "http://localhost:5002")

    PUBLIC_BASE_URL = os.environ.get("PUBLIC_BASE_URL", "")

    GEOAPIFY_API_KEY = os.environ.get("GEOAPIFY_API_KEY", "")

    OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY", "")
    OPENROUTER_MODEL = os.environ.get("OPENROUTER_MODEL", "openai/gpt-4o-mini")