
"""Validated food and category image uploads using Cloudinary."""

from io import BytesIO
from pathlib import Path
import re
import uuid
import warnings
import logging

import cloudinary
import cloudinary.uploader

from fastapi import HTTPException, UploadFile
from PIL import Image, UnidentifiedImageError
from sqlalchemy.orm import Session
from starlette.concurrency import run_in_threadpool

from app.config import settings
from app.models.category import Category
from app.models.food import Food


UPLOAD_DIR = Path(__file__).resolve().parents[2] / "uploads" / "foods"

URL_PREFIX = "/api/uploads/foods/"
CLOUDINARY_FOLDER = "food-ordering-system"

MAX_BYTES = 4 * 1024 * 1024

FORMATS = {
    ".jpg": "JPEG",
    ".jpeg": "JPEG",
    ".png": "PNG",
    ".webp": "WEBP",
}

MIMES = {
    "JPEG": "image/jpeg",
    "PNG": "image/png",
    "WEBP": "image/webp",
}

logger = logging.getLogger(__name__)

cloudinary.config(
    cloud_name=settings.CLOUDINARY_CLOUD_NAME,
    api_key=settings.CLOUDINARY_API_KEY,
    api_secret=settings.CLOUDINARY_API_SECRET,
    secure=True,
)


async def save_image(file: UploadFile):
    try:
        content = await file.read(MAX_BYTES + 1)
    finally:
        await file.close()

    if len(content) > MAX_BYTES:
        raise HTTPException(
            413, "Image must be 4 MB or smaller"
        )

    extension = Path(file.filename or "").suffix.lower()
    expected = FORMATS.get(extension)

    if not expected or file.content_type != MIMES[expected]:
        raise HTTPException(
            422, "Choose a JPG, JPEG, PNG or WEBP image"
        )

    try:
        with warnings.catch_warnings():
            warnings.simplefilter(
                "error", Image.DecompressionBombWarning
            )

            with Image.open(BytesIO(content)) as source:
                if (
                    source.format != expected
                    or source.width * source.height > 16_000_000
                ):
                    raise ValueError(
                        "Invalid image format or dimensions"
                    )

                source.verify()

            with Image.open(BytesIO(content)) as source:
                source.load()

                clean = source.convert(
                    "RGB" if expected == "JPEG" else "RGBA"
                )

                output = BytesIO()
                clean.save(output, format=expected)

    except (
        UnidentifiedImageError,
        OSError,
        ValueError,
        Image.DecompressionBombError,
        Image.DecompressionBombWarning,
    ):
        raise HTTPException(
            422,
            "Invalid image. Use a valid JPG, JPEG, PNG or WEBP up to 16 megapixels",
        )

    try:
        result = await run_in_threadpool(
            cloudinary.uploader.upload,
            output.getvalue(),
            public_id=f"{CLOUDINARY_FOLDER}/{uuid.uuid4().hex}",
            resource_type="image",
            overwrite=False,
            format="jpg" if expected == "JPEG" else expected.lower(),
        )

        return {"image_url": result["secure_url"]}

    except Exception:
        logger.warning("Cloudinary image upload failed")

        raise HTTPException(
            502, "Image upload failed. Please try again"
        )


def managed_path(url):
    if not url or not url.startswith(URL_PREFIX):
        return None

    name = url[len(URL_PREFIX):]

    if not re.fullmatch(
        r"[a-f0-9]{32}\.(jpg|png|webp)", name
    ):
        return None

    return UPLOAD_DIR / name


def managed_cloudinary_id(url):
    if not url or not settings.CLOUDINARY_CLOUD_NAME:
        return None

    cloud_name = re.escape(settings.CLOUDINARY_CLOUD_NAME)
    folder = re.escape(CLOUDINARY_FOLDER)

    pattern = (
        rf"https://res\.cloudinary\.com/{cloud_name}"
        rf"/image/upload/v[0-9]+/"
        rf"({folder}/[a-f0-9]{{32}})"
        rf"\.(jpg|png|webp)"
    )

    match = re.fullmatch(pattern, url)

    if not match:
        return None

    return match.group(1)


def is_managed_image(url):
    return (
        managed_path(url) is not None
        or managed_cloudinary_id(url) is not None
    )


def image_in_use(db: Session, url):
    public_id = managed_cloudinary_id(url)
    for model in (Food, Category):
        # Also protect references with another version, transformation or extension.
        condition = model.image_url == url
        if public_id:
            condition = condition | model.image_url.contains("/" + public_id, autoescape=True)
        if db.query(model).filter(condition).first():
            return True
    return False


def remove_unused_image(db: Session, url, *, strict=False):
    if not url:
        return

    path = managed_path(url)
    public_id = managed_cloudinary_id(url)

    if not path and not public_id:
        return

    if image_in_use(db, url):
        return

    if public_id:
        try:
            result = cloudinary.uploader.destroy(
                public_id,
                resource_type="image",
                invalidate=True,
            )
            if result.get("result") not in {"ok", "not found"}:
                raise RuntimeError("Cloudinary deletion failed")

        except Exception:
            if strict:
                raise HTTPException(502, "Image deletion failed. Please try again") from None
            logger.warning(
                "Could not remove unused Cloudinary image %s",
                public_id,
            )

        return

    if path:
        try:
            path.unlink(missing_ok=True)

        except OSError:
            if strict:
                raise HTTPException(502, "Image deletion failed. Please try again") from None
            logger.warning(
                "Could not remove unused food image %s",
                path.name,
            )


def validate_image_url(url):
    if not url:
        return

    if url.startswith(URL_PREFIX):
        path = managed_path(url)

        if not path or not path.is_file():
            raise HTTPException(
                422,
                "Uploaded image not found. Please select the image again",
            )

    elif not url.startswith(("https://", "http://")):
        raise HTTPException(
            422,
            "Use an uploaded image or an HTTP(S) image URL",
        )


def discard_image(db: Session, url: str):
    if not is_managed_image(url):
        raise HTTPException(404, "Image not found")
    if image_in_use(db, url):
        raise HTTPException(409, "Image is in use")
    remove_unused_image(db, url, strict=True)
