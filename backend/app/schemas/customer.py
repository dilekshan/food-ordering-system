from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class CustomerCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    phone: str = Field(default="", max_length=20)
    address: str = Field(default="", max_length=255)
    password: str = Field(min_length=4)

    @field_validator("name", mode="before")
    @classmethod
    def trim_name(cls, value):
        return value.strip() if isinstance(value, str) else value

    @field_validator("email")
    @classmethod
    def email_length(cls, value):
        if len(value) > 150:
            raise ValueError("Email must not exceed 150 characters")
        return value


class CustomerLogin(BaseModel):
    email: str
    password: str


class CustomerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    email: str
    phone: Optional[str] = Field(default=None, max_length=30)
    address: Optional[str] = None
    created_at: Optional[datetime] = None


class AuthOut(BaseModel):
    access_token: Optional[str] = None
    role: str
    id: int
    name: str
    email: str
    phone: Optional[str] = Field(default=None, max_length=30)
    address: Optional[str] = None
