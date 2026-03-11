import {
  IQueryUsageRepository,
  QueryUsage,
  QueryUsageSummary,
} from '../../repositories/queryUsageRepository';
import { ISubscriptionRepository } from '../../repositories/subscriptionRepository';
import {
  QueryMeteringService,
  FREE_TIER_LIMIT,
  COST_PER_QUERY,
} from '../queryMeteringService';
import { IStripeService } from '../stripeService';

// ── Mock factories ──────────────────────────────────────

function mockUsageRepo(): jest.Mocked<IQueryUsageRepository> {
  return {
    transaction: jest.fn(),
    commit: jest.fn(),
    rollback: jest.fn(),
    findOneBy: jest.fn(),
    findAllBy: jest.fn(),
    findAll: jest.fn(),
    createOne: jest.fn(),
    createMany: jest.fn(),
    updateOne: jest.fn(),
    deleteOne: jest.fn(),
    deleteMany: jest.fn(),
    deleteAllBy: jest.fn(),
    getOrgQueryCount: jest.fn(),
    getUsageSummary: jest.fn(),
    getUsageBySource: jest.fn(),
    getUsageByProject: jest.fn(),
    getDailyUsage: jest.fn(),
  };
}

function mockSubRepo(): jest.Mocked<ISubscriptionRepository> {
  return {
    findByOrganizationId: jest.fn(),
    findByStripeCustomerId: jest.fn(),
    findByStripeSubscriptionId: jest.fn(),
    createOne: jest.fn(),
    updateByOrganizationId: jest.fn(),
    updateByStripeSubscriptionId: jest.fn(),
  };
}

function mockStripeService(): jest.Mocked<IStripeService> {
  return {
    isEnabled: jest.fn().mockReturnValue(true),
    getSubscription: jest.fn(),
    createCheckoutSession: jest.fn(),
    createPortalSession: jest.fn(),
    cancelSubscription: jest.fn(),
    resumeSubscription: jest.fn(),
    handleWebhookEvent: jest.fn(),
    reportOverageUsage: jest.fn(),
  };
}

// ── Tests ───────────────────────────────────────────────

describe('QueryMeteringService', () => {
  let usageRepo: jest.Mocked<IQueryUsageRepository>;
  let subRepo: jest.Mocked<ISubscriptionRepository>;
  let stripeService: jest.Mocked<IStripeService>;
  let service: QueryMeteringService;

  beforeEach(() => {
    usageRepo = mockUsageRepo();
    subRepo = mockSubRepo();
    stripeService = mockStripeService();
    service = new QueryMeteringService({
      queryUsageRepository: usageRepo,
      subscriptionRepository: subRepo,
    });
    service.setStripeService(stripeService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── checkQueryAllowance ────────────────────────────

  describe('checkQueryAllowance()', () => {
    it('should allow unlimited queries for pro plan', async () => {
      subRepo.findByOrganizationId.mockResolvedValue({
        id: 1,
        organizationId: 100,
        plan: 'pro',
        status: 'active',
        stripeCustomerId: 'cus_x',
        stripeSubscriptionId: 'sub_x',
        stripePriceId: null,
        paymentMethodBrand: null,
        paymentMethodLast4: null,
        currentPeriodStart: null,
        currentPeriodEnd: null,
        canceledAt: null,
        trialStart: null,
        trialEnd: null,
      });

      const result = await service.checkQueryAllowance(100);
      expect(result.allowed).toBe(true);
      expect(result.plan).toBe('pro');
      expect(result.monthlyLimit).toBeNull();
    });

    it('should allow queries when free tier under limit', async () => {
      subRepo.findByOrganizationId.mockResolvedValue(null); // defaults to free
      usageRepo.getOrgQueryCount.mockResolvedValue(200);

      const result = await service.checkQueryAllowance(100);
      expect(result.allowed).toBe(true);
      expect(result.plan).toBe('free');
      expect(result.monthlyUsed).toBe(200);
      expect(result.monthlyLimit).toBe(FREE_TIER_LIMIT);
    });

    it('should block queries when free tier at limit', async () => {
      subRepo.findByOrganizationId.mockResolvedValue(null);
      usageRepo.getOrgQueryCount.mockResolvedValue(FREE_TIER_LIMIT);

      const result = await service.checkQueryAllowance(100);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('limit');
      expect(result.monthlyUsed).toBe(FREE_TIER_LIMIT);
    });

    it('should block queries when free tier over limit', async () => {
      subRepo.findByOrganizationId.mockResolvedValue(null);
      usageRepo.getOrgQueryCount.mockResolvedValue(FREE_TIER_LIMIT + 50);

      const result = await service.checkQueryAllowance(100);
      expect(result.allowed).toBe(false);
    });

    it('should allow unlimited queries for enterprise plan', async () => {
      subRepo.findByOrganizationId.mockResolvedValue({
        id: 1,
        organizationId: 100,
        plan: 'enterprise',
        status: 'active',
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        stripePriceId: null,
        paymentMethodBrand: null,
        paymentMethodLast4: null,
        currentPeriodStart: null,
        currentPeriodEnd: null,
        canceledAt: null,
        trialStart: null,
        trialEnd: null,
      });

      const result = await service.checkQueryAllowance(100);
      expect(result.allowed).toBe(true);
      expect(result.monthlyLimit).toBeNull();
    });
  });

  // ── recordQuery ────────────────────────────────────

  describe('recordQuery()', () => {
    const baseOpts = {
      organizationId: 100,
      projectId: 1,
      userId: 10,
      source: 'api',
    };

    it('should record with zero cost for pro plan', async () => {
      subRepo.findByOrganizationId.mockResolvedValue({
        id: 1,
        organizationId: 100,
        plan: 'pro',
        status: 'active',
        stripeCustomerId: 'cus_x',
        stripeSubscriptionId: 'sub_x',
        stripePriceId: null,
        paymentMethodBrand: null,
        paymentMethodLast4: null,
        currentPeriodStart: null,
        currentPeriodEnd: null,
        canceledAt: null,
        trialStart: null,
        trialEnd: null,
      });
      usageRepo.createOne.mockImplementation(async (r) => r as any);

      const record = await service.recordQuery(baseOpts);
      expect(record?.cost).toBe(0);
      expect(record?.isFreeTier).toBe(true);
      expect(stripeService.reportOverageUsage).not.toHaveBeenCalled();
    });

    it('should record with zero cost for free plan within limit', async () => {
      subRepo.findByOrganizationId.mockResolvedValue(null);
      usageRepo.getOrgQueryCount.mockResolvedValue(100);
      usageRepo.createOne.mockImplementation(async (r) => r as any);

      const record = await service.recordQuery(baseOpts);
      expect(record?.cost).toBe(0);
      expect(record?.isFreeTier).toBe(true);
      expect(stripeService.reportOverageUsage).not.toHaveBeenCalled();
    });

    it('should record with overage cost for free plan over limit', async () => {
      subRepo.findByOrganizationId.mockResolvedValue(null);
      usageRepo.getOrgQueryCount.mockResolvedValue(FREE_TIER_LIMIT + 10);
      usageRepo.createOne.mockImplementation(async (r) => r as any);

      const record = await service.recordQuery(baseOpts);
      expect(record?.cost).toBe(COST_PER_QUERY);
      expect(record?.isFreeTier).toBe(false);
      expect(stripeService.reportOverageUsage).toHaveBeenCalledWith(100, 1);
    });

    it('should not report overage to Stripe when Stripe is disabled', async () => {
      stripeService.isEnabled.mockReturnValue(false);
      subRepo.findByOrganizationId.mockResolvedValue(null);
      usageRepo.getOrgQueryCount.mockResolvedValue(FREE_TIER_LIMIT + 10);
      usageRepo.createOne.mockImplementation(async (r) => r as any);

      await service.recordQuery(baseOpts);
      expect(stripeService.reportOverageUsage).not.toHaveBeenCalled();
    });

    it('should handle Stripe overage reporting errors gracefully', async () => {
      subRepo.findByOrganizationId.mockResolvedValue(null);
      usageRepo.getOrgQueryCount.mockResolvedValue(FREE_TIER_LIMIT + 1);
      usageRepo.createOne.mockImplementation(async (r) => r as any);
      stripeService.reportOverageUsage.mockRejectedValue(
        new Error('Stripe API error'),
      );

      // Should not throw
      const record = await service.recordQuery(baseOpts);
      expect(record).toBeTruthy();
    });
  });

  // ── isFreeTier ─────────────────────────────────────

  describe('isFreeTier()', () => {
    it('should return true for paid plans', async () => {
      subRepo.findByOrganizationId.mockResolvedValue({
        id: 1,
        organizationId: 100,
        plan: 'pro',
        status: 'active',
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        stripePriceId: null,
        paymentMethodBrand: null,
        paymentMethodLast4: null,
        currentPeriodStart: null,
        currentPeriodEnd: null,
        canceledAt: null,
        trialStart: null,
        trialEnd: null,
      });

      expect(await service.isFreeTier(100)).toBe(true);
    });

    it('should return true when monthly count is under limit', async () => {
      subRepo.findByOrganizationId.mockResolvedValue(null);
      usageRepo.getOrgQueryCount.mockResolvedValue(499);

      expect(await service.isFreeTier(100)).toBe(true);
    });

    it('should return false when monthly count is at limit', async () => {
      subRepo.findByOrganizationId.mockResolvedValue(null);
      usageRepo.getOrgQueryCount.mockResolvedValue(FREE_TIER_LIMIT);

      expect(await service.isFreeTier(100)).toBe(false);
    });
  });

  // ── getUsageOverview ───────────────────────────────

  describe('getUsageOverview()', () => {
    const fakeSummary: QueryUsageSummary = {
      totalQueries: 300,
      totalCost: 0,
      freeTierQueries: 300,
      paidQueries: 0,
    };

    it('should return infinity remaining for paid plans', async () => {
      subRepo.findByOrganizationId.mockResolvedValue({
        id: 1,
        organizationId: 100,
        plan: 'pro',
        status: 'active',
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        stripePriceId: null,
        paymentMethodBrand: null,
        paymentMethodLast4: null,
        currentPeriodStart: null,
        currentPeriodEnd: null,
        canceledAt: null,
        trialStart: null,
        trialEnd: null,
      });
      usageRepo.getUsageSummary.mockResolvedValue(fakeSummary);

      const overview = await service.getUsageOverview(100);
      expect(overview.freeTierRemaining).toBe(Infinity);
      expect(overview.isFreeTier).toBe(true);
    });

    it('should return correct remaining for free plan', async () => {
      subRepo.findByOrganizationId.mockResolvedValue(null);
      usageRepo.getUsageSummary.mockResolvedValue(fakeSummary);
      usageRepo.getOrgQueryCount.mockResolvedValue(200);

      const overview = await service.getUsageOverview(100);
      expect(overview.freeTierRemaining).toBe(300);
      expect(overview.isFreeTier).toBe(true);
    });

    it('should return zero remaining when at limit', async () => {
      subRepo.findByOrganizationId.mockResolvedValue(null);
      usageRepo.getUsageSummary.mockResolvedValue(fakeSummary);
      usageRepo.getOrgQueryCount.mockResolvedValue(FREE_TIER_LIMIT);

      const overview = await service.getUsageOverview(100);
      expect(overview.freeTierRemaining).toBe(0);
      expect(overview.isFreeTier).toBe(false);
    });
  });

  // ── getUsageStats ──────────────────────────────────

  describe('getUsageStats()', () => {
    it('should aggregate all stat queries in parallel', async () => {
      usageRepo.getUsageSummary.mockResolvedValue({
        totalQueries: 10,
        totalCost: 0,
        freeTierQueries: 10,
        paidQueries: 0,
      });
      usageRepo.getUsageBySource.mockResolvedValue([]);
      usageRepo.getUsageByProject.mockResolvedValue([]);
      usageRepo.getDailyUsage.mockResolvedValue([]);

      const filter = { organizationId: 100 };
      const stats = await service.getUsageStats(filter);
      expect(stats.summary.totalQueries).toBe(10);
      expect(stats.bySource).toEqual([]);
      expect(stats.byProject).toEqual([]);
      expect(stats.dailyUsage).toEqual([]);

      expect(usageRepo.getUsageSummary).toHaveBeenCalledWith(filter);
      expect(usageRepo.getUsageBySource).toHaveBeenCalledWith(filter);
      expect(usageRepo.getUsageByProject).toHaveBeenCalledWith(filter);
      expect(usageRepo.getDailyUsage).toHaveBeenCalledWith(filter);
    });
  });

  // ── setStripeService ───────────────────────────────

  describe('setStripeService()', () => {
    it('should replace the stripe service at runtime', async () => {
      const newStripe = mockStripeService();
      newStripe.isEnabled.mockReturnValue(false);
      service.setStripeService(newStripe);

      // Record a query over the limit — should NOT call old mock
      subRepo.findByOrganizationId.mockResolvedValue(null);
      usageRepo.getOrgQueryCount.mockResolvedValue(FREE_TIER_LIMIT + 1);
      usageRepo.createOne.mockImplementation(async (r) => r as any);

      await service.recordQuery({
        organizationId: 100,
        projectId: 1,
        source: 'api',
      });

      // Old mock should not have been called
      expect(stripeService.reportOverageUsage).not.toHaveBeenCalled();
      // New mock was used (but isEnabled returns false, so reportOverageUsage is not called)
      expect(newStripe.reportOverageUsage).not.toHaveBeenCalled();
    });
  });
});
