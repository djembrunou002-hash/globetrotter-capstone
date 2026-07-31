import os

from flask import Blueprint, abort, send_from_directory

from services.storage import DESTINATION_IMAGES_DIR

uploads_bp = Blueprint("uploads", __name__)


@uploads_bp.route("/images/destinations/<path:filename>", methods=["GET"])
def serve_destination_image(filename):
    # Basic safety: reject any path traversal attempts.
    safe_path = os.path.normpath(os.path.join(DESTINATION_IMAGES_DIR, filename))
    if not safe_path.startswith(os.path.normpath(DESTINATION_IMAGES_DIR)):
        abort(404)

    return send_from_directory(DESTINATION_IMAGES_DIR, filename)