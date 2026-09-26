// The backend issues a JWT in the response body, not a Set-Cookie header, so
// there's no httpOnly session cookie. Client code (this file) mirrors the
// token into BOTH localStorage (read by hooks/useRequireAuth.ts, the real
// check — it round-trips through GET /auth/me) and a plain cookie of the
// same name, solely so proxy.ts can read it at the edge. Proxy
// only ever sees this non-httpOnly cookie, so it can check "is a token
// present and not obviously expired," never "is this signature valid" (that
// would need JWT_SECRET, which must stay server-only) — it's a fast,
// spoofable pre-check, not the security boundary. The real boundary is
// unchanged: NestJS's JwtAuthGuard on the API, plus useRequireAuth's /auth/me
// call client-side.

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const ACCESS_TOKEN_KEY = "accessToken";
const COOKIE_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  role: string;
}

export function getAccessToken(): string | null {
  try {
    return window.localStorage.getItem(ACCESS_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAccessToken(token: string): void {
  try {
    window.localStorage.setItem(ACCESS_TOKEN_KEY, token);
  } catch {
    // localStorage unavailable (private browsing, etc.) — the session just won't persist across reloads.
  }
  setAccessTokenCookie(token, COOKIE_MAX_AGE_SECONDS);
}

export function clearAccessToken(): void {
  try {
    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  } catch {
    // Nothing to clean up if storage was never reachable.
  }
  setAccessTokenCookie("", 0);
}

function setAccessTokenCookie(token: string, maxAgeSeconds: number): void {
  try {
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${ACCESS_TOKEN_KEY}=${encodeURIComponent(token)}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax${secure}`;
  } catch {
    // document.cookie unavailable — proxy.ts's fast-path check just won't have anything to read;
    // useRequireAuth's client-side check (reading localStorage above) still gates the page correctly.
  }
}

/** Validates a token against the backend. Returns null on any failure (expired, revoked, network error). */
export async function fetchCurrentUser(token: string): Promise<AuthUser | null> {
  try {
    const res = await fetch(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return (await res.json()) as AuthUser;
  } catch {
    return null;
  }
}

// class-validator's error responses (via NestJS's ValidationPipe) send
// `message` as a single string for one failing rule, but as string[] when
// several fields fail at once — SignupDto validates three fields together,
// so that shape shows up far more easily there than on login's two.
function extractErrorMessage(body: unknown, fallback: string): string {
  if (body && typeof body === "object" && "message" in body) {
    const message = (body as { message?: unknown }).message;
    if (typeof message === "string") return message;
    if (Array.isArray(message) && message.every((m) => typeof m === "string")) {
      return message.join(", ");
    }
  }
  return fallback;
}

export interface LoginResult {
  accessToken: string;
  user: { id: string; email: string; username: string };
}

export async function login(email: string, password: string): Promise<LoginResult> {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(extractErrorMessage(body, `Login failed (HTTP ${res.status})`));
  }
  return res.json() as Promise<LoginResult>;
}

export interface SignupResult {
  accessToken: string;
  user: { id: string; email: string; username: string };
}

export async function signup(email: string, username: string, password: string): Promise<SignupResult> {
  const res = await fetch(`${API_URL}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, username, password }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(extractErrorMessage(body, `Signup failed (HTTP ${res.status})`));
  }
  return res.json() as Promise<SignupResult>;
}
