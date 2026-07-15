import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { dirname, resolve } from "node:path";
import { mkdirSync } from "node:fs";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL ?? "./data/alarkive.db";
const databasePath = resolve(process.cwd(), databaseUrl);

mkdirSync(dirname(databasePath), { recursive: true });

const globalForDatabase = globalThis as unknown as {
  sqlite?: Database.Database;
};

export const sqlite = globalForDatabase.sqlite ?? new Database(databasePath);

sqlite.pragma("foreign_keys = ON");
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("busy_timeout = 5000");

if (process.env.NODE_ENV !== "production") globalForDatabase.sqlite = sqlite;

export const db = drizzle(sqlite, { schema });
