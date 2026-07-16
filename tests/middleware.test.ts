import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "@/middleware";

const originalUsername = process.env.ALARKIVE_ADMIN_USERNAME;
const originalPassword = process.env.ALARKIVE_ADMIN_PASSWORD;
const originalDisabled = process.env.ALARKIVE_AUTH_DISABLED;

beforeEach(() => {
  process.env.ALARKIVE_ADMIN_USERNAME = "owner";
  process.env.ALARKIVE_ADMIN_PASSWORD = "long-test-password";
  delete process.env.ALARKIVE_AUTH_DISABLED;
});

afterEach(() => {
  if (originalUsername === undefined)
    delete process.env.ALARKIVE_ADMIN_USERNAME;
  else process.env.ALARKIVE_ADMIN_USERNAME = originalUsername;
  if (originalPassword === undefined)
    delete process.env.ALARKIVE_ADMIN_PASSWORD;
  else process.env.ALARKIVE_ADMIN_PASSWORD = originalPassword;
  if (originalDisabled === undefined) delete process.env.ALARKIVE_AUTH_DISABLED;
  else process.env.ALARKIVE_AUTH_DISABLED = originalDisabled;
});

describe("administrator access protection", () => {
  it("challenges missing and invalid credentials", async () => {
    const missing = await middleware(
      new NextRequest("http://localhost/library"),
    );
    expect(missing.status).toBe(401);
    expect(missing.headers.get("www-authenticate")).toContain("Alarkive");

    const invalid = await middleware(
      new NextRequest("http://localhost/library", {
        headers: {
          authorization: `Basic ${Buffer.from("owner:wrong").toString("base64")}`,
        },
      }),
    );
    expect(invalid.status).toBe(401);
  });

  it("allows correct credentials and the unauthenticated health check", async () => {
    const valid = await middleware(
      new NextRequest("http://localhost/library", {
        headers: {
          authorization: `Basic ${Buffer.from("owner:long-test-password").toString("base64")}`,
        },
      }),
    );
    expect(valid.status).toBe(200);
    expect(valid.headers.get("x-middleware-next")).toBe("1");

    const health = await middleware(
      new NextRequest("http://localhost/api/health"),
    );
    expect(health.status).toBe(200);
  });
});
