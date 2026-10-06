"""Create and clean up only this browser run's fixtures in the existing MySQL DB."""
import json
import sys
import uuid
from pathlib import Path
from decimal import Decimal

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.database import SessionLocal, engine
from app.models import Category, Food, Customer, Order, OrderItem
from app.auth import issue_token

action, filename = sys.argv[1:3]
path = Path(filename)
assert engine.dialect.name == "mysql", "Browser tests must use the existing MySQL database"
with SessionLocal() as db:
    if action == "setup":
        tag = uuid.uuid4().hex[:12]
        category = Category(name=f"Browser test {tag}")
        db.add(category)
        db.flush()
        foods = [Food(name=f"Test meal {tag} {i}", price=Decimal("12.50") + i, category_id=category.id, is_available=i != 9) for i in range(10)]
        db.add_all(foods)
        db.commit()
        fixture = {"category": category.id, "category_name": category.name, "foods": [{"id": f.id, "name": f.name, "price": float(f.price)} for f in foods], "email": f"browser-{tag}@example.com", "other_email": f"other-{tag}@example.com", "admin_token": issue_token(0, "admin")}
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(fixture))
    else:
        fixture = json.loads(path.read_text())
        customers = db.query(Customer).filter(Customer.email.in_([fixture["email"], fixture["other_email"]])).all()
        if action == "verify":
            customer = next(c for c in customers if c.email == fixture["email"])
            assert customer.name == "Browser Customer"
            assert customer.phone == "0771234567" and customer.address == "123 Browser Street"
            assert customer.password_hash and customer.password_hash != "TestPassword123!"
            order = db.get(Order, fixture["order_id"])
            assert order.customer_id == customer.id and order.address == "456 Delivery Road"
            assert order.status == "Delivered"
            assert len(order.items) == 2
            assert {i.food_id: i.quantity for i in order.items} == {fixture["foods"][0]["id"]: 2, fixture["foods"][1]["id"]: 1}
            assert order.total_amount == Decimal("38.50")
            for item in order.items:
                assert item.subtotal == item.unit_price * item.quantity
                assert item.food_name == db.get(Food, item.food_id).name
            print("PASS: customer, hashed password, order, both order items, prices, subtotals, address and status persisted in MySQL")
        elif action == "cleanup":
            for customer in customers:
                for order in list(customer.orders):
                    db.delete(order)
                db.flush()
                db.delete(customer)
            db.flush()
            db.query(Food).filter(Food.id.in_([f["id"] for f in fixture["foods"]])).delete(synchronize_session=False)
            db.query(Category).filter(Category.id == fixture["category"]).delete(synchronize_session=False)
            db.commit()
            print("Browser fixtures removed; pre-existing records preserved")
