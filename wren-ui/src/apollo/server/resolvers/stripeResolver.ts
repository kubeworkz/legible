/**
 * StripeResolver — GraphQL resolvers for subscription management,
 * Stripe Checkout, and billing portal.
 */

import { IContext } from '@server/types';
import { MemberRole } from '@server/repositories/memberRepository';
import { requireAuth, requireOrganization } from '../utils/authGuard';

export class StripeResolver {
  constructor() {
    this.subscription = this.subscription.bind(this);
    this.stripeEnabled = this.stripeEnabled.bind(this);
    this.createCheckoutSession = this.createCheckoutSession.bind(this);
    this.createPortalSession = this.createPortalSession.bind(this);
    this.cancelSubscription = this.cancelSubscription.bind(this);
    this.resumeSubscription = this.resumeSubscription.bind(this);
    this.adminSubscriptions = this.adminSubscriptions.bind(this);
    this.adminUpdateSubscription = this.adminUpdateSubscription.bind(this);
  }

  // ── Queries ───────────────────────────────────────────

  public async subscription(_root: any, _args: any, ctx: IContext) {
    const user = requireAuth(ctx);
    const organizationId = requireOrganization(ctx);
    await ctx.memberService.requireRole(organizationId, user.id, [
      MemberRole.OWNER,
      MemberRole.ADMIN,
    ]);
    return ctx.stripeService.getSubscription(organizationId);
  }

  public async stripeEnabled(_root: any, _args: any, ctx: IContext) {
    return ctx.stripeService.isEnabled();
  }

  // ── Mutations ─────────────────────────────────────────

  public async createCheckoutSession(
    _root: any,
    args: { data: { successUrl: string; cancelUrl: string } },
    ctx: IContext,
  ) {
    const user = requireAuth(ctx);
    const organizationId = requireOrganization(ctx);
    await ctx.memberService.requireRole(organizationId, user.id, [
      MemberRole.OWNER,
      MemberRole.ADMIN,
    ]);

    const org = await ctx.organizationService.getOrganization(organizationId);
    return ctx.stripeService.createCheckoutSession(
      organizationId,
      org?.displayName || `Org ${organizationId}`,
      user.email,
      args.data.successUrl,
      args.data.cancelUrl,
    );
  }

  public async createPortalSession(_root: any, _args: any, ctx: IContext) {
    const user = requireAuth(ctx);
    const organizationId = requireOrganization(ctx);
    await ctx.memberService.requireRole(organizationId, user.id, [
      MemberRole.OWNER,
      MemberRole.ADMIN,
    ]);
    return ctx.stripeService.createPortalSession(organizationId);
  }

  public async cancelSubscription(_root: any, _args: any, ctx: IContext) {
    const user = requireAuth(ctx);
    const organizationId = requireOrganization(ctx);
    await ctx.memberService.requireRole(organizationId, user.id, [
      MemberRole.OWNER,
    ]);
    return ctx.stripeService.cancelSubscription(organizationId);
  }

  public async resumeSubscription(_root: any, _args: any, ctx: IContext) {
    const user = requireAuth(ctx);
    const organizationId = requireOrganization(ctx);
    await ctx.memberService.requireRole(organizationId, user.id, [
      MemberRole.OWNER,
    ]);
    return ctx.stripeService.resumeSubscription(organizationId);
  }

  // ── Admin ─────────────────────────────────────────────

  public async adminSubscriptions(_root: any, _args: any, ctx: IContext) {
    const user = requireAuth(ctx);
    const organizationId = requireOrganization(ctx);
    await ctx.memberService.requireRole(organizationId, user.id, [
      MemberRole.OWNER,
    ]);

    const subs = await ctx.subscriptionRepository.findAll();

    // Enrich with organization names
    const result = await Promise.all(
      subs.map(async (sub) => {
        let orgName: string | null = null;
        try {
          const org = await ctx.organizationRepository.findOneBy({
            id: sub.organizationId,
          });
          orgName = org?.displayName || null;
        } catch {
          // org may have been deleted
        }
        return {
          id: sub.id,
          organizationId: sub.organizationId,
          organizationName: orgName,
          plan: sub.plan,
          status: sub.status,
          stripeCustomerId: sub.stripeCustomerId,
          stripeSubscriptionId: sub.stripeSubscriptionId,
          currentPeriodStart: sub.currentPeriodStart,
          currentPeriodEnd: sub.currentPeriodEnd,
          canceledAt: sub.canceledAt,
          trialStart: sub.trialStart,
          trialEnd: sub.trialEnd,
          paymentMethodBrand: sub.paymentMethodBrand,
          paymentMethodLast4: sub.paymentMethodLast4,
          createdAt: sub.createdAt,
          updatedAt: sub.updatedAt,
        };
      }),
    );
    return result;
  }

  public async adminUpdateSubscription(
    _root: any,
    args: { id: number; data: { plan: string; status: string } },
    ctx: IContext,
  ) {
    const user = requireAuth(ctx);
    const organizationId = requireOrganization(ctx);
    await ctx.memberService.requireRole(organizationId, user.id, [
      MemberRole.OWNER,
    ]);

    const updated = await ctx.subscriptionRepository.updateById(args.id, {
      plan: args.data.plan as any,
      status: args.data.status as any,
    });
    if (!updated) {
      throw new Error(`Subscription ${args.id} not found`);
    }

    let orgName: string | null = null;
    try {
      const org = await ctx.organizationRepository.findOneBy({
        id: updated.organizationId,
      });
      orgName = org?.displayName || null;
    } catch {
      // ignore
    }

    return {
      id: updated.id,
      organizationId: updated.organizationId,
      organizationName: orgName,
      plan: updated.plan,
      status: updated.status,
      stripeCustomerId: updated.stripeCustomerId,
      stripeSubscriptionId: updated.stripeSubscriptionId,
      currentPeriodStart: updated.currentPeriodStart,
      currentPeriodEnd: updated.currentPeriodEnd,
      canceledAt: updated.canceledAt,
      trialStart: updated.trialStart,
      trialEnd: updated.trialEnd,
      paymentMethodBrand: updated.paymentMethodBrand,
      paymentMethodLast4: updated.paymentMethodLast4,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }
}
