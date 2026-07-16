import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { dirname } from "node:path";
import { mkdirSync } from "node:fs";
import * as schema from "./schema";
import { databasePath } from "@/server/config/paths";

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
