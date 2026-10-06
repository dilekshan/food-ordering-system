import hashlib
import hmac
import os
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.config import settings
from app.auth import issue_token, admin_user
from sqlalchemy.exc import IntegrityError
from app.database import get_db
from app.models.customer import Customer
from app.schemas.customer import AuthOut, CustomerCreate, CustomerLogin, CustomerOut

router = APIRouter()


def hash_password(password: str) -> str:
    salt = os.urandom(16).hex()
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 100_000).hex()
    return f"{salt}${digest}"


def verify_password(password: str, stored: str) -> bool:
    try:
        salt, digest = stored.split("$")
    except (ValueError, AttributeError):
        return False
    check = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 100_000).hex()
    return hmac.compare_digest(check, digest)


@router.post("/register", response_model=AuthOut, status_code=201)
def register(data: CustomerCreate, db: Session = Depends(get_db)):
    email = data.email.lower()
    if email == settings.ADMIN_EMAIL.lower() or db.query(Customer).filter(Customer.email == email).first():
        raise HTTPException(409, "Email already registered")
    customer = Customer(name=data.name, email=email, phone=data.phone, address=data.address,
                        password_hash=hash_password(data.password))
    db.add(customer)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "Email already registered")
    db.refresh(customer)
    return AuthOut(role="customer", id=customer.id, name=customer.name, email=customer.email,
                   phone=customer.phone, address=customer.address)


@router.post("/login", response_model=AuthOut)
def login(data: CustomerLogin, db: Session = Depends(get_db)):
    email = data.email.strip().lower()
    if email == settings.ADMIN_EMAIL.lower() and data.password == settings.ADMIN_PASSWORD:
        return AuthOut(role="admin", id=0, name="Admin", email=settings.ADMIN_EMAIL, access_token=issue_token(0, "admin"))
    customer = db.query(Customer).filter(Customer.email == email).first()
    if not customer or not verify_password(data.password, customer.password_hash):
        raise HTTPException(401, "Invalid email or password")
    return AuthOut(role="customer", id=customer.id, name=customer.name, email=customer.email,
                   phone=customer.phone, address=customer.address, access_token=issue_token(customer.id, "customer"))


@router.get("/", response_model=List[CustomerOut], dependencies=[Depends(admin_user)])
def list_customers(db: Session = Depends(get_db)):
    return db.query(Customer).order_by(Customer.id.desc()).all()
