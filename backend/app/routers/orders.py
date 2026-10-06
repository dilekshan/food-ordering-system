from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from app.auth import current_user, admin_user
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.order import OrderCreate, OrderOut, OrderStatusUpdate
from app.services import order_service

router = APIRouter()


@router.post("/", response_model=OrderOut, status_code=201)
def create_order(data: OrderCreate, db: Session = Depends(get_db), user=Depends(current_user)):
    if user["role"] != "customer" or data.customer_id != user["id"]:
        raise HTTPException(403, "You can only place your own orders")
    return order_service.create_order(db, data)


@router.get("/", response_model=List[OrderOut])
def list_orders(customer_id: Optional[int] = None, status: Optional[str] = None,
                db: Session = Depends(get_db), user=Depends(current_user)):
    if user["role"] == "customer":
        if customer_id is not None and customer_id != user["id"]:
            raise HTTPException(403, "You can only view your own orders")
        customer_id = user["id"]
    return order_service.list_orders(db, customer_id, status)


@router.get("/{order_id}", response_model=OrderOut)
def get_order(order_id: int, db: Session = Depends(get_db), user=Depends(current_user)):
    order = order_service.get_order(db, order_id)
    if user["role"] == "customer" and order.customer_id != user["id"]:
        raise HTTPException(404, "Order not found")
    return order


@router.patch("/{order_id}/status", response_model=OrderOut, dependencies=[Depends(admin_user)])
def update_status(order_id: int, data: OrderStatusUpdate, db: Session = Depends(get_db)):
    return order_service.update_status(db, order_id, data.status)
