import Database from "better-sqlite3";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  createDatabaseBackup,
  restoreDatabaseBackup,
  validateSQLiteDatabase,
} from "@/services/database-backup";

let temporaryDirectory = "";

afterEach(() => {
  if (temporaryDirectory)
    rmSync(temporaryDirectory, { recursive: true, force: true });
});

describe("SQLite backup and restore", () => {
  it("creates a valid backup and automatically safeguards the current database before restore", async () => {
    temporaryDirectory = mkdtempSync(join(tmpdir(), "alarkive-backup-test-"));
    const databasePath = join(temporaryDirectory, "current.db");
    const backupDirectory = join(temporaryDirectory, "backups");
    const database = new Database(databasePath);
    database.exec(
      "CREATE TABLE notes (value TEXT NOT NULL); INSERT INTO notes VALUES ('original');",
    );
    database.close();

    const backup = await createDatabaseBackup({
      sourcePath: databasePath,
      destinationDirectory: backupDirectory,
    });
    expect(existsSync(`${backup}-wal`)).toBe(false);
    expect(existsSync(`${backup}-shm`)).toBe(false);
    validateSQLiteDatabase(backup);

    const changed = new Database(databasePath);
    changed.exec("UPDATE notes SET value = 'changed'");
    changed.close();

    const restored = await restoreDatabaseBackup(backup, {
      targetPath: databasePath,
      backupDirectory,
    });
    const result = new Database(databasePath, { readonly: true });
    expect(result.prepare("SELECT value FROM notes").pluck().get()).toBe(
      "original",
    );
    result.close();

    const safety = new Database(restored.safetyBackup, { readonly: true });
    expect(safety.prepare("SELECT value FROM notes").pluck().get()).toBe(
      "changed",
    );
    safety.close();
  });
});
