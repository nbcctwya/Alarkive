import { resolve } from "node:path";

export const dataDirectory = resolve(
  process.cwd(),
  process.env.ALARKIVE_DATA_DIR ?? "./data",
);

export const databasePath = process.env.DATABASE_URL
  ? resolve(process.cwd(), process.env.DATABASE_URL)
  : resolve(dataDirectory, "alarkive.db");

export const assetsDirectory = resolve(
  process.cwd(),
  process.env.ALARKIVE_ASSETS_DIR ?? resolve(dataDirectory, "assets"),
);

export const backupsDirectory = resolve(dataDirectory, "backups");
