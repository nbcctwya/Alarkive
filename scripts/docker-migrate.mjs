import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

const dataDirectory = resolve(process.env.ALARKIVE_DATA_DIR ?? "/app/data");
const databasePath = process.env.DATABASE_URL
  ? resolve(process.env.DATABASE_URL)
  : resolve(dataDirectory, "alarkive.db");
const migrationsDirectory = resolve(
  process.env.ALARKIVE_MIGRATIONS_DIR ?? "/app/drizzle",
);
mkdirSync(dirname(databasePath), { recursive: true });
const sqlite = new Database(databasePath);
sqlite.pragma("foreign_keys = ON");
sqlite.pragma("journal_mode = WAL");
try {
  migrate(drizzle(sqlite), { migrationsFolder: migrationsDirectory });
  console.log(`[alarkive] database migrations applied: ${databasePath}`);
} finally {
  sqlite.close();
}
