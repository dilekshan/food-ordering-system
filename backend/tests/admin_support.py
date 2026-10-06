"""Direct MySQL assertions and scoped fixtures for the admin browser test."""
import json
import sys
import uuid
from pathlib import Path
from decimal import Decimal

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from PIL import Image
from sqlalchemy import text
from app.config import settings
from app.database import SessionLocal, engine
from app.models import Category, Food, Customer, Order
from app.services.image_service import managed_path, remove_unused_image

action, filename = sys.argv[1:3]
path = Path(filename)
if action == "credentials":
    # Captured in memory by the test; never included in the test report or fixture file.
    print(json.dumps({"email": settings.ADMIN_EMAIL, "password": settings.ADMIN_PASSWORD}))
    raise SystemExit()
assert engine.dialect.name == "mysql", "Use the existing MySQL database for admin browser verification"
if action == "setup":
    tag = uuid.uuid4().hex[:12]
    path.parent.mkdir(parents=True, exist_ok=True)
    for name, fmt, color in [("first.png", "PNG", "orange"), ("replacement.webp", "WEBP", "green")]:
        Image.new("RGB", (160, 120), color).save(path.parent / name, format=fmt)
    path.write_text(json.dumps({"tag": tag, "email": f"admin-flow-{tag}@example.com", "categories": [], "foods": []}))
    raise SystemExit()
fixture = json.loads(path.read_text())
with SessionLocal() as db:
    if action == "verify-food":
        expected = fixture["expected_food"]
        food = db.get(Food, expected["id"])
        assert food is not None
        for key in ("name", "description", "category_id", "is_available", "image_url"):
            assert getattr(food, key) == expected[key], key
        assert food.price == Decimal(str(expected["price"]))
        image_path = managed_path(food.image_url)
        assert image_path and image_path.is_file()
        with Image.open(image_path) as image:
            image.verify()
        category = db.get(Category, food.category_id)
        assert category.description == "Edited category description"
        print("PASS: category, food fields and image path in MySQL; decoded image on disk")
    elif action == "verify-dashboard":
        dashboard = fixture["dashboard"]
        for table, key in [("foods", "total_foods"), ("categories", "total_categories"), ("customers", "total_customers"), ("orders", "total_orders")]:
            assert dashboard[key] == db.execute(text(f"SELECT COUNT(*) FROM {table}")).scalar(), key
        for status, key in [("Pending", "pending_orders"), ("Delivered", "delivered_orders")]:
            assert dashboard[key] == db.execute(text("SELECT COUNT(*) FROM orders WHERE status=:status"), {"status": status}).scalar(), key
        revenue = db.execute(text("SELECT COALESCE(SUM(total_amount),0) FROM orders WHERE status <> 'Cancelled'")).scalar()
        assert Decimal(str(dashboard["total_revenue"])) == revenue
        popular = db.execute(text("SELECT f.name, SUM(i.quantity) AS orders FROM foods f JOIN order_items i ON i.food_id=f.id JOIN orders o ON o.id=i.order_id WHERE o.status <> 'Cancelled' GROUP BY f.id,f.name ORDER BY SUM(i.quantity) DESC,f.id LIMIT 5")).all()
        assert dashboard["popular_foods"] == [{"name": name, "orders": int(count)} for name, count in popular]
        recent = db.execute(text("SELECT id,total_amount,status FROM orders ORDER BY id DESC LIMIT 5")).all()
        assert dashboard["recent_orders"] == [{"id": row.id, "total_amount": float(row.total_amount), "status": row.status} for row in recent]
        print("PASS: every dashboard metric matches independent MySQL queries")
    elif action == "verify-order":
        order = db.get(Order, fixture["order_id"])
        assert order.status == "Delivered" and order.customer.email == fixture["email"]
        assert order.total_amount == Decimal("45.50") and len(order.items) == 1
        item = order.items[0]
        assert item.food_id == fixture["foods"][0] and item.quantity == 2
        assert item.unit_price == Decimal("22.75") and item.subtotal == Decimal("45.50")
        print("PASS: admin status update, customer order and item totals saved in MySQL")
    elif action == "verify-delete":
        assert db.get(Food, fixture["deleted_food"]) is None
        assert db.get(Category, fixture["deleted_category"]) is None
        assert not managed_path(fixture["deleted_image"]).exists()
        print("PASS: deleted food/category absent in MySQL and unused image removed")
    elif action == "cleanup":
        customer = db.query(Customer).filter(Customer.email == fixture["email"]).first()
        if customer:
            for order in list(customer.orders):
                db.delete(order)
            db.flush()
            db.delete(customer)
            db.flush()
        images = []
        for food in db.query(Food).filter(Food.category_id.in_(fixture["categories"])).all():
            images.append(food.image_url)
            db.delete(food)
        db.flush()
        for category in db.query(Category).filter(Category.id.in_(fixture["categories"])).all():
            db.delete(category)
        db.commit()
        for url in images + fixture.get("uploads", []):
            remove_unused_image(db, url)
        print("Admin test fixtures removed; existing records preserved")
