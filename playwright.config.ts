import { defineConfig } from "@playwright/test";
const port = process.env.E2E_PORT ?? "2570";
export default defineConfig({
  testDir: "tests/e2e",
  workers: 1,
  timeout: 60000,
  use: {
    baseURL: "http://127.0.0.1:" + port,
    headless: true,
    launchOptions: {
      executablePath: process.env.CHROMIUM_PATH ?? "/usr/bin/chromium",
      args: ["--no-sandbox"],
    },
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run host",
    url: "http://127.0.0.1:" + port + "/api/health",
    env: { PORT: port, DATA_DIR: process.env.E2E_DATA_DIR ?? ".data/e2e" },
    reuseExistingServer: false,
    timeout: 30000,
  },
});
