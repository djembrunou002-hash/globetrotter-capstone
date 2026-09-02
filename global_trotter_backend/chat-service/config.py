import os

from dotenv import load_dotenv

load_dotenv()


class Config:
    SERVICE_NAME = "chat-service"
    PORT = int(os.environ.get("PORT", "5004"))

    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "dev-secret-change-me")
    INTERNAL_API_KEY = os.environ.get("INTERNAL_API_KEY", "dev-internal-key")

    USER_SERVICE_URL = os.environ.get("USER_SERVICE_URL", "http://localhost:5001")

    ALLOWED_ORIGINS = os.environ.get("ALLOWED_ORIGINS", "http://localhost:5173")

    HISTORY_LIMIT = int(os.environ.get("CHAT_HISTORY_LIMIT", "50"))
    MAX_MESSAGE_LENGTH = int(os.environ.get("CHAT_MAX_MESSAGE_LENGTH", "1000"))
    EDIT_WINDOW_MINUTES = int(os.environ.get("CHAT_EDIT_WINDOW_MINUTES", "15"))

    VOICE_DIR = os.environ.get("CHAT_VOICE_DIR", os.path.join(os.path.dirname(os.path.abspath(__file__)), "voice"))
    VOICE_MAX_SECONDS = int(os.environ.get("CHAT_VOICE_MAX_SECONDS", "60"))
    VOICE_MAX_BYTES = int(os.environ.get("CHAT_VOICE_MAX_BYTES", str(3 * 1024 * 1024)))