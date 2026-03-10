/**
 * QueryMeteringService — tracks per-query SQL usage for billing.
 *
 * Rules:
 *   • $0.02 per SQL query executed against a real data connection
 *   • First 500 queries per organization are free (lifetime)
 *   • Queries on sample/playground datasets are excluded
 *   • Dry-run (validation-only) calls are excluded
 *   • Background/system calls without a user are excluded
 */

import {
  IQueryUsageRepository,
  QueryUsage,
  QueryUsageFilter,
  QueryUsageSummary,
  QueryUsageBySource,
  QueryUsageByProject,
} from '../repositories/queryUsageRepository';
import { getLogger } from '@server/utils';

const logger = getLogger('QueryMeteringService');
logger.level = 'debug';

// ── Constants ───────────────────────────────────────────

export const FREE_TIER_LIMIT = 500;
export const COST_PER_QUERY = 0.02;

// ── Types ───────────────────────────────────────────────

/** Passed by call sites so the service can record who ran what. */
export interface MeteringContext {
  userId?: number;
  source: string;
}

export interface UsageOverview {
  summary: QueryUsageSummary;
  freeTierRemaining: number;
  isFreeTier: boolean;
}

export interface UsageStats {
  summary: QueryUsageSummary;
  bySource: QueryUsageBySource[];
  byProject: QueryUsageByProject[];
  dailyUsage: { date: string; totalQueries: number; totalCost: number }[];
}

// ── Interface ───────────────────────────────────────────

export interface IQueryMeteringService {
  /**
   * Record one chargeable query execution.
   * Returns the created record, or null if the query was not chargeable.
   */
  recordQuery(opts: {
    organizationId: number;
    projectId: number;
    userId?: number;
    source: string;
    durationMs?: number;
    sqlHash?: string;
  }): Promise<QueryUsage | null>;

  /** High-level overview for the billing page */
  getUsageOverview(organizationId: number): Promise<UsageOverview>;

  /** Detailed stats (filterable) for the billing/usage page */
  getUsageStats(filter: QueryUsageFilter): Promise<UsageStats>;

  /** Whether the org is still within the free tier */
  isFreeTier(organizationId: number): Promise<boolean>;
}

// ── Implementation ──────────────────────────────────────

export class QueryMeteringService implements IQueryMeteringService {
  private readonly queryUsageRepository: IQueryUsageRepository;

  constructor(opts: { queryUsageRepository: IQueryUsageRepository }) {
    this.queryUsageRepository = opts.queryUsageRepository;
  }

  public async recordQuery(opts: {
    organizationId: number;
    projectId: number;
    userId?: number;
    source: string;
    durationMs?: number;
    sqlHash?: string;
  }): Promise<QueryUsage | null> {
    const { organizationId, projectId, userId, source, durationMs, sqlHash } =
      opts;

    // Count total queries so far for free-tier determination
    const totalSoFar =
      await this.queryUsageRepository.getOrgQueryCount(organizationId);
    const isFreeTier = totalSoFar < FREE_TIER_LIMIT;
    const cost = isFreeTier ? 0 : COST_PER_QUERY;

    const record: QueryUsage = {
      organizationId,
      projectId,
      userId: userId ?? null,
      source,
      cost,
      isFreeTier,
      durationMs: durationMs ?? null,
      sqlHash: sqlHash ?? null,
    };

    logger.debug(
      `Recording query: org=${organizationId} project=${projectId} ` +
        `source=${source} free=${isFreeTier} cost=${cost}`,
    );

    const created = await this.queryUsageRepository.createOne(record);
    return created;
  }

  public async getUsageOverview(
    organizationId: number,
  ): Promise<UsageOverview> {
    const summary = await this.queryUsageRepository.getUsageSummary({
      organizationId,
    });
    const freeTierRemaining = Math.max(
      0,
      FREE_TIER_LIMIT - summary.totalQueries,
    );
    return {
      summary,
      freeTierRemaining,
      isFreeTier: summary.totalQueries < FREE_TIER_LIMIT,
    };
  }

  public async getUsageStats(filter: QueryUsageFilter): Promise<UsageStats> {
    const [summary, bySource, byProject, dailyUsage] = await Promise.all([
      this.queryUsageRepository.getUsageSummary(filter),
      this.queryUsageRepository.getUsageBySource(filter),
      this.queryUsageRepository.getUsageByProject(filter),
      this.queryUsageRepository.getDailyUsage(filter),
    ]);
    return { summary, bySource, byProject, dailyUsage };
  }

  public async isFreeTier(organizationId: number): Promise<boolean> {
    const count =
      await this.queryUsageRepository.getOrgQueryCount(organizationId);
    return count < FREE_TIER_LIMIT;
  }
}
