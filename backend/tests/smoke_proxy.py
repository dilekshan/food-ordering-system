import os
from pathlib import Path
import subprocess
import sys
import tempfile
import time
import urllib.request
import json
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.config import settings

root = Path(__file__).resolve().parents[2]
def main():
    with tempfile.TemporaryDirectory() as temporary:
        env = {**os.environ, "DATABASE_URL": "sqlite:///" + str(Path(temporary) / "smoke.db").replace("\\", "/")}
        processes = []
        try:
            processes.append(subprocess.Popen([sys.executable, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "18000"], cwd=root / "backend", env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL))
            processes.append(subprocess.Popen(["node", "node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", "15173"], cwd=root / "frontend", env={**env, "API_PROXY_TARGET": "http://127.0.0.1:18000"}, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL))
            for attempt in range(40):
                if any(p.poll() is not None for p in processes):
                    raise RuntimeError("A server exited; check whether ports 18000 and 15173 are already occupied.")
                try:
                    with urllib.request.urlopen("http://127.0.0.1:15173/api/health", timeout=1) as response:
                        assert json.load(response) == {"status": "ok", "database": "ok"}
                    break
                except (OSError, AssertionError, ValueError):
                    time.sleep(0.5)
            else:
                raise RuntimeError("Frontend proxy did not become ready.")
            login = urllib.request.Request("http://127.0.0.1:15173/api/customers/login", data=json.dumps({"email": settings.ADMIN_EMAIL, "password": settings.ADMIN_PASSWORD}).encode(), headers={"Content-Type": "application/json"})
            with urllib.request.urlopen(login) as response:
                token = json.load(response)["access_token"]
            headers = {"Content-Type": "application/json", "Authorization": f"Bearer {token}"}
            request = urllib.request.Request("http://127.0.0.1:15173/api/categories/", data=json.dumps({"name": "Proxy test"}).encode(), headers=headers)
            with urllib.request.urlopen(request) as response:
                assert response.status == 201
            with urllib.request.urlopen(urllib.request.Request("http://127.0.0.1:15173/api/categories/", headers=headers)) as response:
                assert json.load(response)[0]["name"] == "Proxy test"
            with urllib.request.urlopen("http://127.0.0.1:15173/checkout") as response:
                assert b'id="root"' in response.read()
            print("PASS: frontend route, API proxy GET/POST, backend, and isolated database")
        finally:
            for process in reversed(processes):
                process.terminate()
                process.wait(timeout=10)

if __name__ == "__main__":
    main()
