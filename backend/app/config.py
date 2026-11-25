
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / ".env")


def required_env(name):
    value = os.getenv(name)
    if value is None or not value.strip():
        raise RuntimeError(f"Required environment variable {name} is missing or empty")
    return value


class Settings:
    INIT_DB = os.getenv("INIT_DB", "false" if os.getenv("VERCEL") else "true").lower() == "true"

    DATABASE_URL = os.getenv(
        "DATABASE_URL",
        "mysql+pymysql://root:password@localhost:3306/food_ordering_db",
    )

    ADMIN_EMAIL = required_env("ADMIN_EMAIL")
    ADMIN_PASSWORD = required_env("ADMIN_PASSWORD")

    AUTH_SECRET = required_env("AUTH_SECRET")

    CORS_ORIGINS = [
        o.strip().rstrip("/")
        for o in os.getenv(
            "CORS_ORIGINS", "http://localhost:5173"
        ).split(",") if o.strip()
    ]

    CLOUDINARY_CLOUD_NAME = os.getenv("CLOUDINARY_CLOUD_NAME")
    CLOUDINARY_API_KEY = os.getenv("CLOUDINARY_API_KEY")
    CLOUDINARY_API_SECRET = os.getenv("CLOUDINARY_API_SECRET")


settings = Settings()
