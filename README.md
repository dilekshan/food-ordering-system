# Foodie – Food Ordering System

React (Vite) frontend + FastAPI backend + MySQL shared database.
Customer side: browse foods, cart, checkout, my orders. Admin side: dashboard, foods, categories, orders, customers.
The admin dashboard checks for new order notifications every 15 seconds. Admins can upload category images from Category Management; existing databases receive the nullable category image column on startup.

## 1. Database
Use the existing MySQL database configured by `backend/.env`. After installing
backend dependencies, run `python migrate_customer_schema.py` from `backend`.
This repeatable migration adds missing delivery addresses and food-name snapshots,
and aligns legacy order-item price columns without replacing existing records.

## 2. Backend
```bash
cd backend
python -m venv venv && source venv/bin/activate     # Windows: venv\Scripts\activate
pip install -r requirements.txt
# edit .env -> set your MySQL password in DATABASE_URL
uvicorn app.main:app --reload --port 8000
```
API docs: http://localhost:8000/docs

## 3. Frontend
```bash
cd frontend
npm install
npm run dev
```
Open http://localhost:5173

## Logins
- **Admin:** `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `backend/.env`. Log in at `/login`; admins are redirected to `/admin`.
- **Customer:** the site opens at Login. Choose "Create an account", register, then log in separately. Successful login opens Home. All customer pages require login; Logout returns to Login.

## Notes
- Prices are always read from the database when an order is placed.
- API requests use signed bearer sessions that expire after 24 hours. Set a long random `AUTH_SECRET` in `backend/.env` to preserve sessions across server restarts and share sessions between workers; without it a temporary process-specific secret is used. Orders are restricted to their authenticated owner and management APIs require an admin session.
- Food images use an optional image URL; a placeholder icon is shown otherwise.

## Connection and verification

The frontend uses relative `/api` requests. Vite development and preview servers
proxy them to FastAPI at `http://127.0.0.1:8000`. Start both servers. Set `API_PROXY_TARGET` in `frontend/.env` if the backend uses another host or port.
For production, configure your web server to proxy `/api` to FastAPI, or set
`VITE_API_URL` to the backend API URL before building and configure
`CORS_ORIGINS` with the frontend origin.

The backend loads `backend/.env` regardless of the working directory.
Set `DATABASE_URL` to valid MySQL credentials. An access-denied error means the configured credentials need
to be corrected. Tables are initialized at application startup.

Windows PowerShell:
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
.\.venv\Scripts\python.exe migrate_customer_schema.py
.\.venv\Scripts\python.exe -m unittest discover -s tests -v
.\.venv\Scripts\python.exe -m uvicorn app.main:app --port 8000
```
In another terminal:
```powershell
cd frontend
npm.cmd install
npm.cmd run build
npm.cmd run dev
```

Open http://localhost:5173/api/health to verify frontend proxy, backend, and
database connectivity together. The integration test uses a temporary SQLite
database and does not modify the configured MySQL database.

To repeat the live proxy smoke test (uses temporary SQLite data and ports
18000/15173, then stops both test servers):
```powershell
cd backend
.\.venv\Scripts\python.exe tests/smoke_proxy.py
```

## Full customer browser test

With MySQL running and the migration applied, run `npm.cmd run test:e2e` from
`frontend`. The suite uses installed Microsoft Edge, starts its own servers on
ports 18100 and 15174, and tests the actual React/FastAPI/MySQL flow. It verifies
registration, login, protected routes, category browsing, search, pagination,
cart operations, checkout, order status, customer isolation, and logout.
It reads MySQL directly to verify customer fields, password hashing, delivery
address, totals, and both order-item records, then removes only its test fixtures.
Results are written to `frontend/test-results/results.json`.
