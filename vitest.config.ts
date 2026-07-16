import { configDefaults, defineConfig } from "vitest/config";

process.env.DATABASE_URL = "./data/alarkive.test.db";
process.env.ALARKIVE_ASSETS_DIR = "./data/assets.test";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./tests/setup/vitest.ts"],
    exclude: [...configDefaults.exclude, "tests/e2e/**"],
    fileParallelism: false,
    maxWorkers: 1,
  },
  resolve: {
    alias: {
      "@": new URL("./src", import.meta.url).pathname,
    },
  },
});
