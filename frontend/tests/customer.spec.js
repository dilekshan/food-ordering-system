import { test, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const fixturePath = path.resolve("test-results/customer-fixture.json");
const python = path.resolve("../backend/.venv/Scripts/python.exe");
const helper = path.resolve("../backend/tests/browser_support.py");
let fixture;
const password = "TestPassword123!";
const support = (action) => execFileSync(python, [helper, action, fixturePath], { encoding: "utf8" });
test.beforeAll(() => { support("setup"); fixture = JSON.parse(fs.readFileSync(fixturePath)); });
test.afterAll(() => { if (fixture) console.log(support("cleanup")); });

test("complete customer journey on MySQL", async ({ page, request, browser }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await test.step("Protected Routes", async () => {
    for (const route of ["/", "/foods", "/categories", "/my-orders", "/cart", "/checkout", "/order-confirmation/1", "/unknown", "/admin"]) {
      await page.goto(route);
      await expect(page).toHaveURL(/\/login$/);
      await expect(page.getByRole("heading", { name: "Login", exact: true })).toBeVisible();
    }
    expect((await request.get("/api/orders/")).status()).toBe(401);
    expect((await request.get("/api/foods/")).status()).toBe(401);
  });
  await test.step("Registration", async () => {
    await page.getByRole("link", { name: "Create an account" }).click();
    await page.getByLabel("Full name").fill("Browser Customer");
    await page.getByLabel("Phone").fill("0771234567");
    await page.getByLabel("Address", { exact: true }).fill("123 Browser Street");
    await page.getByLabel("Email").fill(fixture.email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Register", exact: true }).click();
    await expect(page).toHaveURL(/\/login$/);
    expect(await page.evaluate(() => localStorage.getItem("foodie_user"))).toBeNull();
  });
  await test.step("Login", async () => {
    await page.getByLabel("Email").fill(fixture.email);
    await page.getByLabel("Password").fill("wrong-password");
    await page.getByRole("button", { name: "Login", exact: true }).click();
    await expect(page.getByRole("alert")).toContainText("Invalid email or password");
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Login", exact: true }).click();
    await expect(page).toHaveURL("http://127.0.0.1:15174/");
  });
  const user = await page.evaluate(() => JSON.parse(localStorage.getItem("foodie_user")));
  const headers = { Authorization: `Bearer ${user.access_token}` };
  await test.step("Home Page", async () => {
    await expect(page.getByRole("heading", { name: /Delicious Food/ })).toBeVisible();
    await expect(page.locator(".food-card").first()).toBeVisible();
    await expect(page.locator(".food-card .img-placeholder").first()).toBeVisible();
    await page.reload();
    await expect(page.getByText("Hi, Browser Customer")).toBeVisible();
    await page.getByRole("link", { name: "View All" }).click();
    await expect(page).toHaveURL(/\/foods$/);
    await page.getByRole("link", { name: "Home", exact: true }).click();
    await page.getByPlaceholder("Search for food...").fill(fixture.foods[0].name);
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await expect(page.locator(".food-card")).toHaveCount(1);
  });
  await test.step("Categories and Foods", async () => {
    await page.getByRole("link", { name: "Categories", exact: true }).click();
    const categories = await (await request.get("/api/categories/", { headers })).json();
    await expect(page.locator(".category-card")).toHaveCount(categories.length);
    await page.getByRole("link", { name: new RegExp(fixture.category_name) }).click();
    await expect(page.locator(".food-card")).toHaveCount(8);
    await page.locator(".pagination").getByRole("button", { name: "2", exact: true }).click();
    await expect(page.locator(".food-card")).toHaveCount(1);
    await page.locator(".pagination").getByRole("button", { name: "‹", exact: true }).click();
    await expect(page.locator(".food-card")).toHaveCount(8);
    await page.locator(".pagination").getByRole("button", { name: "›", exact: true }).click();
    await expect(page.locator(".food-card")).toHaveCount(1);
    await page.getByRole("button", { name: "All", exact: true }).click();
    await expect(page.locator(".food-card")).toHaveCount(8);
    await page.getByRole("button", { name: fixture.category_name, exact: true }).click();
    await expect(page.locator(".food-card")).toHaveCount(8);
    expect(await page.getByText(fixture.foods[9].name, { exact: true }).count()).toBe(0);
  });
  const search = async (name) => {
    await page.getByRole("link", { name: "Foods", exact: true }).click();
    await page.getByPlaceholder("Search for food...").fill(name);
    await page.getByRole("button", { name: "Search", exact: true }).click();
    if (name === "no-such-food-xyz") await expect(page.getByText("No foods found.")).toBeVisible();
    else await expect(page.locator(".food-card h4")).toHaveText([name]);
  };
  await test.step("Search", async () => {
    await search("no-such-food-xyz");
    await expect(page.getByText("No foods found.")).toBeVisible();
    await search(fixture.foods[0].name);
    await expect(page.locator(".food-card")).toHaveCount(1);
    await expect(page.locator(".food-card h4")).toHaveText(fixture.foods[0].name);
  });
  await test.step("Add to Cart and Update Quantity", async () => {
    await page.getByRole("button", { name: "Add to Cart" }).click();
    await page.getByRole("link", { name: "Cart", exact: true }).click();
    await expect(page.locator(".cart-item")).toHaveCount(1);
    await page.getByRole("button", { name: `Increase ${fixture.foods[0].name}` }).click();
    await expect(page.locator(".cart-total h3")).toHaveText("Total: Rs. 25.00");
    await page.getByRole("button", { name: `Decrease ${fixture.foods[0].name}` }).click();
    await expect(page.locator(".cart-total h3")).toHaveText("Total: Rs. 12.50");
    await expect(page.getByRole("button", { name: `Decrease ${fixture.foods[0].name}` })).toBeDisabled();
    await page.reload();
    await expect(page.locator(".cart-item")).toHaveCount(1);
  });
  await test.step("Remove from Cart and Clear Cart", async () => {
    await page.getByRole("button", { name: "Remove" }).click();
    await expect(page.getByRole("heading", { name: "Your cart is empty" })).toBeVisible();
    await page.getByRole("link", { name: "Browse Foods" }).click();
    await search(fixture.foods[0].name);
    await page.getByRole("button", { name: "Add to Cart" }).click();
    await page.getByRole("link", { name: "Cart", exact: true }).click();
    await page.getByRole("button", { name: "Clear Cart" }).click();
    await expect(page.getByRole("heading", { name: "Your cart is empty" })).toBeVisible();
  });
  await test.step("Place Order", async () => {
    for (const food of fixture.foods.slice(0, 2)) {
      await search(food.name);
      await page.getByRole("button", { name: "Add to Cart" }).click();
    }
    await page.getByRole("link", { name: "Cart", exact: true }).click();
    await page.getByRole("button", { name: `Increase ${fixture.foods[0].name}` }).click();
    await expect(page.locator(".cart-total h3")).toHaveText("Total: Rs. 38.50");
    await page.getByRole("link", { name: "Checkout", exact: true }).click();
    await expect(page.getByLabel("Delivery address")).toHaveValue("123 Browser Street");
    await page.getByLabel("Delivery address").fill("456 Delivery Road");
    await page.getByRole("button", { name: "Place Order" }).click();
    await expect(page).toHaveURL(/\/order-confirmation\/\d+$/);
    await expect(page.getByRole("heading", { name: "Total: Rs. 38.50" })).toBeVisible();
    await expect(page.locator(".badge")).toHaveText("Pending");
    fixture.order_id = Number(page.url().split("/").pop());
    fs.writeFileSync(fixturePath, JSON.stringify(fixture));
  });
  await test.step("My Orders and customer isolation", async () => {
    await page.getByRole("link", { name: "View My Orders" }).click();
    await expect(page.locator(".order-card")).toHaveCount(1);
    await page.getByRole("button", { name: "View", exact: true }).click();
    await expect(page.getByText("Deliver to: 456 Delivery Road")).toBeVisible();
    await page.getByRole("button", { name: "Hide", exact: true }).click();
    await expect(page.getByText("Deliver to: 456 Delivery Road")).toHaveCount(0);
    const adminHeaders = { Authorization: `Bearer ${fixture.admin_token}` };
    const changed = await request.patch(`/api/orders/${fixture.order_id}/status`, { headers: adminHeaders, data: { status: "Delivered" } });
    expect(changed.status()).toBe(200);
    await page.reload();
    await expect(page.locator(".badge")).toHaveText("Delivered");
    const other = await browser.newContext();
    const otherPage = await other.newPage();
    await otherPage.goto("http://127.0.0.1:15174/register");
    await otherPage.getByLabel("Full name").fill("Second Customer");
    await otherPage.getByLabel("Email").fill(fixture.other_email);
    await otherPage.getByLabel("Password").fill(password);
    await otherPage.getByRole("button", { name: "Register", exact: true }).click();
    await expect(otherPage).toHaveURL(/\/login$/);
    await otherPage.getByLabel("Email").fill(fixture.other_email);
    await otherPage.getByLabel("Password").fill(password);
    await otherPage.getByRole("button", { name: "Login", exact: true }).click();
    await expect(otherPage).toHaveURL("http://127.0.0.1:15174/");
    await otherPage.getByRole("link", { name: "My Orders", exact: true }).click();
    await expect(otherPage.getByText("You have no orders yet.")).toBeVisible();
    const otherUser = await otherPage.evaluate(() => JSON.parse(localStorage.getItem("foodie_user")));
    const otherHeaders = { Authorization: `Bearer ${otherUser.access_token}` };
    expect((await request.get(`/api/orders/${fixture.order_id}`, { headers: otherHeaders })).status()).toBe(404);
    expect((await request.get(`/api/orders/?customer_id=${user.id}`, { headers: otherHeaders })).status()).toBe(403);
    expect((await request.post("/api/orders/", { headers: otherHeaders, data: { customer_id: user.id, address: "X", items: [{ food_id: fixture.foods[0].id, quantity: 1 }] } })).status()).toBe(403);
    expect((await request.patch(`/api/orders/${fixture.order_id}/status`, { headers, data: { status: "Cancelled" } })).status()).toBe(403);
    await otherPage.goto(`http://127.0.0.1:15174/order-confirmation/${fixture.order_id}`);
    await expect(otherPage.getByRole("alert")).toHaveText("Order not found");
    await other.close();
  });
  await test.step("Customer and Order Data Saved in MySQL", async () => { console.log(support("verify")); });
  await test.step("Logout", async () => {
    await page.getByRole("button", { name: "Logout", exact: true }).click();
    await expect(page).toHaveURL(/\/login$/);
    expect(await page.evaluate(() => localStorage.getItem("foodie_user"))).toBeNull();
    await page.goto("/my-orders");
    await expect(page).toHaveURL(/\/login$/);
  });
  expect(errors).toEqual([]);
});
