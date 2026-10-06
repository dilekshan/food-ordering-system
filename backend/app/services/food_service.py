import math
from typing import Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.models.order_item import OrderItem

from app.models.category import Category
from app.models.food import Food
from app.schemas.food import FoodCreate, FoodUpdate
from app.services.image_service import remove_unused_image, validate_image_url


def list_foods(db: Session, category_id: Optional[int] = None, search: Optional[str] = None,
               page: int = 1, limit: int = 12, available_only: bool = False):
    q = db.query(Food)
    if category_id:
        q = q.filter(Food.category_id == category_id)
    if search:
        q = q.filter(Food.name.ilike(f"%{search}%"))
    if available_only:
        q = q.filter(Food.is_available.is_(True))
    total = q.count()
    items = q.order_by(Food.id.desc()).offset((page - 1) * limit).limit(limit).all()
    return {"items": items, "total": total, "page": page, "pages": max(1, math.ceil(total / limit))}


def get_food(db: Session, food_id: int) -> Food:
    food = db.get(Food, food_id)
    if not food:
        raise HTTPException(404, "Food not found")
    return food


def _check_category(db: Session, category_id: int):
    if not db.get(Category, category_id):
        raise HTTPException(400, "Category does not exist")


def create_food(db: Session, data: FoodCreate) -> Food:
    _check_category(db, data.category_id)
    validate_image_url(data.image_url)
    food = Food(**data.model_dump())
    db.add(food)
    db.commit()
    db.refresh(food)
    return food


def update_food(db: Session, food_id: int, data: FoodUpdate) -> Food:
    food = get_food(db, food_id)
    previous_image = food.image_url
    changes = data.model_dump(exclude_unset=True)
    if "category_id" in changes:
        _check_category(db, changes["category_id"])
    if "image_url" in changes:
        validate_image_url(changes["image_url"])
    for key, value in changes.items():
        setattr(food, key, value)
    db.commit()
    db.refresh(food)
    if previous_image != food.image_url:
        remove_unused_image(db, previous_image)
    return food


def delete_food(db: Session, food_id: int):
    food = get_food(db, food_id)
    if db.query(OrderItem).filter(OrderItem.food_id == food_id).first():
        raise HTTPException(409, "This food has order history. Mark it unavailable instead.")
    previous_image = food.image_url
    db.delete(food)
    db.commit()
    remove_unused_image(db, previous_image)
