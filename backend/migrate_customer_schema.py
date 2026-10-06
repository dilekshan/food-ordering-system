"""Align existing MySQL tables with checkout without replacing any records."""
from sqlalchemy import inspect, text
from app.database import engine


def migrate():
    if engine.dialect.name != "mysql":
        raise RuntimeError("This migration is for MySQL")
    with engine.begin() as connection:
        columns = {c["name"] for c in inspect(connection).get_columns("orders")}
        if "address" not in columns:
            connection.execute(text("ALTER TABLE orders ADD COLUMN address TEXT NULL"))
        columns = {c["name"] for c in inspect(connection).get_columns("order_items")}
        if "price" in columns and "unit_price" not in columns:
            connection.execute(text("ALTER TABLE order_items CHANGE COLUMN price unit_price DECIMAL(10,2) NOT NULL"))
        if "food_name" not in columns:
            connection.execute(text("ALTER TABLE order_items ADD COLUMN food_name VARCHAR(150) NULL"))
            connection.execute(text("UPDATE order_items i LEFT JOIN foods f ON f.id=i.food_id SET i.food_name=COALESCE(f.name, 'Deleted food')"))
            connection.execute(text("ALTER TABLE order_items MODIFY COLUMN food_name VARCHAR(150) NOT NULL"))
        if "subtotal" not in columns:
            connection.execute(text("ALTER TABLE order_items ADD COLUMN subtotal DECIMAL(10,2) NULL"))
            connection.execute(text("UPDATE order_items SET subtotal=quantity*unit_price"))
            connection.execute(text("ALTER TABLE order_items MODIFY COLUMN subtotal DECIMAL(10,2) NOT NULL"))
    print("Customer schema migration complete; existing records preserved.")


if __name__ == "__main__":
    migrate()
