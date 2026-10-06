from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends
from sqlalchemy import inspect, text
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.services.image_service import UPLOAD_DIR

from app.config import settings
from app.database import Base, engine, get_db
from app import models  # noqa: F401  (registers all models)
from app.routers import categories, customers, dashboard, foods, orders

@asynccontextmanager
async def lifespan(app):
    Base.metadata.create_all(bind=engine)
    with engine.begin() as connection:
        columns = {column["name"] for column in inspect(connection).get_columns("categories")}
        if "image_url" not in columns:
            connection.execute(text("ALTER TABLE categories ADD COLUMN image_url VARCHAR(255) NULL"))
    yield

app = FastAPI(title="Foodora - Food Ordering System API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(categories.router, prefix="/api/categories", tags=["Categories"])
app.include_router(foods.router, prefix="/api/foods", tags=["Foods"])
app.include_router(customers.router, prefix="/api/customers", tags=["Customers"])
app.include_router(orders.router, prefix="/api/orders", tags=["Orders"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])
app.mount("/api/uploads/foods", StaticFiles(directory=UPLOAD_DIR), name="food-images")


@app.get("/")
def root():
    return {"message": "Foodora API is running"}


@app.get("/api/health")
def health(db: Session = Depends(get_db)):
    db.execute(text("SELECT 1"))
    return {"status": "ok", "database": "ok"}
