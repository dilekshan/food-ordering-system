from typing import List, Optional
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class FoodBase(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    name: str = Field(min_length=1, max_length=150)
    description: Optional[str] = Field(default=None, max_length=500)
    price: Decimal = Field(gt=0, max_digits=10, decimal_places=2)
    image_url: Optional[str] = Field(default=None, max_length=255)
    is_available: bool = True
    category_id: int = Field(gt=0)


class FoodCreate(FoodBase):
    pass


class FoodUpdate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    name: Optional[str] = Field(default=None, min_length=1, max_length=150)
    description: Optional[str] = Field(default=None, max_length=500)
    price: Optional[Decimal] = Field(default=None, gt=0, max_digits=10, decimal_places=2)
    image_url: Optional[str] = Field(default=None, max_length=255)
    is_available: Optional[bool] = None
    category_id: Optional[int] = Field(default=None, gt=0)

    @model_validator(mode="after")
    def required_fields_cannot_be_null(self):
        for field in ("name", "price", "is_available", "category_id"):
            if field in self.model_fields_set and getattr(self, field) is None:
                raise ValueError(f"{field} cannot be null")
        return self


class FoodOut(FoodBase):
    model_config = ConfigDict(from_attributes=True)
    price: float
    id: int
    category_name: Optional[str] = Field(default=None, min_length=1, max_length=150)


class FoodList(BaseModel):
    items: List[FoodOut]
    total: int
    page: int
    pages: int
