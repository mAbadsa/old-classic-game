import { NextResponse, type NextRequest } from "next/server";

// This file was "middleware.ts" — Next.js 16 renamed the convention to
// "proxy.ts" (file + exported function only; behavior is unchanged). See
// https://nextjs.org/docs/messages/middleware-to-proxy.
//
// Proxy (server-side, runs before the page) can never read localStorage —
// that's a browser-only API with no server-side equivalent. lib/auth.ts
// mirrors the access token into a plain cookie of the same name specifically
// so this file has something to read; see the comment there for the full
// picture.
//
// This check is a fast, spoofable pre-check, not the real security
// boundary: it confirms a token-shaped cookie exists and isn't obviously
// expired, but never verifies the JWT signature (that needs JWT_SECRET,
// which must stay backend-only — never ship it to Proxy). Actual
// enforcement is unchanged: NestJS's JwtAuthGuard on the API, and
// hooks/useRequireAuth.ts's client-side GET /auth/me round-trip, which still
// runs on every protected page regardless of what this file decides.
const ACCESS_TOKEN_COOKIE = "accessToken";
const PROTECTED_PATHS = ["/", "/games", "/emulator"];
const PUBLIC_AUTH_PATHS = ["/auth/login", "/auth/signup"];

function matchesPath(pathname: string, paths: string[]): boolean {
  return paths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

/**
 * Decodes the payload segment without verifying the signature. `valid` is
 * false for anything that isn't at least JWT-*shaped* (three dot-separated
 * segments with a JSON payload) — a garbage cookie value fails closed rather
 * than sliding through just because it has no (decodable) `exp` to compare.
 */
function decodeJwtPayload(token: string): { valid: boolean; exp: number | null } {
  try {
    const segments = token.split(".");
    if (segments.length !== 3) return { valid: false, exp: null };
    const base64 = segments[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const { exp } = JSON.parse(atob(padded)) as { exp?: unknown };
    return { valid: true, exp: typeof exp === "number" ? exp : null };
  } catch {
    return { valid: false, exp: null };
  }
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (matchesPath(pathname, PUBLIC_AUTH_PATHS) || !matchesPath(pathname, PROTECTED_PATHS)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const { valid, exp } = token ? decodeJwtPayload(token) : { valid: false, exp: null };
  // No exp claim at all (unusual but spec-legal) can't be judged expired, so it passes;
  // an exp claim in the past does not.
  const looksAuthenticated = valid && (exp === null || exp * 1000 > Date.now());

  if (!looksAuthenticated) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("redirect", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Only these paths pay the middleware cost; everything else (including
  // /auth/login and /auth/signup) never invokes this function at all.
  matcher: ["/", "/games/:path*", "/emulator/:path*"],
};
