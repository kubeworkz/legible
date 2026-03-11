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
}
