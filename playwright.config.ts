import { defineConfig, devices } from "@playwright/test";
import { resolve } from "node:path";

// The standalone Next.js server changes its working directory to
// `.next/standalone`. Absolute paths keep setup and runtime on the same
// isolated database and asset directory.
process.env.DATABASE_URL = resolve("./data/alarkive.e2e.db");
process.env.ALARKIVE_ASSETS_DIR = resolve("./data/assets.e2e");
process.env.ALARKIVE_ADMIN_USERNAME = "e2e";
process.env.ALARKIVE_ADMIN_PASSWORD = "e2e-only-password";
process.env.PORT = "3200";
process.env.HOSTNAME = "127.0.0.1";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:3200",
    httpCredentials: {
      username: "e2e",
      password: "e2e-only-password",
    },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    ...devices["Desktop Chrome"],
  },
  webServer: {
    command: "node tests/e2e/start-server.mjs",
    url: "http://127.0.0.1:3200/api/health",
    timeout: 60_000,
    reuseExistingServer: false,
    env: {
      DATABASE_URL: process.env.DATABASE_URL,
      ALARKIVE_ASSETS_DIR: process.env.ALARKIVE_ASSETS_DIR,
      ALARKIVE_ADMIN_USERNAME: process.env.ALARKIVE_ADMIN_USERNAME,
      ALARKIVE_ADMIN_PASSWORD: process.env.ALARKIVE_ADMIN_PASSWORD,
      PORT: process.env.PORT,
      HOSTNAME: process.env.HOSTNAME,
    },
  },
});
