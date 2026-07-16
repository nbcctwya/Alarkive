import { copyFileSync, mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import Database from "better-sqlite3";

const sourcePath = process.argv[2];
if (!sourcePath)
  throw new Error("usage: docker-restore.mjs /app/data/backups/backup.db");
const dataDirectory = resolve(process.env.ALARKIVE_DATA_DIR ?? "/app/data");
const databasePath = process.env.DATABASE_URL
  ? resolve(process.env.DATABASE_URL)
  : resolve(dataDirectory, "alarkive.db");
const backupDirectory = resolve(dataDirectory, "backups");
mkdirSync(backupDirectory, { recursive: true });

const source = new Database(resolve(sourcePath), { readonly: true });
try {
  const result = source.pragma("quick_check", { simple: true });
  if (result !== "ok")
    throw new Error(`source integrity check failed: ${result}`);
} finally {
  source.close();
}

const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const safetyPath = resolve(backupDirectory, `pre-restore-${timestamp}.db`);
const current = new Database(databasePath, { readonly: true });
try {
  await current.backup(safetyPath);
} finally {
  current.close();
}
copyFileSync(resolve(sourcePath), databasePath);
rmSync(`${databasePath}-wal`, { force: true });
rmSync(`${databasePath}-shm`, { force: true });
console.log(`restored: ${resolve(sourcePath)}`);
console.log(`safety backup: ${safetyPath}`);
