import Database from "better-sqlite3";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  renameSync,
  rmSync,
} from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { backupsDirectory, databasePath } from "@/config/paths";

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

export function validateSQLiteDatabase(path: string): void {
  const candidate = new Database(path, { readonly: true, fileMustExist: true });
  try {
    const result = candidate.pragma("quick_check", { simple: true });
    if (result !== "ok") throw new Error(`SQLite 校验失败：${String(result)}`);
  } finally {
    candidate.close();
  }
}

export async function createDatabaseBackup(options?: {
  sourcePath?: string;
  destinationDirectory?: string;
  prefix?: string;
}): Promise<string> {
  const sourcePath = resolve(options?.sourcePath ?? databasePath);
  if (!existsSync(sourcePath)) throw new Error(`数据库不存在：${sourcePath}`);
  const destinationDirectory = resolve(
    options?.destinationDirectory ?? backupsDirectory,
  );
  mkdirSync(destinationDirectory, { recursive: true });
  const destination = join(
    destinationDirectory,
    `${options?.prefix ?? "alarkive"}-${timestamp()}.db`,
  );
  const source = new Database(sourcePath, { fileMustExist: true });
  try {
    source.pragma("wal_checkpoint(PASSIVE)");
    await source.backup(destination);
  } finally {
    source.close();
  }
  validateSQLiteDatabase(destination);
  for (const suffix of ["-shm", "-wal"])
    rmSync(`${destination}${suffix}`, { force: true });
  return destination;
}

export async function restoreDatabaseBackup(
  backupPath: string,
  options?: { targetPath?: string; backupDirectory?: string },
): Promise<{ restoredFrom: string; safetyBackup: string }> {
  const source = resolve(backupPath);
  const target = resolve(options?.targetPath ?? databasePath);
  if (source === target) throw new Error("备份文件不能与当前数据库相同");
  validateSQLiteDatabase(source);
  const safetyBackup = await createDatabaseBackup({
    sourcePath: target,
    destinationDirectory: options?.backupDirectory,
    prefix: "pre-restore",
  });
  mkdirSync(dirname(target), { recursive: true });
  const temporary = join(dirname(target), `.${basename(target)}.restore.tmp`);
  copyFileSync(source, temporary);
  validateSQLiteDatabase(temporary);
  renameSync(temporary, target);
  for (const suffix of ["-shm", "-wal"])
    rmSync(`${target}${suffix}`, { force: true });
  return { restoredFrom: source, safetyBackup };
}
