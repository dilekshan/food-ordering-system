import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / ".env")


class Settings:
    DATABASE_URL = os.getenv(
        "DATABASE_URL",
        "mysql+pymysql://root:password@localhost:3306/food_ordering_db",
    )
    ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@foodie.com")
    ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123")
    CORS_ORIGINS = [o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")]


settings = Settings()
