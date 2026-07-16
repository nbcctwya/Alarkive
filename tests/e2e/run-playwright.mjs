import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const environment = { ...process.env };
delete environment.NO_COLOR;

const result = spawnSync(
  process.execPath,
  [
    resolve("node_modules/@playwright/test/cli.js"),
    "test",
    ...process.argv.slice(2),
  ],
  { env: environment, stdio: "inherit" },
);

if (result.error) throw result.error;
process.exit(result.status ?? 1);
