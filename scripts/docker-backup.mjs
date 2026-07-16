import { mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import Database from "better-sqlite3";

const dataDirectory = resolve(process.env.ALARKIVE_DATA_DIR ?? "/app/data");
const databasePath = process.env.DATABASE_URL
  ? resolve(process.env.DATABASE_URL)
  : resolve(dataDirectory, "alarkive.db");
const backupDirectory = resolve(dataDirectory, "backups");
mkdirSync(backupDirectory, { recursive: true });
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const destination = resolve(backupDirectory, `alarkive-${timestamp}.db`);
const source = new Database(databasePath, { readonly: true });
try {
  await source.backup(destination);
} finally {
  source.close();
}
const backup = new Database(destination, { readonly: true });
try {
  const result = backup.pragma("quick_check", { simple: true });
  if (result !== "ok")
    throw new Error(`backup integrity check failed: ${result}`);
} finally {
  backup.close();
}
rmSync(`${destination}-wal`, { force: true });
rmSync(`${destination}-shm`, { force: true });
console.log(destination);
