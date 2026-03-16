/**
 * QueryMeteringService — tracks per-query SQL usage for billing.
 *
 * Rules:
 *   • $0.02 per SQL query executed against a real data connection
 *   • First 25 queries per organization per month are free
 *   • Pro/Enterprise subscribers get unlimited queries
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
import { ISubscriptionRepository } from '../repositories/subscriptionRepository';
import { IStripeService } from './stripeService';
import { getLogger } from '@server/utils';

const logger = getLogger('QueryMeteringService');
logger.level = 'debug';

// ── Constants ───────────────────────────────────────────

export const FREE_TIER_LIMIT = 25;
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

export interface QueryAllowance {
  allowed: boolean;
  reason?: string;
  plan: string;
  monthlyUsed: number;
  monthlyLimit: number | null; // null = unlimited
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

  /**
   * Pre-execution check: is this org allowed to run another query?
   * Pro/Enterprise → always allowed. Free → allowed if < 25 this month.
   */
  checkQueryAllowance(organizationId: number): Promise<QueryAllowance>;

  /** Inject StripeService after construction (avoids circular init order) */
  setStripeService(stripeService: IStripeService): void;
}

// ── Implementation ──────────────────────────────────────

export class QueryMeteringService implements IQueryMeteringService {
  private readonly queryUsageRepository: IQueryUsageRepository;
  private readonly subscriptionRepository?: ISubscriptionRepository;
  private stripeService?: IStripeService;

  constructor(opts: {
    queryUsageRepository: IQueryUsageRepository;
    subscriptionRepository?: ISubscriptionRepository;
    stripeService?: IStripeService;
  }) {
    this.queryUsageRepository = opts.queryUsageRepository;
    this.subscriptionRepository = opts.subscriptionRepository;
    this.stripeService = opts.stripeService;
  }

  public setStripeService(stripeService: IStripeService): void {
    this.stripeService = stripeService;
  }

  /** Start of current calendar month (UTC) */
  private getMonthStart(): Date {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  }

  /** Get the subscription plan for an org; defaults to 'free' */
  private async getOrgPlan(
    organizationId: number,
  ): Promise<string> {
    if (!this.subscriptionRepository) return 'free';
    const sub =
      await this.subscriptionRepository.findByOrganizationId(organizationId);
    return sub?.plan || 'free';
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

    // Count queries this month for free-tier determination
    const monthStart = this.getMonthStart();
    const plan = await this.getOrgPlan(organizationId);
    const isPaidPlan = plan === 'pro' || plan === 'enterprise';

    // Pro/Enterprise: always free (included in subscription)
    // Free: first 25/month free, then $0.02/query
    let isFreeTier: boolean;
    let cost: number;
    if (isPaidPlan) {
      isFreeTier = true; // queries included in plan
      cost = 0;
    } else {
      const monthlyCount = await this.queryUsageRepository.getOrgQueryCount(
        organizationId,
        monthStart,
      );
      isFreeTier = monthlyCount < FREE_TIER_LIMIT;
      cost = isFreeTier ? 0 : COST_PER_QUERY;
    }

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

    // Report overage usage to Stripe for free-tier orgs past the limit
    if (!isFreeTier && !isPaidPlan && this.stripeService?.isEnabled()) {
      try {
        await this.stripeService.reportOverageUsage(organizationId, 1);
      } catch (err: any) {
        logger.error(`Failed to report overage to Stripe: ${err.message}`);
      }
    }

    return created;
  }

  public async getUsageOverview(
    organizationId: number,
  ): Promise<UsageOverview> {
    const plan = await this.getOrgPlan(organizationId);
    const isPaidPlan = plan === 'pro' || plan === 'enterprise';

    const summary = await this.queryUsageRepository.getUsageSummary({
      organizationId,
    });

    // For paid plans, free tier is effectively unlimited
    if (isPaidPlan) {
      return {
        summary,
        freeTierRemaining: Infinity,
        isFreeTier: true,
      };
    }

    // For free plan, count this month's usage
    const monthStart = this.getMonthStart();
    const monthlyCount = await this.queryUsageRepository.getOrgQueryCount(
      organizationId,
      monthStart,
    );
    const freeTierRemaining = Math.max(0, FREE_TIER_LIMIT - monthlyCount);
    return {
      summary,
      freeTierRemaining,
      isFreeTier: monthlyCount < FREE_TIER_LIMIT,
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
    const plan = await this.getOrgPlan(organizationId);
    if (plan === 'pro' || plan === 'enterprise') return true; // always "free" for paid plans

    const monthStart = this.getMonthStart();
    const count = await this.queryUsageRepository.getOrgQueryCount(
      organizationId,
      monthStart,
    );
    return count < FREE_TIER_LIMIT;
  }

  public async checkQueryAllowance(
    organizationId: number,
  ): Promise<QueryAllowance> {
    const plan = await this.getOrgPlan(organizationId);

    // Pro and Enterprise have unlimited queries
    if (plan === 'pro' || plan === 'enterprise') {
      return {
        allowed: true,
        plan,
        monthlyUsed: 0, // not tracked for paid plans
        monthlyLimit: null,
      };
    }

    // Free plan: enforce monthly limit
    const monthStart = this.getMonthStart();
    const monthlyUsed = await this.queryUsageRepository.getOrgQueryCount(
      organizationId,
      monthStart,
    );

    if (monthlyUsed >= FREE_TIER_LIMIT) {
      return {
        allowed: false,
        reason: `Monthly free-tier limit of ${FREE_TIER_LIMIT} queries reached. Upgrade to Pro for unlimited queries.`,
        plan,
        monthlyUsed,
        monthlyLimit: FREE_TIER_LIMIT,
      };
    }

    return {
      allowed: true,
      plan,
      monthlyUsed,
      monthlyLimit: FREE_TIER_LIMIT,
    };
  }
}
