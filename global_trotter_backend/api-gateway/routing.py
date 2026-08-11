from config import Config

USER = "user-service"
ITINERARY = "itinerary-service"
DESTINATION = "destination-service"

SERVICE_URLS = {
    USER: Config.USER_SERVICE_URL,
    ITINERARY: Config.ITINERARY_SERVICE_URL,
    DESTINATION: Config.DESTINATION_SERVICE_URL,
}

ROUTE_TABLE = [
    ("register", USER),
    ("login", USER),
    ("verify-email", USER),
    ("resend-otp", USER),
    ("forgot-password", USER),
    ("verify-reset-code", USER),
    ("reset-password", USER),
    ("auth", USER),
    ("users", USER),
    ("itineraries", ITINERARY),
    ("destinations", DESTINATION),
    ("favorites", DESTINATION),
    ("my-destinations", DESTINATION),
    ("notifications", DESTINATION),
    ("admin", DESTINATION),
    ("recommendations", DESTINATION),
    ("places", DESTINATION),
    ("ai", DESTINATION),
    ("images", DESTINATION),
]

PREFIX_TO_SERVICE = dict(ROUTE_TABLE)

BLOCKED_PREFIXES = {"internal"}


def resolve(path):
    segment = path.split("/", 1)[0].strip().lower()

    if segment in BLOCKED_PREFIXES:
        return None, None

    service = PREFIX_TO_SERVICE.get(segment)
    if not service:
        return None, None

    return service, SERVICE_URLS[service]