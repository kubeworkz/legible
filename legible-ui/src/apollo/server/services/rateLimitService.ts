import { getLogger } from '@server/utils';
import {
  IOrgApiKeyRepository,
  OrgApiKey,
} from '@server/repositories/orgApiKeyRepository';
import {
  IProjectApiKeyRepository,
  ProjectApiKey,
} from '@server/repositories/projectApiKeyRepository';

const logger = getLogger('RATE_LIMITER');

/**
 * Sliding-window entry: stores timestamps of recent requests for a given key.
 */
interface WindowEntry {
  timestamps: number[]; // epoch ms of each request
}

/**
 * Result of a rate-limit check.
 */
export interface RateLimitResult {
  allowed: boolean;
  retryAfterMs?: number; // hint for the client
  reason?: string; // human-readable reason
  limit?: number; // the limit that was hit
  remaining?: number; // remaining requests in this window
  resetAt?: string; // ISO timestamp of when the window resets
}

/**
 * The identity of a key for rate-limit lookups.
 */
export interface RateLimitKeyIdentity {
  keyId: number;
  keyType: 'org' | 'project';
}

/**
 * Rate limits configured on a key.
 */
export interface RateLimitConfig {
  rateLimitRpm: number | null;
  rateLimitRpd: number | null;
  tokenQuotaMonthly: number | null;
  tokenQuotaUsed: number;
  quotaResetAt: string | null;
}

export interface IRateLimitService {
  /**
   * Check whether a request from the given key is allowed.
   * If allowed, records the request in the sliding window.
   */
  checkAndRecord(identity: RateLimitKeyIdentity): Promise<RateLimitResult>;

  /**
   * After a request completes, record token usage against the key's quota.
   * Resets quota if the reset date has passed.
   */
  recordTokenUsage(
    identity: RateLimitKeyIdentity,
    tokens: number,
  ): Promise<void>;

  /**
   * Get the current rate-limit status for a key (without recording a request).
   */
  getStatus(identity: RateLimitKeyIdentity): Promise<{
    rpm: { limit: number | null; used: number; remaining: number | null };
    rpd: { limit: number | null; used: number; remaining: number | null };
    tokenQuota: {
      limit: number | null;
      used: number;
      remaining: number | null;
      resetAt: string | null;
    };
  }>;

  /**
   * Clear the in-memory windows for a key (e.g. when key is deleted).
   */
  clearKey(identity: RateLimitKeyIdentity): void;
}

const ONE_MINUTE_MS = 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export class RateLimitService implements IRateLimitService {
  private readonly orgApiKeyRepository: IOrgApiKeyRepository;
  private readonly projectApiKeyRepository: IProjectApiKeyRepository;

  /**
   * In-memory sliding windows keyed by "{keyType}:{keyId}".
   * Separate maps for per-minute and per-day windows.
   */
  private rpmWindows = new Map<string, WindowEntry>();
  private rpdWindows = new Map<string, WindowEntry>();

  /**
   * Cache of key configs so we don't hit DB on every request.
   * TTL: 60 seconds.
   */
  private configCache = new Map<
    string,
    { config: RateLimitConfig; fetchedAt: number }
  >();
  private readonly CONFIG_CACHE_TTL_MS = 60_000;

  constructor({
    orgApiKeyRepository,
    projectApiKeyRepository,
  }: {
    orgApiKeyRepository: IOrgApiKeyRepository;
    projectApiKeyRepository: IProjectApiKeyRepository;
  }) {
    this.orgApiKeyRepository = orgApiKeyRepository;
    this.projectApiKeyRepository = projectApiKeyRepository;
  }

  private keyStr(identity: RateLimitKeyIdentity): string {
    return `${identity.keyType}:${identity.keyId}`;
  }

  /**
   * Fetch the rate-limit config for a key, with caching.
   */
  private async getConfig(
    identity: RateLimitKeyIdentity,
  ): Promise<RateLimitConfig | null> {
    const key = this.keyStr(identity);
    const cached = this.configCache.get(key);
    if (cached && Date.now() - cached.fetchedAt < this.CONFIG_CACHE_TTL_MS) {
      return cached.config;
    }

    let record: OrgApiKey | ProjectApiKey | null = null;
    if (identity.keyType === 'org') {
      record = await this.orgApiKeyRepository.findOneBy({
        id: identity.keyId,
      } as any);
    } else {
      record = await this.projectApiKeyRepository.findOneBy({
        id: identity.keyId,
      } as any);
    }

    if (!record) return null;

    const config: RateLimitConfig = {
      rateLimitRpm: record.rateLimitRpm,
      rateLimitRpd: record.rateLimitRpd,
      tokenQuotaMonthly: record.tokenQuotaMonthly,
      tokenQuotaUsed: record.tokenQuotaUsed ?? 0,
      quotaResetAt: record.quotaResetAt,
    };

    this.configCache.set(key, { config, fetchedAt: Date.now() });
    return config;
  }

  /**
   * Prune timestamps older than the given window from an entry.
   */
  private pruneWindow(entry: WindowEntry, windowMs: number): void {
    const cutoff = Date.now() - windowMs;
    // Remove old timestamps from the front
    let i = 0;
    while (i < entry.timestamps.length && entry.timestamps[i] < cutoff) {
      i++;
    }
    if (i > 0) {
      entry.timestamps.splice(0, i);
    }
  }

  /**
   * Count requests in the current window.
   */
  private countInWindow(
    windows: Map<string, WindowEntry>,
    key: string,
    windowMs: number,
  ): number {
    const entry = windows.get(key);
    if (!entry) return 0;
    this.pruneWindow(entry, windowMs);
    return entry.timestamps.length;
  }

  /**
   * Record a request timestamp in the given window.
   */
  private recordInWindow(
    windows: Map<string, WindowEntry>,
    key: string,
  ): void {
    let entry = windows.get(key);
    if (!entry) {
      entry = { timestamps: [] };
      windows.set(key, entry);
    }
    entry.timestamps.push(Date.now());
  }

  public async checkAndRecord(
    identity: RateLimitKeyIdentity,
  ): Promise<RateLimitResult> {
    const config = await this.getConfig(identity);
    if (!config) {
      // Key not found — allow (auth layer will handle invalid keys)
      return { allowed: true };
    }

    const key = this.keyStr(identity);
    const now = Date.now();

    // ── Check RPM ──
    if (config.rateLimitRpm !== null && config.rateLimitRpm > 0) {
      const count = this.countInWindow(this.rpmWindows, key, ONE_MINUTE_MS);
      if (count >= config.rateLimitRpm) {
        const entry = this.rpmWindows.get(key);
        const oldestInWindow = entry?.timestamps[0] || now;
        const retryAfterMs = oldestInWindow + ONE_MINUTE_MS - now;
        logger.debug(
          `RPM limit hit for ${key}: ${count}/${config.rateLimitRpm}`,
        );
        return {
          allowed: false,
          retryAfterMs: Math.max(retryAfterMs, 1000),
          reason: 'Rate limit exceeded: too many requests per minute',
          limit: config.rateLimitRpm,
          remaining: 0,
          resetAt: new Date(oldestInWindow + ONE_MINUTE_MS).toISOString(),
        };
      }
    }

    // ── Check RPD ──
    if (config.rateLimitRpd !== null && config.rateLimitRpd > 0) {
      const count = this.countInWindow(this.rpdWindows, key, ONE_DAY_MS);
      if (count >= config.rateLimitRpd) {
        const entry = this.rpdWindows.get(key);
        const oldestInWindow = entry?.timestamps[0] || now;
        const retryAfterMs = oldestInWindow + ONE_DAY_MS - now;
        logger.debug(
          `RPD limit hit for ${key}: ${count}/${config.rateLimitRpd}`,
        );
        return {
          allowed: false,
          retryAfterMs: Math.max(retryAfterMs, 1000),
          reason: 'Rate limit exceeded: too many requests per day',
          limit: config.rateLimitRpd,
          remaining: 0,
          resetAt: new Date(oldestInWindow + ONE_DAY_MS).toISOString(),
        };
      }
    }

    // ── Check token quota ──
    if (
      config.tokenQuotaMonthly !== null &&
      config.tokenQuotaMonthly > 0
    ) {
      // Check if quota needs reset
      if (config.quotaResetAt && new Date(config.quotaResetAt) <= new Date()) {
        // Reset quota
        if (identity.keyType === 'org') {
          await this.orgApiKeyRepository.resetTokenQuota(identity.keyId);
        } else {
          await this.projectApiKeyRepository.resetTokenQuota(identity.keyId);
        }
        // Invalidate cache
        this.configCache.delete(key);
      } else if (config.tokenQuotaUsed >= config.tokenQuotaMonthly) {
        const resetAt = config.quotaResetAt || this.getNextMonthStart();
        logger.debug(
          `Token quota exceeded for ${key}: ${config.tokenQuotaUsed}/${config.tokenQuotaMonthly}`,
        );
        return {
          allowed: false,
          reason: 'Monthly token quota exceeded',
          limit: config.tokenQuotaMonthly,
          remaining: 0,
          resetAt,
        };
      }
    }

    // ── All checks passed — record the request ──
    this.recordInWindow(this.rpmWindows, key);
    this.recordInWindow(this.rpdWindows, key);

    return { allowed: true };
  }

  public async recordTokenUsage(
    identity: RateLimitKeyIdentity,
    tokens: number,
  ): Promise<void> {
    if (!tokens || tokens <= 0) return;

    try {
      if (identity.keyType === 'org') {
        await this.orgApiKeyRepository.incrementTokenUsage(
          identity.keyId,
          tokens,
        );
      } else {
        await this.projectApiKeyRepository.incrementTokenUsage(
          identity.keyId,
          tokens,
        );
      }

      // Invalidate cache so next check sees updated usage
      this.configCache.delete(this.keyStr(identity));
    } catch (err) {
      logger.error(
        `Failed to record token usage for ${this.keyStr(identity)}: ${(err as Error).message}`,
      );
    }
  }

  public async getStatus(identity: RateLimitKeyIdentity): Promise<{
    rpm: { limit: number | null; used: number; remaining: number | null };
    rpd: { limit: number | null; used: number; remaining: number | null };
    tokenQuota: {
      limit: number | null;
      used: number;
      remaining: number | null;
      resetAt: string | null;
    };
  }> {
    const config = await this.getConfig(identity);
    const key = this.keyStr(identity);

    const rpmUsed = this.countInWindow(this.rpmWindows, key, ONE_MINUTE_MS);
    const rpdUsed = this.countInWindow(this.rpdWindows, key, ONE_DAY_MS);

    return {
      rpm: {
        limit: config?.rateLimitRpm ?? null,
        used: rpmUsed,
        remaining:
          config?.rateLimitRpm != null
            ? Math.max(0, config.rateLimitRpm - rpmUsed)
            : null,
      },
      rpd: {
        limit: config?.rateLimitRpd ?? null,
        used: rpdUsed,
        remaining:
          config?.rateLimitRpd != null
            ? Math.max(0, config.rateLimitRpd - rpdUsed)
            : null,
      },
      tokenQuota: {
        limit: config?.tokenQuotaMonthly ?? null,
        used: config?.tokenQuotaUsed ?? 0,
        remaining:
          config?.tokenQuotaMonthly != null
            ? Math.max(
                0,
                config.tokenQuotaMonthly - (config?.tokenQuotaUsed ?? 0),
              )
            : null,
        resetAt: config?.quotaResetAt ?? null,
      },
    };
  }

  public clearKey(identity: RateLimitKeyIdentity): void {
    const key = this.keyStr(identity);
    this.rpmWindows.delete(key);
    this.rpdWindows.delete(key);
    this.configCache.delete(key);
  }

  private getNextMonthStart(): string {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }
}
