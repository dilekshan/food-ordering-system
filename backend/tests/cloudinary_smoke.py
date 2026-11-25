"""Explicit live smoke: creates and deletes only a new, unique test asset. No DB writes."""
import asyncio
import os
import secrets
from io import BytesIO
from PIL import Image
from starlette.datastructures import UploadFile, Headers
# This smoke test does not authenticate users; isolate required auth settings.
os.environ["ADMIN_EMAIL"] = "cloudinary-smoke@example.test"
os.environ["ADMIN_PASSWORD"] = secrets.token_urlsafe(32)
os.environ["AUTH_SECRET"] = secrets.token_hex(32)
from app.services import image_service

async def main():
    data = BytesIO()
    Image.new("RGB", (16, 16), "orange").save(data, "PNG")
    result = await image_service.save_image(UploadFile(BytesIO(data.getvalue()), filename="smoke.png", headers=Headers({"content-type": "image/png"})))
    public_id = image_service.managed_cloudinary_id(result["image_url"])
    assert public_id, "Uploaded URL must be managed"
    try:
        print("PASS: live Cloudinary validated upload")
    finally:
        result = image_service.cloudinary.uploader.destroy(public_id, resource_type="image", invalidate=True)
        assert result.get("result") == "ok", "Test asset cleanup failed"
        print("PASS: live Cloudinary test asset deletion")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception as exc:
        print("FAIL: Cloudinary smoke test (" + type(exc).__name__ + "); credentials and provider details suppressed")
        raise SystemExit(1)
