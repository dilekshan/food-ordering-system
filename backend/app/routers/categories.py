from app.auth import current_user, admin_user
from typing import List

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.category import Category
from app.models.food import Food
from app.schemas.category import CategoryCreate, CategoryOut
from app.services import image_service

router = APIRouter(dependencies=[Depends(current_user)])


@router.post("/images", status_code=201, dependencies=[Depends(admin_user)])
async def upload_category_image(file: UploadFile = File(...)):
    return await image_service.save_image(file)


@router.delete("/images/{filename}", status_code=204, dependencies=[Depends(admin_user)])
def discard_category_image(filename: str, db: Session = Depends(get_db)):
    url = image_service.URL_PREFIX + filename
    if not image_service.managed_path(url):
        raise HTTPException(404, "Image not found")
    if db.query(Category).filter(Category.image_url == url).first():
        raise HTTPException(409, "Image is in use")
    if db.query(Food).filter(Food.image_url == url).first():
        raise HTTPException(409, "Image is in use")
    image_service.remove_unused_image(db, url)


@router.get("/", response_model=List[CategoryOut])
def list_categories(db: Session = Depends(get_db)):
    return db.query(Category).order_by(Category.name).all()


@router.post("/", response_model=CategoryOut, status_code=201, dependencies=[Depends(admin_user)])
def create_category(data: CategoryCreate, db: Session = Depends(get_db)):
    image_service.validate_image_url(data.image_url)
    category = Category(**data.model_dump())
    db.add(category)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "Category already exists")
    db.refresh(category)
    return category


@router.put("/{category_id}", response_model=CategoryOut, dependencies=[Depends(admin_user)])
def update_category(category_id: int, data: CategoryCreate, db: Session = Depends(get_db)):
    category = db.get(Category, category_id)
    if not category:
        raise HTTPException(404, "Category not found")
    image_service.validate_image_url(data.image_url)
    previous_image = category.image_url
    category.name = data.name.strip()
    category.description = data.description
    category.image_url = data.image_url
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "Category already exists")
    db.refresh(category)
    if previous_image != category.image_url:
        image_service.remove_unused_image(db, previous_image)
    return category


@router.delete("/{category_id}", status_code=204, dependencies=[Depends(admin_user)])
def delete_category(category_id: int, db: Session = Depends(get_db)):
    category = db.get(Category, category_id)
    if not category:
        raise HTTPException(404, "Category not found")
    if category.foods:
        raise HTTPException(409, "Cannot delete a category that still has foods")
    previous_image = category.image_url
    db.delete(category)
    db.commit()
    image_service.remove_unused_image(db, previous_image)
