from app.auth import current_user, admin_user
from typing import Optional

from fastapi import APIRouter, Depends, Query, UploadFile, File, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.food import FoodCreate, FoodList, FoodOut, FoodUpdate
from app.services import food_service
from app.services import image_service
from app.models.food import Food
from app.models.category import Category

router = APIRouter(dependencies=[Depends(current_user)])


@router.post("/images", status_code=201, dependencies=[Depends(admin_user)])
async def upload_image(file: UploadFile = File(...)):
    return await image_service.save_image(file)


@router.delete("/images/{filename}", status_code=204, dependencies=[Depends(admin_user)])
def discard_image(filename: str, db: Session = Depends(get_db)):
    url = image_service.URL_PREFIX + filename
    if not image_service.managed_path(url):
        raise HTTPException(404, "Image not found")
    if db.query(Food).filter(Food.image_url == url).first() or db.query(Category).filter(Category.image_url == url).first():
        raise HTTPException(409, "Image is in use")
    image_service.remove_unused_image(db, url)


@router.get("/", response_model=FoodList)
def list_foods(category_id: Optional[int] = None, search: Optional[str] = None,
               page: int = Query(1, ge=1), limit: int = Query(12, ge=1, le=100),
               available_only: bool = False, db: Session = Depends(get_db)):
    return food_service.list_foods(db, category_id, search, page, limit, available_only)


@router.get("/{food_id}", response_model=FoodOut)
def get_food(food_id: int, db: Session = Depends(get_db)):
    return food_service.get_food(db, food_id)


@router.post("/", response_model=FoodOut, status_code=201, dependencies=[Depends(admin_user)])
def create_food(data: FoodCreate, db: Session = Depends(get_db)):
    return food_service.create_food(db, data)


@router.put("/{food_id}", response_model=FoodOut, dependencies=[Depends(admin_user)])
def update_food(food_id: int, data: FoodUpdate, db: Session = Depends(get_db)):
    return food_service.update_food(db, food_id, data)


@router.delete("/{food_id}", status_code=204, dependencies=[Depends(admin_user)])
def delete_food(food_id: int, db: Session = Depends(get_db)):
    food_service.delete_food(db, food_id)
