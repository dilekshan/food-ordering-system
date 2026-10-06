from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.services import dashboard_service

from app.auth import admin_user

router = APIRouter(dependencies=[Depends(admin_user)])


@router.get("/")
def dashboard(db: Session = Depends(get_db)):
    return dashboard_service.get_dashboard(db)


@router.get("/notifications")
def order_notifications(after_id: Optional[int] = Query(default=None, ge=0), db: Session = Depends(get_db)):
    return dashboard_service.get_order_notifications(db, after_id)
