from decimal import Decimal
from typing import Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.customer import Customer
from app.models.food import Food
from app.models.order import Order
from app.models.order_item import OrderItem
from app.schemas.order import OrderCreate

STATUSES = ["Pending", "Preparing", "Delivered", "Cancelled"]


def create_order(db: Session, data: OrderCreate) -> Order:
    if not db.get(Customer, data.customer_id):
        raise HTTPException(404, "Customer not found")
    if not data.items:
        raise HTTPException(400, "Order must contain at least one item")

    order = Order(customer_id=data.customer_id, address=data.address, status="Pending", total_amount=0)
    total = Decimal("0")
    for item in data.items:
        food = db.get(Food, item.food_id)
        if not food or not food.is_available:
            raise HTTPException(400, f"Food #{item.food_id} is not available")
        total += food.price * item.quantity  # price always taken from DB, never from client
        order.items.append(OrderItem(food_id=food.id, food_name=food.name,
                                     quantity=item.quantity, unit_price=food.price, subtotal=food.price * item.quantity))
    order.total_amount = total
    db.add(order)
    db.commit()
    db.refresh(order)
    return order


def list_orders(db: Session, customer_id: Optional[int] = None, status: Optional[str] = None):
    q = db.query(Order)
    if customer_id:
        q = q.filter(Order.customer_id == customer_id)
    if status:
        q = q.filter(Order.status == status)
    return q.order_by(Order.id.desc()).all()


def get_order(db: Session, order_id: int) -> Order:
    order = db.get(Order, order_id)
    if not order:
        raise HTTPException(404, "Order not found")
    return order


def update_status(db: Session, order_id: int, status: str) -> Order:
    if status not in STATUSES:
        raise HTTPException(400, f"Status must be one of {STATUSES}")
    order = get_order(db, order_id)
    order.status = status
    db.commit()
    db.refresh(order)
    return order
