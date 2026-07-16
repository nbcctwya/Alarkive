import { sql } from "drizzle-orm";
import { db } from "@/db";

export function GET() {
  try {
    db.get(sql`select 1`);
    return Response.json(
      { status: "ok", service: "alarkive", version: "0.1.0" },
      { headers: { "cache-control": "no-store" } },
    );
  } catch {
    return Response.json(
      { status: "error", service: "alarkive" },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }
}

export const dynamic = "force-dynamic";
