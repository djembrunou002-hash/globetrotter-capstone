import os
import uuid

from services.storage import DESTINATION_IMAGES_DIR

ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "webp"}


def _extension(filename):
    if not filename or "." not in filename:
        return None
    return filename.rsplit(".", 1)[-1].lower()


def is_allowed_image(file_storage):
    if not file_storage or not file_storage.filename:
        return False
    return _extension(file_storage.filename) in ALLOWED_EXTENSIONS


def save_destination_image(file_storage):
    ext = _extension(file_storage.filename)
    filename = f"{uuid.uuid4().hex}.{ext}"
    os.makedirs(DESTINATION_IMAGES_DIR, exist_ok=True)
    file_storage.save(os.path.join(DESTINATION_IMAGES_DIR, filename))
    return f"/images/destinations/{filename}"


def delete_destination_image(image_path):
    if not image_path or not image_path.startswith("/images/destinations/"):
        return
    filename = image_path.split("/images/destinations/", 1)[-1]
    full_path = os.path.normpath(os.path.join(DESTINATION_IMAGES_DIR, filename))
    if not full_path.startswith(os.path.normpath(DESTINATION_IMAGES_DIR)):
        return
    if os.path.isfile(full_path):
        os.remove(full_path)