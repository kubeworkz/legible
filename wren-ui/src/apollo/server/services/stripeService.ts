/**
 * StripeService — Stripe integration for subscriptions, payment methods,
 * checkout sessions, and customer portal.
 *
 * Plan structure:
 *   • Free: $0/mo — 500 queries included, $0.02/query overage
 *   • Pro:  configurable via STRIPE_PRO_PRICE_ID — unlimited queries, priority support
 */

import Stripe from 'stripe';
import {
  ISubscriptionRepository,
  Subscription,
  SubscriptionPlan,
  SubscriptionStatus,
} from '../repositories/subscriptionRepository';
import { getLogger } from '@server/utils';

const logger = getLogger('StripeService');
logger.level = 'debug';

// ── Public types ────────────────────────────────────────

export interface SubscriptionInfo {
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  canceledAt: string | null;
  paymentMethodBrand: string | null;
  paymentMethodLast4: string | null;
}

export interface CreateCheckoutResult {
  sessionId: string;
  url: string;
}

export interface CreatePortalResult {
  url: string;
}

// ── Interface ───────────────────────────────────────────

export interface IStripeService {
  /** Returns true when Stripe env vars are present and the service is functional */
  isEnabled(): boolean;

  /** Get or create a subscription row for an org (defaults to free) */
  getSubscription(organizationId: number): Promise<SubscriptionInfo>;

  /** Create a Stripe Checkout session for upgrading to Pro */
  createCheckoutSession(
    organizationId: number,
    orgName: string,
    userEmail: string,
    successUrl: string,
    cancelUrl: string,
  ): Promise<CreateCheckoutResult>;

  /** Create a Stripe billing portal session for managing payment methods */
  createPortalSession(organizationId: number): Promise<CreatePortalResult>;

  /** Cancel the current subscription (at period end) */
  cancelSubscription(organizationId: number): Promise<SubscriptionInfo>;

  /** Resume a canceled subscription (before period end) */
  resumeSubscription(organizationId: number): Promise<SubscriptionInfo>;

  /** Handle a Stripe webhook event — called from the webhook route */
  handleWebhookEvent(event: any): Promise<void>;
}

// ── Implementation ──────────────────────────────────────

export class StripeService implements IStripeService {
  // Use 'any' to avoid Stripe SDK version-specific type issues
  private readonly stripe: any;
  private readonly subscriptionRepository: ISubscriptionRepository;
  private readonly proPriceId: string;
  private readonly portalReturnUrl: string;
  private readonly enabled: boolean;

  constructor(opts: {
    stripeSecretKey?: string;
    stripeProPriceId?: string;
    stripePortalReturnUrl?: string;
    subscriptionRepository: ISubscriptionRepository;
  }) {
    this.subscriptionRepository = opts.subscriptionRepository;
    this.proPriceId = opts.stripeProPriceId || '';
    this.portalReturnUrl =
      opts.stripePortalReturnUrl || 'http://localhost:3000';

    if (opts.stripeSecretKey) {
      this.stripe = new Stripe(opts.stripeSecretKey);
      this.enabled = true;
      logger.info('Stripe integration enabled');
    } else {
      this.stripe = null;
      this.enabled = false;
      logger.info(
        'Stripe integration disabled (STRIPE_SECRET_KEY not set)',
      );
    }
  }

  // ── Public methods ────────────────────────────────────

  public isEnabled(): boolean {
    return this.enabled;
  }

  public async getSubscription(
    organizationId: number,
  ): Promise<SubscriptionInfo> {
    let sub = await this.subscriptionRepository.findByOrganizationId(
      organizationId,
    );
    if (!sub) {
      // Auto-create free tier record
      sub = await this.subscriptionRepository.createOne({
        organizationId,
        plan: 'free',
        status: 'active',
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        stripePriceId: null,
        paymentMethodBrand: null,
        paymentMethodLast4: null,
        currentPeriodStart: null,
        currentPeriodEnd: null,
        canceledAt: null,
      });
    }
    return this.toInfo(sub);
  }

  public async createCheckoutSession(
    organizationId: number,
    orgName: string,
    userEmail: string,
    successUrl: string,
    cancelUrl: string,
  ): Promise<CreateCheckoutResult> {
    this.requireStripe();

    // Ensure we have a Stripe customer for this org
    let sub = await this.subscriptionRepository.findByOrganizationId(
      organizationId,
    );
    let customerId = sub?.stripeCustomerId;
    if (!customerId) {
      const customer = await this.stripe!.customers.create({
        email: userEmail,
        name: orgName,
        metadata: { organizationId: String(organizationId) },
      });
      customerId = customer.id;
      if (sub) {
        await this.subscriptionRepository.updateByOrganizationId(
          organizationId,
          { stripeCustomerId: customerId },
        );
      } else {
        sub = await this.subscriptionRepository.createOne({
          organizationId,
          stripeCustomerId: customerId,
          plan: 'free',
          status: 'active',
          stripeSubscriptionId: null,
          stripePriceId: null,
          paymentMethodBrand: null,
          paymentMethodLast4: null,
          currentPeriodStart: null,
          currentPeriodEnd: null,
          canceledAt: null,
        });
      }
    }

    const session = await this.stripe!.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      lineItems: [{ price: this.proPriceId, quantity: 1 }],
      successUrl: successUrl,
      cancelUrl: cancelUrl,
      metadata: { organizationId: String(organizationId) },
    });

    return { sessionId: session.id, url: session.url! };
  }

  public async createPortalSession(
    organizationId: number,
  ): Promise<CreatePortalResult> {
    this.requireStripe();

    const sub = await this.subscriptionRepository.findByOrganizationId(
      organizationId,
    );
    if (!sub?.stripeCustomerId) {
      throw new Error('No Stripe customer found for this organization');
    }

    const session = await this.stripe!.billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      returnUrl: this.portalReturnUrl,
    });

    return { url: session.url };
  }

  public async cancelSubscription(
    organizationId: number,
  ): Promise<SubscriptionInfo> {
    this.requireStripe();

    const sub = await this.subscriptionRepository.findByOrganizationId(
      organizationId,
    );
    if (!sub?.stripeSubscriptionId) {
      throw new Error('No active subscription to cancel');
    }

    await this.stripe!.subscriptions.update(sub.stripeSubscriptionId, {
      cancelAtPeriodEnd: true,
    });

    const updated = await this.subscriptionRepository.updateByOrganizationId(
      organizationId,
      { canceledAt: new Date().toISOString() },
    );
    return this.toInfo(updated!);
  }

  public async resumeSubscription(
    organizationId: number,
  ): Promise<SubscriptionInfo> {
    this.requireStripe();

    const sub = await this.subscriptionRepository.findByOrganizationId(
      organizationId,
    );
    if (!sub?.stripeSubscriptionId) {
      throw new Error('No subscription to resume');
    }

    await this.stripe!.subscriptions.update(sub.stripeSubscriptionId, {
      cancelAtPeriodEnd: false,
    });

    const updated = await this.subscriptionRepository.updateByOrganizationId(
      organizationId,
      { canceledAt: null },
    );
    return this.toInfo(updated!);
  }

  // ── Webhook handler ───────────────────────────────────

  public async handleWebhookEvent(event: any): Promise<void> {
    logger.debug(`Handling Stripe event: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(event.data.object);
        break;

      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event.data.object);
        break;

      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object);
        break;

      case 'invoice.payment_failed':
        await this.handlePaymentFailed(event.data.object);
        break;

      default:
        logger.debug(`Unhandled Stripe event type: ${event.type}`);
    }
  }

  // ── Webhook event handlers ────────────────────────────

  private async handleCheckoutCompleted(
    session: any,
  ): Promise<void> {
    const organizationId = session.metadata?.organizationId
      ? parseInt(session.metadata.organizationId, 10)
      : null;
    if (!organizationId) {
      logger.error(
        'checkout.session.completed: no organizationId in metadata',
      );
      return;
    }

    const subscriptionId = session.subscription as string;
    if (!subscriptionId) return;

    // Fetch the full subscription to get period dates
    const stripeSub =
      await this.stripe!.subscriptions.retrieve(subscriptionId);

    // Get payment method info
    let pmBrand: string | null = null;
    let pmLast4: string | null = null;
    if (stripeSub.defaultPaymentMethod) {
      const pm = await this.stripe!.paymentMethods.retrieve(
        stripeSub.defaultPaymentMethod as string,
      );
      pmBrand = pm.card?.brand || null;
      pmLast4 = pm.card?.last4 || null;
    }

    await this.subscriptionRepository.updateByOrganizationId(organizationId, {
      stripeCustomerId: session.customer as string,
      stripeSubscriptionId: subscriptionId,
      stripePriceId: stripeSub.items.data[0]?.price?.id || null,
      plan: 'pro',
      status: this.mapStripeStatus(stripeSub.status),
      paymentMethodBrand: pmBrand,
      paymentMethodLast4: pmLast4,
      currentPeriodStart: new Date(
        stripeSub.currentPeriodStart * 1000,
      ).toISOString(),
      currentPeriodEnd: new Date(
        stripeSub.currentPeriodEnd * 1000,
      ).toISOString(),
      canceledAt: null,
    });

    logger.info(
      `Organization ${organizationId} upgraded to Pro (sub=${subscriptionId})`,
    );
  }

  private async handleSubscriptionUpdated(
    stripeSub: any,
  ): Promise<void> {
    const sub = await this.subscriptionRepository.findByStripeSubscriptionId(
      stripeSub.id,
    );
    if (!sub) {
      logger.debug(
        `Subscription ${stripeSub.id} not found in DB — ignoring update`,
      );
      return;
    }

    const updateData: Partial<Subscription> = {
      status: this.mapStripeStatus(stripeSub.status),
      currentPeriodStart: new Date(
        stripeSub.currentPeriodStart * 1000,
      ).toISOString(),
      currentPeriodEnd: new Date(
        stripeSub.currentPeriodEnd * 1000,
      ).toISOString(),
      canceledAt: stripeSub.cancelAtPeriodEnd
        ? new Date().toISOString()
        : null,
    };

    // Update payment method if changed
    if (stripeSub.defaultPaymentMethod) {
      try {
        const pm = await this.stripe!.paymentMethods.retrieve(
          stripeSub.defaultPaymentMethod as string,
        );
        updateData.paymentMethodBrand = pm.card?.brand || null;
        updateData.paymentMethodLast4 = pm.card?.last4 || null;
      } catch {
        // non-critical
      }
    }

    await this.subscriptionRepository.updateByStripeSubscriptionId(
      stripeSub.id,
      updateData,
    );
  }

  private async handleSubscriptionDeleted(
    stripeSub: any,
  ): Promise<void> {
    const sub = await this.subscriptionRepository.findByStripeSubscriptionId(
      stripeSub.id,
    );
    if (!sub) return;

    await this.subscriptionRepository.updateByStripeSubscriptionId(
      stripeSub.id,
      {
        plan: 'free',
        status: 'canceled',
        stripeSubscriptionId: null,
        stripePriceId: null,
        canceledAt: new Date().toISOString(),
      },
    );

    logger.info(
      `Organization ${sub.organizationId} downgraded to Free (sub deleted)`,
    );
  }

  private async handlePaymentFailed(
    invoice: any,
  ): Promise<void> {
    const subscriptionId = invoice.subscription as string;
    if (!subscriptionId) return;

    const sub = await this.subscriptionRepository.findByStripeSubscriptionId(
      subscriptionId,
    );
    if (!sub) return;

    await this.subscriptionRepository.updateByStripeSubscriptionId(
      subscriptionId,
      { status: 'past_due' },
    );

    logger.warn(
      `Payment failed for org=${sub.organizationId} sub=${subscriptionId}`,
    );
  }

  // ── Private helpers ───────────────────────────────────

  private requireStripe(): void {
    if (!this.stripe) {
      throw new Error(
        'Stripe is not configured. Set STRIPE_SECRET_KEY environment variable.',
      );
    }
  }

  private mapStripeStatus(
    stripeStatus: string,
  ): SubscriptionStatus {
    const map: Record<string, SubscriptionStatus> = {
      active: 'active',
      trialing: 'trialing',
      past_due: 'past_due',
      canceled: 'canceled',
      unpaid: 'unpaid',
      incomplete: 'incomplete',
      incomplete_expired: 'incomplete_expired',
    };
    return map[stripeStatus] || 'active';
  }

  private toInfo(sub: Subscription): SubscriptionInfo {
    return {
      plan: sub.plan,
      status: sub.status,
      stripeCustomerId: sub.stripeCustomerId,
      stripeSubscriptionId: sub.stripeSubscriptionId,
      currentPeriodStart: sub.currentPeriodStart,
      currentPeriodEnd: sub.currentPeriodEnd,
      canceledAt: sub.canceledAt,
      paymentMethodBrand: sub.paymentMethodBrand,
      paymentMethodLast4: sub.paymentMethodLast4,
    };
  }
}
