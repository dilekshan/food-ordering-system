import os
import tempfile
import unittest
from io import BytesIO
from PIL import Image

temporary = tempfile.TemporaryDirectory()
os.environ["DATABASE_URL"] = "sqlite:///" + temporary.name.replace("\\", "/") + "/test.db"
from fastapi.testclient import TestClient
from app.main import app
from app.database import engine
from app.config import settings


def tearDownModule():
    engine.dispose()
    temporary.cleanup()


class IntegrationTest(unittest.TestCase):
    def test_admin_images_and_validation(self):
        with TestClient(app) as client:
            self.assertEqual(client.post("/api/foods/images", files={"file": ("x.png", b"bad", "image/png")}).status_code, 401)
            self.assertEqual(client.post("/api/categories/images", files={"file": ("x.png", b"bad", "image/png")}).status_code, 401)
            origin = settings.CORS_ORIGINS[0]
            preflight = client.options("/api/foods/images", headers={"Origin": origin, "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "authorization,content-type"})
            self.assertEqual(preflight.status_code, 200)
            self.assertEqual(preflight.headers["access-control-allow-origin"], origin)
            admin = client.post("/api/customers/login", json={"email": settings.ADMIN_EMAIL, "password": settings.ADMIN_PASSWORD}).json()
            client.headers.update({"Authorization": f"Bearer {admin['access_token']}"})
            for name, content, mime, expected in [
                ("x.svg", b"<svg/>", "image/svg+xml", 422),
                ("x.png", b"not an image", "image/png", 422),
                ("x.png", b"a" * (5 * 1024 * 1024 + 1), "image/png", 413),
            ]:
                self.assertEqual(client.post("/api/foods/images", files={"file": (name, content, mime)}).status_code, expected)
            uploaded = []
            for extension, fmt, mime in [("jpg", "JPEG", "image/jpeg"), ("jpeg", "JPEG", "image/jpeg"), ("png", "PNG", "image/png"), ("webp", "WEBP", "image/webp")]:
                data = BytesIO()
                Image.new("RGB", (20, 20), "orange").save(data, format=fmt)
                result = client.post("/api/foods/images", files={"file": (f"food.{extension}", data.getvalue(), mime)})
                self.assertEqual(result.status_code, 201, result.text)
                uploaded.append(result.json()["image_url"])
                self.assertEqual(client.get(uploaded[-1]).status_code, 200)
            category = client.post("/api/categories/", json={"name": "Image test", "description": "Category details"}).json()
            self.assertEqual(category["description"], "Category details")
            category_data = BytesIO()
            Image.new("RGB", (20, 20), "green").save(category_data, format="PNG")
            category_image = client.post("/api/categories/images", files={"file": ("category.png", category_data.getvalue(), "image/png")}).json()["image_url"]
            category = client.put(f"/api/categories/{category['id']}", json={
                "name": category["name"], "description": category["description"], "image_url": category_image,
            }).json()
            self.assertEqual(category["image_url"], category_image)
            self.assertEqual(client.get("/api/categories/").json()[0]["image_url"], category_image)
            self.assertEqual(client.delete(f"/api/foods/images/{category_image.split('/')[-1]}").status_code, 409)
            payload = {"name": "Image food", "price": 12.50, "category_id": category["id"], "image_url": uploaded[0]}
            self.assertEqual(client.post("/api/foods/", json={**payload, "price": 0}).status_code, 422)
            self.assertEqual(client.post("/api/foods/", json={**payload, "price": 0.001}).status_code, 422)
            self.assertEqual(client.post("/api/foods/", json={**payload, "description": "x" * 501}).status_code, 422)
            self.assertEqual(client.post("/api/foods/", json={**payload, "image_url": "https://example.com/" + "x" * 255}).status_code, 422)
            self.assertEqual(client.post("/api/categories/", json={"name": "Too long", "description": "x" * 256}).status_code, 422)
            self.assertEqual(client.post("/api/foods/", json={**payload, "category_id": 99999999}).status_code, 400)
            food = client.post("/api/foods/", json=payload).json()
            shared = client.post("/api/foods/", json={**payload, "name": "Shared image food"}).json()
            filename = uploaded[0].split("/")[-1]
            self.assertEqual(client.delete(f"/api/foods/images/{filename}").status_code, 409)
            self.assertEqual(client.put(f"/api/foods/{food['id']}", json={"image_url": uploaded[1]}).status_code, 200)
            self.assertEqual(client.get(uploaded[0]).status_code, 200)
            self.assertEqual(client.delete(f"/api/foods/{shared['id']}").status_code, 204)
            self.assertEqual(client.get(uploaded[0]).status_code, 404)
            self.assertEqual(client.delete(f"/api/foods/{food['id']}").status_code, 204)
            self.assertEqual(client.get(uploaded[1]).status_code, 404)
            for url in uploaded[2:]:
                self.assertEqual(client.delete("/api/foods/images/" + url.split("/")[-1]).status_code, 204)
                self.assertEqual(client.get(url).status_code, 404)
            self.assertEqual(client.delete(f"/api/categories/{category['id']}").status_code, 204)
            self.assertEqual(client.get(category_image).status_code, 404)

    def test_customer_and_admin_workflow(self):
        with TestClient(app) as client:
            self.assertEqual(client.get("/api/health").json()["database"], "ok")
            self.assertEqual(client.get("/api/orders/").status_code, 401)
            self.assertEqual(client.get("/api/dashboard/notifications").status_code, 401)
            admin = client.post("/api/customers/login", json={"email": settings.ADMIN_EMAIL, "password": settings.ADMIN_PASSWORD}).json()
            admin_headers = {"Authorization": f"Bearer {admin['access_token']}"}
            client.headers.update(admin_headers)
            notification_baseline = client.get("/api/dashboard/notifications").json()["latest_order_id"]
            category = client.post("/api/categories/", json={"name": "Test meals"})
            self.assertEqual(category.status_code, 201, category.text)
            cid = category.json()["id"]
            self.assertEqual(client.post("/api/categories/", json={"name": "   "}).status_code, 422)
            food = client.post("/api/foods/", json={"name": "Rice", "price": 12.50, "category_id": cid})
            self.assertEqual(food.status_code, 201, food.text)
            fid = food.json()["id"]
            self.assertEqual(client.put(f"/api/foods/{fid}", json={"price": None}).status_code, 422)
            self.assertEqual(client.put(f"/api/foods/{fid}", json={"name": " "}).status_code, 422)
            self.assertEqual(client.get("/api/foods/", params={"search": "Rice", "category_id": cid}).json()["total"], 1)
            customer = client.post("/api/customers/register", json={"name": "Test Customer", "email": "test@example.com", "password": "test1234"})
            self.assertEqual(customer.status_code, 201, customer.text)
            uid = customer.json()["id"]
            self.assertEqual(client.post("/api/customers/login", json={"email": "test@example.com", "password": "wrong"}).status_code, 401)
            self.assertEqual(client.post("/api/customers/login", json={"email": "test@example.com", "password": "test1234"}).json()["id"], uid)
            self.assertEqual(client.post("/api/customers/login", json={"email": settings.ADMIN_EMAIL, "password": settings.ADMIN_PASSWORD}).json()["role"], "admin")
            payload = {"customer_id": uid, "address": "123 Test Street", "items": [{"food_id": fid, "quantity": 2}]}
            customer_login = client.post("/api/customers/login", json={"email": "test@example.com", "password": "test1234"}).json()
            customer_headers = {"Authorization": f"Bearer {customer_login['access_token']}"}
            client.headers.update(customer_headers)
            self.assertEqual(client.post("/api/orders/", json={**payload, "address": " "}).status_code, 422)
            self.assertEqual(client.post("/api/orders/", json={**payload, "items": []}).status_code, 400)
            order = client.post("/api/orders/", json=payload)
            self.assertEqual(order.status_code, 201, order.text)
            oid = order.json()["id"]
            self.assertEqual(order.json()["total_amount"], 25)
            self.assertEqual(client.get(f"/api/orders/{oid}").json()["items"][0]["food_name"], "Rice")
            self.assertEqual(len(client.get("/api/orders/", params={"customer_id": uid}).json()), 1)
            self.assertEqual(client.get("/api/orders/", params={"customer_id": uid + 1}).status_code, 403)
            self.assertEqual(client.get("/api/customers/").status_code, 403)
            self.assertEqual(client.patch(f"/api/orders/{oid}/status", json={"status": "Delivered"}).status_code, 403)
            client.headers.update(admin_headers)
            notifications = client.get("/api/dashboard/notifications", params={"after_id": notification_baseline}).json()
            self.assertEqual(notifications["new_count"], 1)
            self.assertEqual(notifications["orders"][0]["id"], oid)
            self.assertEqual(notifications["orders"][0]["customer_name"], "Test Customer")
            self.assertEqual(client.patch(f"/api/orders/{oid}/status", json={"status": "Delivered"}).status_code, 200)
            self.assertEqual(client.get("/api/dashboard/").json()["total_revenue"], 25)
            self.assertEqual(len(client.get("/api/customers/").json()), 1)
            self.assertEqual(client.delete(f"/api/categories/{cid}").status_code, 409)
            self.assertEqual(client.put(f"/api/foods/{fid}", json={"is_available": False}).status_code, 200)
            self.assertEqual(client.post("/api/orders/", json=payload, headers=customer_headers).status_code, 400)
            self.assertEqual(client.get("/api/foods/", params={"available_only": True}).json()["total"], 0)
            self.assertEqual(client.delete(f"/api/foods/{fid}").status_code, 409)
            self.assertEqual(client.get(f"/api/orders/{oid}").json()["items"][0]["food_name"], "Rice")
            self.assertEqual(client.delete(f"/api/categories/{cid}").status_code, 409)


if __name__ == "__main__":
    unittest.main()
