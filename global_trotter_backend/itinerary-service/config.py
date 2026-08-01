import os

from dotenv import load_dotenv

load_dotenv()


class Config:
    SERVICE_NAME = "itinerary-service"
    PORT = int(os.environ.get("PORT", "5002"))

    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "dev-secret-change-me")
    INTERNAL_API_KEY = os.environ.get("INTERNAL_API_KEY", "dev-internal-key")

    USER_SERVICE_URL = os.environ.get("USER_SERVICE_URL", "http://localhost:5001")
    DESTINATION_SERVICE_URL = os.environ.get("DESTINATION_SERVICE_URL", "http://localhost:5003")