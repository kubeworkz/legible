/**
 * BillingService — cost calculation, monthly billing summaries,
 * and recomputation of the monthly_usage_cache table.
 */

import {
  IBillingConfigRepository,
  BillingConfig,
  IMonthlyUsageCacheRepository,
  MonthlyUsageCache,
} from '../repositories/billingRepository';
import {
  IApiHistoryRepository,
  UsageFilter,
  MonthlyUsage,
} from '../repositories/apiHistoryRepository';

// ── Public types ────────────────────────────────────────

export interface BillingOverview {
  config: BillingConfigInfo;
  currentMonth: MonthlyBillingSummary;
  history: MonthlyBillingSummary[];
}

export interface BillingConfigInfo {
  costPer1kInputTokens: number;
  costPer1kOutputTokens: number;
  currency: string;
  monthlySpendAlert: number | null;
  billingPeriodAnchorDay: number;
}

export interface MonthlyBillingSummary {
  year: number;
  month: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  tokensInput: number;
  tokensOutput: number;
  tokensTotal: number;
  estimatedCost: number;
  perKeyBreakdown: KeyCostBreakdown[];
  perApiTypeBreakdown: ApiTypeCostBreakdown[];
}

export interface KeyCostBreakdown {
  apiKeyId: number;
  apiKeyType: string;
  totalRequests: number;
  tokensTotal: number;
  estimatedCost: number;
}

export interface ApiTypeCostBreakdown {
  apiType: string;
  totalRequests: number;
  tokensTotal: number;
  estimatedCost: number;
}

export interface UpdateBillingConfigInput {
  costPer1kInputTokens?: number;
  costPer1kOutputTokens?: number;
  currency?: string;
  monthlySpendAlert?: number | null;
  billingPeriodAnchorDay?: number;
}

// ── Service interface ───────────────────────────────────

export interface IBillingService {
  getBillingConfig(organizationId: number): Promise<BillingConfigInfo>;
  updateBillingConfig(
    organizationId: number,
    input: UpdateBillingConfigInput,
  ): Promise<BillingConfigInfo>;
  getBillingOverview(organizationId: number): Promise<BillingOverview>;
  getMonthlyBilling(
    organizationId: number,
    year: number,
    month: number,
  ): Promise<MonthlyBillingSummary>;
  recomputeMonth(
    organizationId: number,
    year: number,
    month: number,
  ): Promise<MonthlyBillingSummary>;
  estimateCost(
    tokensInput: number,
    tokensOutput: number,
    config: BillingConfigInfo,
  ): number;
}

// ── Default config ──────────────────────────────────────

const DEFAULT_CONFIG: BillingConfigInfo = {
  costPer1kInputTokens: 0,
  costPer1kOutputTokens: 0,
  currency: 'USD',
  monthlySpendAlert: null,
  billingPeriodAnchorDay: 1,
};

// ── Implementation ──────────────────────────────────────

export class BillingService implements IBillingService {
  private billingConfigRepository: IBillingConfigRepository;
  private monthlyUsageCacheRepository: IMonthlyUsageCacheRepository;
  private apiHistoryRepository: IApiHistoryRepository;

  constructor(opts: {
    billingConfigRepository: IBillingConfigRepository;
    monthlyUsageCacheRepository: IMonthlyUsageCacheRepository;
    apiHistoryRepository: IApiHistoryRepository;
  }) {
    this.billingConfigRepository = opts.billingConfigRepository;
    this.monthlyUsageCacheRepository = opts.monthlyUsageCacheRepository;
    this.apiHistoryRepository = opts.apiHistoryRepository;
  }

  // ── Config ──────────────────────────────────────────

  public async getBillingConfig(
    organizationId: number,
  ): Promise<BillingConfigInfo> {
    const config =
      await this.billingConfigRepository.findByOrgId(organizationId);
    if (!config) return { ...DEFAULT_CONFIG };
    return this.toConfigInfo(config);
  }

  public async updateBillingConfig(
    organizationId: number,
    input: UpdateBillingConfigInput,
  ): Promise<BillingConfigInfo> {
    const data: Partial<BillingConfig> = { organizationId };
    if (input.costPer1kInputTokens !== undefined)
      data.costPer1kInputTokens = input.costPer1kInputTokens;
    if (input.costPer1kOutputTokens !== undefined)
      data.costPer1kOutputTokens = input.costPer1kOutputTokens;
    if (input.currency !== undefined) data.currency = input.currency;
    if (input.monthlySpendAlert !== undefined)
      data.monthlySpendAlert = input.monthlySpendAlert;
    if (input.billingPeriodAnchorDay !== undefined)
      data.billingPeriodAnchorDay = input.billingPeriodAnchorDay;

    const result = await this.billingConfigRepository.upsert(data);
    return this.toConfigInfo(result);
  }

  // ── Overview ────────────────────────────────────────

  public async getBillingOverview(
    organizationId: number,
  ): Promise<BillingOverview> {
    const config = await this.getBillingConfig(organizationId);

    // Current month — always recompute live
    const now = new Date();
    const currentMonth = await this.computeMonthLive(
      organizationId,
      now.getFullYear(),
      now.getMonth() + 1,
      config,
    );

    // Historical months from cache (up to 11 previous months)
    const cached =
      await this.monthlyUsageCacheRepository.findByOrg(organizationId, 12);
    const currentKey = `${now.getFullYear()}-${now.getMonth() + 1}`;
    const history = cached
      .filter((c) => `${c.year}-${c.month}` !== currentKey)
      .map(this.cacheToSummary);

    return { config, currentMonth, history };
  }

  // ── Single month ────────────────────────────────────

  public async getMonthlyBilling(
    organizationId: number,
    year: number,
    month: number,
  ): Promise<MonthlyBillingSummary> {
    // Try cache first
    const cached =
      await this.monthlyUsageCacheRepository.findByOrgAndMonth(
        organizationId,
        year,
        month,
      );
    if (cached) return this.cacheToSummary(cached);

    // Compute live
    const config = await this.getBillingConfig(organizationId);
    return this.computeMonthLive(organizationId, year, month, config);
  }

  // ── Recompute (manual trigger) ──────────────────────

  public async recomputeMonth(
    organizationId: number,
    year: number,
    month: number,
  ): Promise<MonthlyBillingSummary> {
    const config = await this.getBillingConfig(organizationId);
    const summary = await this.computeMonthLive(
      organizationId,
      year,
      month,
      config,
    );

    // Persist to cache
    await this.monthlyUsageCacheRepository.upsert({
      organizationId,
      year,
      month,
      totalRequests: summary.totalRequests,
      successfulRequests: summary.successfulRequests,
      failedRequests: summary.failedRequests,
      tokensInput: summary.tokensInput,
      tokensOutput: summary.tokensOutput,
      tokensTotal: summary.tokensTotal,
      estimatedCost: summary.estimatedCost,
      perKeyBreakdown: summary.perKeyBreakdown,
      perApiTypeBreakdown: summary.perApiTypeBreakdown,
    });

    return summary;
  }

  // ── Cost estimation ─────────────────────────────────

  public estimateCost(
    tokensInput: number,
    tokensOutput: number,
    config: BillingConfigInfo,
  ): number {
    const inputCost =
      (tokensInput / 1000) * config.costPer1kInputTokens;
    const outputCost =
      (tokensOutput / 1000) * config.costPer1kOutputTokens;
    return Math.round((inputCost + outputCost) * 10000) / 10000;
  }

  // ── Private helpers ─────────────────────────────────

  private toConfigInfo(config: BillingConfig): BillingConfigInfo {
    return {
      costPer1kInputTokens: Number(config.costPer1kInputTokens) || 0,
      costPer1kOutputTokens: Number(config.costPer1kOutputTokens) || 0,
      currency: config.currency || 'USD',
      monthlySpendAlert:
        config.monthlySpendAlert != null
          ? Number(config.monthlySpendAlert)
          : null,
      billingPeriodAnchorDay: config.billingPeriodAnchorDay || 1,
    };
  }

  private async computeMonthLive(
    organizationId: number,
    year: number,
    month: number,
    config: BillingConfigInfo,
  ): Promise<MonthlyBillingSummary> {
    const startDate = new Date(Date.UTC(year, month - 1, 1));
    const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    const filter: UsageFilter = {
      organizationId,
      startDate,
      endDate,
    };

    const [summary, byApiType, byApiKey] = await Promise.all([
      this.apiHistoryRepository.getUsageSummary(filter),
      this.apiHistoryRepository.getUsageByApiType(filter),
      this.apiHistoryRepository.getUsageByApiKey(filter),
    ]);

    const estimatedCost = this.estimateCost(
      summary.tokensInput,
      summary.tokensOutput,
      config,
    );

    const perKeyBreakdown: KeyCostBreakdown[] = byApiKey.map((k) => ({
      apiKeyId: k.apiKeyId,
      apiKeyType: k.apiKeyType,
      totalRequests: k.totalRequests,
      tokensTotal: k.tokensTotal,
      // Per-key we don't have input/output split, so use blended rate
      estimatedCost:
        summary.tokensTotal > 0
          ? Math.round(
              (k.tokensTotal / summary.tokensTotal) * estimatedCost * 10000,
            ) / 10000
          : 0,
    }));

    const perApiTypeBreakdown: ApiTypeCostBreakdown[] = byApiType.map((t) => ({
      apiType: t.apiType,
      totalRequests: t.totalRequests,
      tokensTotal: t.tokensTotal,
      estimatedCost:
        summary.tokensTotal > 0
          ? Math.round(
              (t.tokensTotal / summary.tokensTotal) * estimatedCost * 10000,
            ) / 10000
          : 0,
    }));

    return {
      year,
      month,
      totalRequests: summary.totalRequests,
      successfulRequests: summary.successfulRequests,
      failedRequests: summary.failedRequests,
      tokensInput: summary.tokensInput,
      tokensOutput: summary.tokensOutput,
      tokensTotal: summary.tokensTotal,
      estimatedCost,
      perKeyBreakdown,
      perApiTypeBreakdown,
    };
  }

  private cacheToSummary(cache: MonthlyUsageCache): MonthlyBillingSummary {
    return {
      year: cache.year,
      month: cache.month,
      totalRequests: cache.totalRequests,
      successfulRequests: cache.successfulRequests,
      failedRequests: cache.failedRequests,
      tokensInput: Number(cache.tokensInput) || 0,
      tokensOutput: Number(cache.tokensOutput) || 0,
      tokensTotal: Number(cache.tokensTotal) || 0,
      estimatedCost: Number(cache.estimatedCost) || 0,
      perKeyBreakdown: cache.perKeyBreakdown || [],
      perApiTypeBreakdown: cache.perApiTypeBreakdown || [],
    };
  }
}
