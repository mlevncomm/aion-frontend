const SESSION_KEY = "aion-admin-session";
const ATTEMPTS_KEY = "aion-login-attempts";
const LOCK_UNTIL_KEY = "aion-login-lock-until";
const ADMIN_CREDENTIAL_HASH = "6fe1ba45ad10c1c034f26c14baafa07af480c437689a37e4aa676561a10091d0";
const MAX_ATTEMPTS = 5;
const LOCK_DURATION_MS = 30_000;

export interface LoginThrottle {
  attempts: number;
  lockUntil: number;
}

async function hashCredential(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function validateAdminCredentials(username: string, password: string): Promise<boolean> {
  const candidateHash = await hashCredential(`${username.trim()}:${password}`);
  return candidateHash === ADMIN_CREDENTIAL_HASH;
}

export function isFrontendAuthenticated(): boolean {
  return sessionStorage.getItem(SESSION_KEY) === "active";
}

export function beginFrontendSession(): void {
  sessionStorage.setItem(SESSION_KEY, "active");
}

export function endFrontendSession(): void {
  sessionStorage.removeItem(SESSION_KEY);
}

export function getLoginThrottle(): LoginThrottle {
  const attempts = Number(sessionStorage.getItem(ATTEMPTS_KEY) ?? "0");
  const lockUntil = Number(sessionStorage.getItem(LOCK_UNTIL_KEY) ?? "0");
  return {
    attempts: Number.isFinite(attempts) ? attempts : 0,
    lockUntil: Number.isFinite(lockUntil) ? lockUntil : 0,
  };
}

export function registerFailedLogin(): LoginThrottle {
  const current = getLoginThrottle();
  if (current.lockUntil > Date.now()) return current;

  const nextAttempts = current.attempts + 1;
  if (nextAttempts >= MAX_ATTEMPTS) {
    const lockUntil = Date.now() + LOCK_DURATION_MS;
    sessionStorage.setItem(ATTEMPTS_KEY, "0");
    sessionStorage.setItem(LOCK_UNTIL_KEY, String(lockUntil));
    return { attempts: 0, lockUntil };
  }

  sessionStorage.setItem(ATTEMPTS_KEY, String(nextAttempts));
  return { attempts: nextAttempts, lockUntil: 0 };
}

export function clearLoginThrottle(): void {
  sessionStorage.removeItem(ATTEMPTS_KEY);
  sessionStorage.removeItem(LOCK_UNTIL_KEY);
}

export const loginPolicy = {
  maxAttempts: MAX_ATTEMPTS,
};