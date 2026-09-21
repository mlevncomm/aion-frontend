// Typed fetch layer over the FastAPI backend. Base is the relative "/api" prefix so the
// same code works in dev (Vite proxies /api → :8001) and behind a single origin in prod.
const BASE = "/api";

// Fields are declared, not constructor parameter properties: tsconfig sets
// erasableSyntaxOnly, which rejects `constructor(readonly status: number)`.
export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, body: unknown) {
    super(`request failed with ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

type JsonBody = unknown;

// A phone on one bar can leave a fetch pending indefinitely. Every call here
// is part of a user-visible turn, so a request that never settles is worse
// than one that fails: the UI has no way to recover from a promise that never
// resolves. 20s is far above the slowest real response measured (1.3s TTS).
const REQUEST_TIMEOUT_MS = 20_000;

export class TimeoutError extends Error {
  constructor(path: string) {
    super(`İstek zaman aşımına uğradı: ${path}`);
    this.name = "TimeoutError";
  }
}

async function request<T>(method: string, path: string, body?: JsonBody): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let res: Response;
  try {
    // Auth rides the httpOnly session cookie automatically — never add auth headers here.
    res = await fetch(`${BASE}${path}`, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw new TimeoutError(path);
    throw error;
  } finally {
    clearTimeout(timer);
  }

  // FastAPI reports request-validation failures as 422 with a {detail: [...]} body.
  if (res.status === 401 && typeof window !== "undefined" && !window.location.pathname.startsWith("/giris")) {
    // The server no longer knows this browser session (expired or revoked):
    // send the owner to the login screen instead of showing a raw 401.
    sessionStorage.removeItem("aion-admin-session");
    window.location.assign("/giris");
  }
  if (!res.ok) {
    const errBody = await res.json().catch(() => null);
    throw new ApiError(res.status, errBody);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// The response type is yours to declare: nothing infers across the Python boundary, so a
// TS interface here mirrors the endpoint's Pydantic model by hand — keep the two in sync.
export const apiGet = <T>(path: string) => request<T>("GET", path);
export const apiPost = <T>(path: string, body?: JsonBody) => request<T>("POST", path, body ?? null);
export const apiPut = <T>(path: string, body?: JsonBody) => request<T>("PUT", path, body ?? null);
export const apiPatch = <T>(path: string, body?: JsonBody) =>
  request<T>("PATCH", path, body ?? null);
export const apiDelete = <T>(path: string) => request<T>("DELETE", path);
