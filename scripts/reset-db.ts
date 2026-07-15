import { execFileSync } from "node:child_process";
import { rmSync } from "node:fs";
import { resolve } from "node:path";

const databasePath = resolve(
  process.cwd(),
  process.env.DATABASE_URL ?? "./data/alarkive.db",
);

for (const suffix of ["", "-shm", "-wal"]) {
  rmSync(`${databasePath}${suffix}`, { force: true });
}

const npm = process.platform === "win32" ? "npm.cmd" : "npm";
execFileSync(npm, ["run", "db:init"], { stdio: "inherit" });
execFileSync(npm, ["run", "db:seed"], { stdio: "inherit" });
console.log("SQLite database reset and seeded.");
