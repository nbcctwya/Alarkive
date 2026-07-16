import { NextRequest, NextResponse } from "next/server";

async function digest(value: string) {
  return new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
  );
}

async function secureEqual(left: string, right: string) {
  const [leftHash, rightHash] = await Promise.all([
    digest(left),
    digest(right),
  ]);
  let difference = 0;
  for (let index = 0; index < leftHash.length; index += 1)
    difference |= leftHash[index] ^ rightHash[index];
  return difference === 0;
}

function unauthorized(message = "需要管理员身份验证") {
  return new NextResponse(message, {
    status: 401,
    headers: {
      "www-authenticate": 'Basic realm="Alarkive", charset="UTF-8"',
      "cache-control": "no-store",
    },
  });
}

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === "/api/health") return NextResponse.next();
  if (process.env.ALARKIVE_AUTH_DISABLED === "true") return NextResponse.next();

  const expectedUsername = process.env.ALARKIVE_ADMIN_USERNAME;
  const expectedPassword = process.env.ALARKIVE_ADMIN_PASSWORD;
  if (!expectedUsername || !expectedPassword) {
    if (process.env.NODE_ENV !== "production") return NextResponse.next();
    return new NextResponse("管理员访问保护尚未配置", {
      status: 503,
      headers: { "cache-control": "no-store" },
    });
  }

  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Basic ")) return unauthorized();
  try {
    const decoded = atob(authorization.slice(6));
    const separator = decoded.indexOf(":");
    if (separator < 0) return unauthorized();
    const username = decoded.slice(0, separator);
    const password = decoded.slice(separator + 1);
    const [usernameMatches, passwordMatches] = await Promise.all([
      secureEqual(username, expectedUsername),
      secureEqual(password, expectedPassword),
    ]);
    if (!usernameMatches || !passwordMatches)
      return unauthorized("管理员用户名或密码错误");
    return NextResponse.next();
  } catch {
    return unauthorized("管理员身份信息格式无效");
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
