/**
 * SubscriptionRepository — CRUD for the `subscriptions` table.
 * Tracks Stripe customer, subscription, plan status per organization.
 */

import { Knex } from 'knex';

// ── Types ───────────────────────────────────────────────

export type SubscriptionPlan = 'free' | 'pro' | 'enterprise';

export type SubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'canceled'
  | 'unpaid'
  | 'incomplete'
  | 'incomplete_expired';

export interface Subscription {
  id?: number;
  organizationId: number;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripePriceId: string | null;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  paymentMethodBrand: string | null;
  paymentMethodLast4: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  canceledAt: string | null;
  trialStart: string | null;
  trialEnd: string | null;
  createdAt?: string;
  updatedAt?: string;
}

// ── Interface ───────────────────────────────────────────

export interface ISubscriptionRepository {
  findByOrganizationId(organizationId: number): Promise<Subscription | null>;
  findByStripeCustomerId(customerId: string): Promise<Subscription | null>;
  findByStripeSubscriptionId(
    subscriptionId: string,
  ): Promise<Subscription | null>;
  createOne(data: Partial<Subscription>): Promise<Subscription>;
  updateByOrganizationId(
    organizationId: number,
    data: Partial<Subscription>,
  ): Promise<Subscription | null>;
  updateByStripeSubscriptionId(
    subscriptionId: string,
    data: Partial<Subscription>,
  ): Promise<Subscription | null>;
}

// ── snake_case ↔ camelCase helpers ──────────────────────

function toSnake(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    const snakeKey = k.replace(/([A-Z])/g, '_$1').toLowerCase();
    result[snakeKey] = v;
  }
  return result;
}

function toCamel(row: Record<string, any>): Subscription {
  return {
    id: row.id,
    organizationId: row.organization_id,
    stripeCustomerId: row.stripe_customer_id,
    stripeSubscriptionId: row.stripe_subscription_id,
    stripePriceId: row.stripe_price_id,
    plan: row.plan,
    status: row.status,
    paymentMethodBrand: row.payment_method_brand,
    paymentMethodLast4: row.payment_method_last4,
    currentPeriodStart: row.current_period_start,
    currentPeriodEnd: row.current_period_end,
    canceledAt: row.canceled_at,
    trialStart: row.trial_start,
    trialEnd: row.trial_end,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ── Implementation ──────────────────────────────────────

const TABLE = 'subscriptions';

export class SubscriptionRepository implements ISubscriptionRepository {
  private readonly knex: Knex;

  constructor(knex: Knex) {
    this.knex = knex;
  }

  public async findByOrganizationId(
    organizationId: number,
  ): Promise<Subscription | null> {
    const row = await this.knex(TABLE)
      .where({ organization_id: organizationId })
      .first();
    return row ? toCamel(row) : null;
  }

  public async findByStripeCustomerId(
    customerId: string,
  ): Promise<Subscription | null> {
    const row = await this.knex(TABLE)
      .where({ stripe_customer_id: customerId })
      .first();
    return row ? toCamel(row) : null;
  }

  public async findByStripeSubscriptionId(
    subscriptionId: string,
  ): Promise<Subscription | null> {
    const row = await this.knex(TABLE)
      .where({ stripe_subscription_id: subscriptionId })
      .first();
    return row ? toCamel(row) : null;
  }

  public async createOne(data: Partial<Subscription>): Promise<Subscription> {
    const now = new Date().toISOString();
    const insertData = toSnake({ ...data, createdAt: now, updatedAt: now });
    delete insertData.id;

    const [id] = await this.knex(TABLE).insert(insertData);
    const row = await this.knex(TABLE).where({ id }).first();
    return toCamel(row);
  }

  public async updateByOrganizationId(
    organizationId: number,
    data: Partial<Subscription>,
  ): Promise<Subscription | null> {
    const updateData = toSnake({
      ...data,
      updatedAt: new Date().toISOString(),
    });
    delete updateData.id;
    delete updateData.organization_id;

    await this.knex(TABLE)
      .where({ organization_id: organizationId })
      .update(updateData);
    return this.findByOrganizationId(organizationId);
  }

  public async updateByStripeSubscriptionId(
    subscriptionId: string,
    data: Partial<Subscription>,
  ): Promise<Subscription | null> {
    const updateData = toSnake({
      ...data,
      updatedAt: new Date().toISOString(),
    });
    delete updateData.id;

    await this.knex(TABLE)
      .where({ stripe_subscription_id: subscriptionId })
      .update(updateData);
    return this.findByStripeSubscriptionId(subscriptionId);
  }
}
