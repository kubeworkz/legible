import {
  ISubscriptionRepository,
  Subscription,
} from '../../repositories/subscriptionRepository';
import { StripeService } from '../stripeService';

// ── Mock helpers ────────────────────────────────────────

function mockSubscriptionRepo(): jest.Mocked<ISubscriptionRepository> {
  return {
    findByOrganizationId: jest.fn(),
    findByStripeCustomerId: jest.fn(),
    findByStripeSubscriptionId: jest.fn(),
    createOne: jest.fn(),
    updateByOrganizationId: jest.fn(),
    updateByStripeSubscriptionId: jest.fn(),
  };
}

function makeSub(overrides: Partial<Subscription> = {}): Subscription {
  return {
    id: 1,
    organizationId: 100,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    stripePriceId: null,
    plan: 'free',
    status: 'active',
    paymentMethodBrand: null,
    paymentMethodLast4: null,
    currentPeriodStart: null,
    currentPeriodEnd: null,
    canceledAt: null,
    trialStart: null,
    trialEnd: null,
    ...overrides,
  };
}

// ── Tests ───────────────────────────────────────────────

describe('StripeService', () => {
  let repo: jest.Mocked<ISubscriptionRepository>;

  beforeEach(() => {
    repo = mockSubscriptionRepo();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── isEnabled ──────────────────────────────────────

  describe('isEnabled()', () => {
    it('should return false when no secret key is provided', () => {
      const service = new StripeService({
        subscriptionRepository: repo,
      });
      expect(service.isEnabled()).toBe(false);
    });

    it('should return true when a secret key is provided', () => {
      const service = new StripeService({
        stripeSecretKey: 'sk_test_fake_key_123',
        subscriptionRepository: repo,
      });
      expect(service.isEnabled()).toBe(true);
    });
  });

  // ── getSubscription ────────────────────────────────

  describe('getSubscription()', () => {
    let service: StripeService;

    beforeEach(() => {
      service = new StripeService({ subscriptionRepository: repo });
    });

    it('should return existing subscription info when found', async () => {
      const sub = makeSub({
        plan: 'pro',
        status: 'active',
        stripeCustomerId: 'cus_123',
        stripeSubscriptionId: 'sub_456',
        currentPeriodStart: '2025-01-01T00:00:00Z',
        currentPeriodEnd: '2025-02-01T00:00:00Z',
        paymentMethodBrand: 'visa',
        paymentMethodLast4: '4242',
      });
      repo.findByOrganizationId.mockResolvedValue(sub);

      const info = await service.getSubscription(100);
      expect(info.plan).toBe('pro');
      expect(info.status).toBe('active');
      expect(info.stripeCustomerId).toBe('cus_123');
      expect(info.paymentMethodBrand).toBe('visa');
      expect(info.paymentMethodLast4).toBe('4242');
      expect(repo.findByOrganizationId).toHaveBeenCalledWith(100);
    });

    it('should auto-create a free-tier subscription when none exists', async () => {
      repo.findByOrganizationId.mockResolvedValue(null);
      const created = makeSub({ plan: 'free', status: 'active' });
      repo.createOne.mockResolvedValue(created);

      const info = await service.getSubscription(100);
      expect(info.plan).toBe('free');
      expect(info.status).toBe('active');
      expect(repo.createOne).toHaveBeenCalledWith(
        expect.objectContaining({ organizationId: 100, plan: 'free' }),
      );
    });
  });

  // ── createCheckoutSession ─────────────────────────

  describe('createCheckoutSession()', () => {
    it('should throw when Stripe is not configured', async () => {
      const service = new StripeService({ subscriptionRepository: repo });
      await expect(
        service.createCheckoutSession(1, 'Org', 'a@b.com', '/ok', '/cancel'),
      ).rejects.toThrow('Stripe is not configured');
    });
  });

  // ── createPortalSession ───────────────────────────

  describe('createPortalSession()', () => {
    it('should throw when Stripe is not configured', async () => {
      const service = new StripeService({ subscriptionRepository: repo });
      await expect(service.createPortalSession(1)).rejects.toThrow(
        'Stripe is not configured',
      );
    });

    it('should throw when no Stripe customer exists', async () => {
      const service = new StripeService({
        stripeSecretKey: 'sk_test_fake_key_123',
        subscriptionRepository: repo,
      });
      repo.findByOrganizationId.mockResolvedValue(makeSub());
      await expect(service.createPortalSession(1)).rejects.toThrow(
        'No Stripe customer found',
      );
    });
  });

  // ── cancelSubscription ────────────────────────────

  describe('cancelSubscription()', () => {
    it('should throw when Stripe is not configured', async () => {
      const service = new StripeService({ subscriptionRepository: repo });
      await expect(service.cancelSubscription(1)).rejects.toThrow(
        'Stripe is not configured',
      );
    });

    it('should throw when no active subscription exists', async () => {
      const service = new StripeService({
        stripeSecretKey: 'sk_test_fake_key_123',
        subscriptionRepository: repo,
      });
      repo.findByOrganizationId.mockResolvedValue(makeSub()); // no stripeSubscriptionId
      await expect(service.cancelSubscription(1)).rejects.toThrow(
        'No active subscription to cancel',
      );
    });
  });

  // ── resumeSubscription ────────────────────────────

  describe('resumeSubscription()', () => {
    it('should throw when Stripe is not configured', async () => {
      const service = new StripeService({ subscriptionRepository: repo });
      await expect(service.resumeSubscription(1)).rejects.toThrow(
        'Stripe is not configured',
      );
    });

    it('should throw when no subscription exists', async () => {
      const service = new StripeService({
        stripeSecretKey: 'sk_test_fake_key_123',
        subscriptionRepository: repo,
      });
      repo.findByOrganizationId.mockResolvedValue(makeSub()); // no stripeSubscriptionId
      await expect(service.resumeSubscription(1)).rejects.toThrow(
        'No subscription to resume',
      );
    });
  });

  // ── handleWebhookEvent ────────────────────────────

  describe('handleWebhookEvent()', () => {
    let service: StripeService;

    beforeEach(() => {
      // We use a service without Stripe SDK — webhook handler
      // does not call requireStripe(), so it will work.
      service = new StripeService({ subscriptionRepository: repo });
    });

    it('should handle checkout.session.completed — skip when no organizationId', async () => {
      await service.handleWebhookEvent({
        type: 'checkout.session.completed',
        data: { object: { metadata: {}, subscription: 'sub_x' } },
      });
      // No repo update should happen
      expect(repo.updateByOrganizationId).not.toHaveBeenCalled();
    });

    it('should handle customer.subscription.updated — skip when not in DB', async () => {
      repo.findByStripeSubscriptionId.mockResolvedValue(null);
      await service.handleWebhookEvent({
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: 'sub_unknown',
            status: 'active',
            currentPeriodStart: 1700000000,
            currentPeriodEnd: 1700100000,
            cancelAtPeriodEnd: false,
          },
        },
      });
      expect(repo.updateByStripeSubscriptionId).not.toHaveBeenCalled();
    });

    it('should handle customer.subscription.updated — update status and dates', async () => {
      const existingSub = makeSub({
        stripeSubscriptionId: 'sub_abc',
        plan: 'pro',
        status: 'active',
      });
      repo.findByStripeSubscriptionId.mockResolvedValue(existingSub);
      repo.updateByStripeSubscriptionId.mockResolvedValue(existingSub);

      await service.handleWebhookEvent({
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: 'sub_abc',
            status: 'active',
            currentPeriodStart: 1700000000,
            currentPeriodEnd: 1700100000,
            cancelAtPeriodEnd: false,
            defaultPaymentMethod: null,
          },
        },
      });

      expect(repo.updateByStripeSubscriptionId).toHaveBeenCalledWith(
        'sub_abc',
        expect.objectContaining({
          status: 'active',
          canceledAt: null,
        }),
      );
    });

    it('should handle customer.subscription.deleted — downgrade to free', async () => {
      const existingSub = makeSub({
        stripeSubscriptionId: 'sub_del',
        plan: 'pro',
      });
      repo.findByStripeSubscriptionId.mockResolvedValue(existingSub);
      repo.updateByStripeSubscriptionId.mockResolvedValue(existingSub);

      await service.handleWebhookEvent({
        type: 'customer.subscription.deleted',
        data: { object: { id: 'sub_del' } },
      });

      expect(repo.updateByStripeSubscriptionId).toHaveBeenCalledWith(
        'sub_del',
        expect.objectContaining({
          plan: 'free',
          status: 'canceled',
          stripeSubscriptionId: null,
        }),
      );
    });

    it('should handle customer.subscription.deleted — skip when not in DB', async () => {
      repo.findByStripeSubscriptionId.mockResolvedValue(null);
      await service.handleWebhookEvent({
        type: 'customer.subscription.deleted',
        data: { object: { id: 'sub_nope' } },
      });
      expect(repo.updateByStripeSubscriptionId).not.toHaveBeenCalled();
    });

    it('should handle invoice.payment_failed — set past_due', async () => {
      const existingSub = makeSub({
        stripeSubscriptionId: 'sub_fail',
        plan: 'pro',
      });
      repo.findByStripeSubscriptionId.mockResolvedValue(existingSub);
      repo.updateByStripeSubscriptionId.mockResolvedValue(existingSub);

      await service.handleWebhookEvent({
        type: 'invoice.payment_failed',
        data: { object: { subscription: 'sub_fail' } },
      });

      expect(repo.updateByStripeSubscriptionId).toHaveBeenCalledWith(
        'sub_fail',
        { status: 'past_due' },
      );
    });

    it('should handle invoice.payment_failed — skip when no subscription ID', async () => {
      await service.handleWebhookEvent({
        type: 'invoice.payment_failed',
        data: { object: { subscription: null } },
      });
      expect(repo.findByStripeSubscriptionId).not.toHaveBeenCalled();
    });

    it('should handle invoice.payment_failed — skip when not in DB', async () => {
      repo.findByStripeSubscriptionId.mockResolvedValue(null);
      await service.handleWebhookEvent({
        type: 'invoice.payment_failed',
        data: { object: { subscription: 'sub_missing' } },
      });
      expect(repo.updateByStripeSubscriptionId).not.toHaveBeenCalled();
    });

    it('should silently ignore unknown events', async () => {
      await service.handleWebhookEvent({
        type: 'some.unknown.event',
        data: { object: {} },
      });
      // No errors thrown, no repo calls
      expect(repo.updateByOrganizationId).not.toHaveBeenCalled();
      expect(repo.updateByStripeSubscriptionId).not.toHaveBeenCalled();
    });
  });

  // ── reportOverageUsage ────────────────────────────

  describe('reportOverageUsage()', () => {
    it('should return immediately when Stripe is not configured', async () => {
      const service = new StripeService({ subscriptionRepository: repo });
      // Should not throw
      await service.reportOverageUsage(100, 5);
      expect(repo.findByOrganizationId).not.toHaveBeenCalled();
    });

    it('should skip when no Stripe customer exists', async () => {
      const service = new StripeService({
        stripeSecretKey: 'sk_test_fake_key_123',
        subscriptionRepository: repo,
      });
      repo.findByOrganizationId.mockResolvedValue(makeSub());
      await service.reportOverageUsage(100, 5);
      // Customer ID is null — should not attempt to create meter event
    });
  });
});
