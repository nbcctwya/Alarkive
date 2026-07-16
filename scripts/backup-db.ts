import { createDatabaseBackup } from "../src/server/services/database-backup";

async function main() {
  const destination = await createDatabaseBackup();
  console.log(`SQLite backup created: ${destination}`);
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
