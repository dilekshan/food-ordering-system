"""Signed, expiring sessions without adding database tables."""
import base64
import hashlib
import hmac
import json
import os
import secrets
import time

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.customer import Customer

SECRET = os.getenv("AUTH_SECRET") or secrets.token_hex(32)
bearer = HTTPBearer(auto_error=False)


def issue_token(customer_id: int, role: str):
    payload = base64.urlsafe_b64encode(json.dumps({
        "id": customer_id, "role": role, "exp": int(time.time()) + 86400,
    }).encode()).decode()
    signature = hmac.new(SECRET.encode(), payload.encode(), hashlib.sha256).hexdigest()
    return f"{payload}.{signature}"


def current_user(credentials: HTTPAuthorizationCredentials = Depends(bearer), db: Session = Depends(get_db)):
    try:
        payload, signature = credentials.credentials.split(".")
        expected = hmac.new(SECRET.encode(), payload.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(signature, expected):
            raise ValueError()
        user = json.loads(base64.urlsafe_b64decode(payload))
        if user["exp"] <= time.time() or user["role"] not in ("customer", "admin"):
            raise ValueError()
        if user["role"] == "customer" and not db.get(Customer, user["id"]):
            raise ValueError()
        return user
    except (AttributeError, ValueError, KeyError, TypeError):
        raise HTTPException(401, "Please log in again", headers={"WWW-Authenticate": "Bearer"})


def admin_user(user=Depends(current_user)):
    if user["role"] != "admin":
        raise HTTPException(403, "Admin access required")
    return user
