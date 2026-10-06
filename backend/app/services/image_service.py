"""Validated food uploads. Only generated files in UPLOAD_DIR may be removed."""
from io import BytesIO
from pathlib import Path
import re
import uuid
import warnings
import logging

from fastapi import HTTPException, UploadFile
from PIL import Image, UnidentifiedImageError
from sqlalchemy.orm import Session

from app.models.category import Category
from app.models.food import Food

UPLOAD_DIR = Path(__file__).resolve().parents[2] / "uploads" / "foods"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
URL_PREFIX = "/api/uploads/foods/"
MAX_BYTES = 5 * 1024 * 1024
FORMATS = {".jpg": "JPEG", ".jpeg": "JPEG", ".png": "PNG", ".webp": "WEBP"}
MIMES = {"JPEG": "image/jpeg", "PNG": "image/png", "WEBP": "image/webp"}


async def save_image(file: UploadFile):
    try:
        content = await file.read(MAX_BYTES + 1)
    finally:
        await file.close()
    if len(content) > MAX_BYTES:
        raise HTTPException(413, "Image must be 5 MB or smaller")
    extension = Path(file.filename or "").suffix.lower()
    expected = FORMATS.get(extension)
    if not expected or file.content_type != MIMES[expected]:
        raise HTTPException(422, "Choose a JPG, JPEG, PNG or WEBP image")
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(BytesIO(content)) as source:
                if source.format != expected or source.width * source.height > 16_000_000:
                    raise ValueError("Invalid image format or dimensions")
                source.verify()
            with Image.open(BytesIO(content)) as source:
                source.load()
                # Re-encode decoded pixels; do not publish arbitrary uploaded bytes or metadata.
                clean = source.convert("RGB" if expected == "JPEG" else "RGBA")
                output = BytesIO()
                clean.save(output, format=expected)
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError, Image.DecompressionBombWarning):
        raise HTTPException(422, "Invalid image. Use a valid JPG, JPEG, PNG or WEBP up to 16 megapixels")
    name = uuid.uuid4().hex + (".jpg" if expected == "JPEG" else extension)
    (UPLOAD_DIR / name).write_bytes(output.getvalue())
    return {"image_url": URL_PREFIX + name}


def managed_path(url):
    if not url or not url.startswith(URL_PREFIX):
        return None
    name = url[len(URL_PREFIX):]
    if not re.fullmatch(r"[a-f0-9]{32}\.(jpg|png|webp)", name):
        return None
    return UPLOAD_DIR / name


def remove_unused_image(db: Session, url):
    path = managed_path(url)
    if path and not db.query(Food).filter(Food.image_url == url).first() and not db.query(Category).filter(Category.image_url == url).first():
        try:
            path.unlink(missing_ok=True)
        except OSError:
            logging.getLogger(__name__).warning("Could not remove unused food image %s", path.name)


def validate_image_url(url):
    if url and url.startswith(URL_PREFIX):
        path = managed_path(url)
        if not path or not path.is_file():
            raise HTTPException(422, "Uploaded image not found. Please select the image again")
    elif url and not url.startswith(("https://", "http://")):
        raise HTTPException(422, "Use an uploaded image or an HTTP(S) image URL")
