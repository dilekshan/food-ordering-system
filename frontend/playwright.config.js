import { defineConfig } from "@playwright/test";
import { randomBytes } from "node:crypto";

process.env.AUTH_SECRET ||= randomBytes(32).toString("hex");
export default defineConfig({
  testDir: "./tests",
  timeout: 600000,
  expect: { timeout: 15000 },
  workers: 1,
  reporter: [["list"], ["json", { outputFile: "test-results/results.json" }]],
  use: { baseURL: "http://127.0.0.1:15174", channel: "msedge", headless: true, trace: "retain-on-failure", screenshot: "only-on-failure" },
  webServer: [
    { command: "..\\backend\\.venv\\Scripts\\python.exe -m uvicorn app.main:app --app-dir ../backend --host 127.0.0.1 --port 18100", url: "http://127.0.0.1:18100/api/health", timeout: 120000 },
    { command: "node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 15174", url: "http://127.0.0.1:15174", env: { API_PROXY_TARGET: "http://127.0.0.1:18100" }, timeout: 120000 },
  ],
});
