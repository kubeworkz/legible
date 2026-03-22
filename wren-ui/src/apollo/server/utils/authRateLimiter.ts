/**
 * In-memory sliding-window rate limiter for authentication endpoints.
 *
 * Limits:
 *  - Login:  5 failed attempts per IP per minute, 20 per hour
 *  - Signup: 10 requests per IP per hour
 *
 * Entries auto-expire to avoid unbounded memory growth.
 */

interface RateEntry {
  timestamps: number[];
}

const loginAttempts = new Map<string, RateEntry>();
const signupAttempts = new Map<string, RateEntry>();

// Cleanup stale entries every 10 minutes
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000;
const LOGIN_WINDOW_SHORT_MS = 60 * 1000; // 1 minute
const LOGIN_WINDOW_LONG_MS = 60 * 60 * 1000; // 1 hour
const SIGNUP_WINDOW_MS = 60 * 60 * 1000; // 1 hour

const LOGIN_MAX_PER_MINUTE = 5;
const LOGIN_MAX_PER_HOUR = 20;
const SIGNUP_MAX_PER_HOUR = 10;

function pruneOld(entry: RateEntry, windowMs: number): number[] {
  const cutoff = Date.now() - windowMs;
  entry.timestamps = entry.timestamps.filter((ts) => ts > cutoff);
  return entry.timestamps;
}

function cleanup(map: Map<string, RateEntry>, windowMs: number) {
  const cutoff = Date.now() - windowMs;
  for (const [key, entry] of map) {
    entry.timestamps = entry.timestamps.filter((ts) => ts > cutoff);
    if (entry.timestamps.length === 0) {
      map.delete(key);
    }
  }
}

// Periodic cleanup
setInterval(() => {
  cleanup(loginAttempts, LOGIN_WINDOW_LONG_MS);
  cleanup(signupAttempts, SIGNUP_WINDOW_MS);
}, CLEANUP_INTERVAL_MS);

/**
 * Extract client IP from the request context.
 * Trusts X-Forwarded-For when behind a reverse proxy.
 */
export function extractClientIp(req: {
  headers?: Record<string, string | string[] | undefined>;
  socket?: { remoteAddress?: string };
}): string {
  const xff = req.headers?.['x-forwarded-for'];
  if (xff) {
    const ip = (Array.isArray(xff) ? xff[0] : xff).split(',')[0].trim();
    if (ip) return ip;
  }
  const xri = req.headers?.['x-real-ip'];
  if (xri) {
    return Array.isArray(xri) ? xri[0] : xri;
  }
  return req.socket?.remoteAddress || 'unknown';
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterMs?: number;
  reason?: string;
}

/**
 * Check and record a login attempt for the given IP.
 * Call this BEFORE verifying credentials. On failure, call again or
 * just let the entry age out naturally.
 */
export function checkLoginRateLimit(ip: string): RateLimitResult {
  let entry = loginAttempts.get(ip);
  if (!entry) {
    entry = { timestamps: [] };
    loginAttempts.set(ip, entry);
  }

  // Check 1-minute window
  const shortWindow = pruneOld(
    { timestamps: [...entry.timestamps] },
    LOGIN_WINDOW_SHORT_MS,
  );
  if (shortWindow.length >= LOGIN_MAX_PER_MINUTE) {
    const oldestInWindow = shortWindow[0];
    const retryAfterMs = LOGIN_WINDOW_SHORT_MS - (Date.now() - oldestInWindow);
    return {
      allowed: false,
      retryAfterMs: Math.max(retryAfterMs, 1000),
      reason: `Too many login attempts. Try again in ${Math.ceil(retryAfterMs / 1000)} seconds.`,
    };
  }

  // Check 1-hour window
  pruneOld(entry, LOGIN_WINDOW_LONG_MS);
  if (entry.timestamps.length >= LOGIN_MAX_PER_HOUR) {
    const oldestInWindow = entry.timestamps[0];
    const retryAfterMs =
      LOGIN_WINDOW_LONG_MS - (Date.now() - oldestInWindow);
    return {
      allowed: false,
      retryAfterMs: Math.max(retryAfterMs, 1000),
      reason: `Too many login attempts. Try again later.`,
    };
  }

  // Record attempt
  entry.timestamps.push(Date.now());
  return { allowed: true };
}

/**
 * Check and record a signup attempt for the given IP.
 */
export function checkSignupRateLimit(ip: string): RateLimitResult {
  let entry = signupAttempts.get(ip);
  if (!entry) {
    entry = { timestamps: [] };
    signupAttempts.set(ip, entry);
  }

  pruneOld(entry, SIGNUP_WINDOW_MS);
  if (entry.timestamps.length >= SIGNUP_MAX_PER_HOUR) {
    const oldestInWindow = entry.timestamps[0];
    const retryAfterMs = SIGNUP_WINDOW_MS - (Date.now() - oldestInWindow);
    return {
      allowed: false,
      retryAfterMs: Math.max(retryAfterMs, 1000),
      reason: `Too many signup attempts. Try again later.`,
    };
  }

  entry.timestamps.push(Date.now());
  return { allowed: true };
}

// ----- Account Lockout (per-email) -----

const LOCKOUT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const LOCKOUT_MAX_FAILURES = 5;

const failedLoginsByEmail = new Map<string, RateEntry>();

// Cleanup stale entries every 10 minutes
setInterval(() => {
  cleanup(failedLoginsByEmail, LOCKOUT_WINDOW_MS);
}, CLEANUP_INTERVAL_MS);

/**
 * Check whether an account is locked out due to too many failed login attempts.
 * Call this BEFORE verifying credentials.
 */
export function checkAccountLockout(email: string): RateLimitResult {
  const key = email.toLowerCase();
  const entry = failedLoginsByEmail.get(key);
  if (!entry) return { allowed: true };

  pruneOld(entry, LOCKOUT_WINDOW_MS);
  if (entry.timestamps.length >= LOCKOUT_MAX_FAILURES) {
    const oldestInWindow = entry.timestamps[0];
    const retryAfterMs = LOCKOUT_WINDOW_MS - (Date.now() - oldestInWindow);
    return {
      allowed: false,
      retryAfterMs: Math.max(retryAfterMs, 1000),
      reason: `Account temporarily locked due to too many failed login attempts. Try again in ${Math.ceil(retryAfterMs / 60000)} minute(s).`,
    };
  }

  return { allowed: true };
}

/**
 * Record a failed login attempt for the given email.
 * Call this AFTER a failed password check.
 */
export function recordFailedLogin(email: string): void {
  const key = email.toLowerCase();
  let entry = failedLoginsByEmail.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    failedLoginsByEmail.set(key, entry);
  }
  entry.timestamps.push(Date.now());
}

/**
 * Clear failed login attempts for an email (call on successful login).
 */
export function clearFailedLogins(email: string): void {
  failedLoginsByEmail.delete(email.toLowerCase());
}
