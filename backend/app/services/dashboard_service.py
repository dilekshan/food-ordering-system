from sqlalchemy import func
from sqlalchemy.orm import Session
from typing import Optional

from app.models.category import Category
from app.models.customer import Customer
from app.models.food import Food
from app.models.order import Order
from app.models.order_item import OrderItem


def get_order_notifications(db: Session, after_id: Optional[int] = None):
    latest_order_id = db.query(func.max(Order.id)).scalar() or 0
    if after_id is None:
        return {"latest_order_id": latest_order_id, "new_count": 0, "orders": []}

    newer_orders = db.query(Order).filter(Order.id > after_id)
    new_count = newer_orders.count()
    orders = (
        newer_orders.order_by(Order.id.desc())
        .limit(10)
        .all()
    )
    return {
        "latest_order_id": latest_order_id,
        "new_count": new_count,
        "orders": [
            {
                "id": order.id,
                "customer_name": order.customer.name if order.customer else "Customer",
                "total_amount": float(order.total_amount),
                "status": order.status,
            }
            for order in orders
        ],
    }


def get_dashboard(db: Session):
    # Total revenue - cancelled orders are not included
    revenue = (
        db.query(func.coalesce(func.sum(Order.total_amount), 0))
        .filter(Order.status != "Cancelled")
        .scalar()
    )

    # Popular foods
    # order_items.food_id -> foods.id -> foods.name
    popular = (
        db.query(
            Food.name,
            func.sum(OrderItem.quantity).label("orders")
        )
        .join(OrderItem, OrderItem.food_id == Food.id)
        .join(Order, Order.id == OrderItem.order_id)
        .filter(Order.status != "Cancelled")
        .group_by(Food.id, Food.name)
        .order_by(func.sum(OrderItem.quantity).desc(), Food.id)
        .limit(5)
        .all()
    )

    # Recent 5 orders
    recent = (
        db.query(Order)
        .order_by(Order.id.desc())
        .limit(5)
        .all()
    )

    return {
        "total_foods": db.query(Food).count(),

        "total_categories": db.query(Category).count(),

        "total_customers": db.query(Customer).count(),

        "total_orders": db.query(Order).count(),

        "total_revenue": float(revenue or 0),

        "pending_orders": (
            db.query(Order)
            .filter(Order.status == "Pending")
            .count()
        ),

        "delivered_orders": (
            db.query(Order)
            .filter(Order.status == "Delivered")
            .count()
        ),

        "popular_foods": [
            {
                "name": name,
                "orders": int(count)
            }
            for name, count in popular
        ],

        "recent_orders": [
            {
                "id": order.id,
                "total_amount": float(order.total_amount),
                "status": order.status
            }
            for order in recent
        ],
    }
