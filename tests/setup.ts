import { afterAll, beforeAll, beforeEach } from "vitest";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { rmSync } from "node:fs";
import { resolve } from "node:path";
import { db, sqlite } from "@/db";

const databasePath = resolve(
  process.cwd(),
  process.env.DATABASE_URL ?? "./data/alarkive.test.db",
);
const assetsPath = resolve(
  process.cwd(),
  process.env.ALARKIVE_ASSETS_DIR ?? "./data/assets.test",
);

beforeAll(() => {
  migrate(db, { migrationsFolder: "./drizzle" });
});

beforeEach(() => {
  sqlite.exec(`
    DELETE FROM reading_progress;
    DELETE FROM document_tags;
    DELETE FROM chapters;
    DELETE FROM documents;
  `);
  rmSync(assetsPath, { recursive: true, force: true });
});

afterAll(() => {
  sqlite.close();
  for (const suffix of ["", "-shm", "-wal"]) {
    rmSync(`${databasePath}${suffix}`, { force: true });
  }
  rmSync(assetsPath, { recursive: true, force: true });
});
