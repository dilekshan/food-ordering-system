from pydantic import BaseModel, ConfigDict, Field


class OrderItemCreate(BaseModel):
    food_id: int
    quantity: int = Field(ge=1, le=100)


class OrderItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    food_id: int | None = None
    food_name: str
    quantity: int
    price: float
