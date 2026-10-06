from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.order_item import OrderItemCreate, OrderItemOut
from app.schemas.customer import CustomerOut


class OrderCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    customer_id: int
    address: str = Field(min_length=1)
    items: List[OrderItemCreate]


class OrderStatusUpdate(BaseModel):
    status: str


class OrderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    customer_id: int
    customer_name: Optional[str] = None
    customer: Optional[CustomerOut] = None
    total_amount: float
    status: str
    address: Optional[str] = None
    created_at: Optional[datetime] = None
    items: List[OrderItemOut] = []
