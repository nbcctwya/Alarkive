import { spawn, spawnSync } from "node:child_process";
import { rmSync } from "node:fs";
import { basename, resolve } from "node:path";

const databasePath = resolve(
  process.env.DATABASE_URL ?? "./data/alarkive.e2e.db",
);
const assetsPath = resolve(
  process.env.ALARKIVE_ASSETS_DIR ?? "./data/assets.e2e",
);

if (
  basename(databasePath) !== "alarkive.e2e.db" ||
  basename(assetsPath) !== "assets.e2e"
) {
  throw new Error("Refusing to reset paths outside the isolated E2E workspace");
}

for (const suffix of ["", "-shm", "-wal"])
  rmSync(`${databasePath}${suffix}`, { force: true });
rmSync(assetsPath, { recursive: true, force: true });

const migration = spawnSync("npm", ["run", "db:migrate"], {
  cwd: process.cwd(),
  env: process.env,
  stdio: "inherit",
});
if (migration.status !== 0) process.exit(migration.status ?? 1);

const server = spawn("node", [".next/standalone/server.js"], {
  cwd: process.cwd(),
  env: process.env,
  stdio: "inherit",
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.kill(signal));
}

server.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 1);
});
