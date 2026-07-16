import { restoreDatabaseBackup } from "../src/services/database-backup";

const backupPath = process.argv[2];
if (!backupPath) {
  throw new Error("用法：npm run db:restore -- /path/to/alarkive-backup.db");
}

async function main() {
  console.warn("Restore must be run while the Alarkive server is stopped.");
  const result = await restoreDatabaseBackup(backupPath);
  console.log(`SQLite database restored from: ${result.restoredFrom}`);
  console.log(`Pre-restore safety backup: ${result.safetyBackup}`);
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
