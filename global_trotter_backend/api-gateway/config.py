import os

from dotenv import load_dotenv

load_dotenv()


class Config:
    SERVICE_NAME = "api-gateway"
    PORT = int(os.environ.get("PORT", "5000"))

    USER_SERVICE_URL = os.environ.get("USER_SERVICE_URL", "http://localhost:5001")
    ITINERARY_SERVICE_URL = os.environ.get("ITINERARY_SERVICE_URL", "http://localhost:5002")
    DESTINATION_SERVICE_URL = os.environ.get("DESTINATION_SERVICE_URL", "http://localhost:5003")
    CHAT_SERVICE_URL = os.environ.get("CHAT_SERVICE_URL", "http://localhost:5004")

    ALLOWED_ORIGINS = os.environ.get("ALLOWED_ORIGINS", "http://localhost:5173").split(",")

    PUBLIC_BASE_URL = os.environ.get("PUBLIC_BASE_URL", "")

    PROXY_TIMEOUT = float(os.environ.get("PROXY_TIMEOUT", "30"))