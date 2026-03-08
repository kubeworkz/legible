/**
 * BillingResolver — GraphQL resolvers for billing config,
 * monthly billing summaries, and recomputation triggers.
 */

import { IContext } from '@server/types';
import { MemberRole } from '@server/repositories/memberRepository';
import { requireAuth, requireOrganization } from '../utils/authGuard';

export class BillingResolver {
  constructor() {
    this.billingConfig = this.billingConfig.bind(this);
    this.billingOverview = this.billingOverview.bind(this);
    this.monthlyBilling = this.monthlyBilling.bind(this);
    this.apiMonthlyUsage = this.apiMonthlyUsage.bind(this);
    this.updateBillingConfig = this.updateBillingConfig.bind(this);
    this.recomputeMonthlyBilling = this.recomputeMonthlyBilling.bind(this);
  }

  // ── Queries ───────────────────────────────────────────

  public async billingConfig(_root: any, _args: any, ctx: IContext) {
    const user = requireAuth(ctx);
    const organizationId = requireOrganization(ctx);
    await ctx.memberService.requireRole(organizationId, user.id, [
      MemberRole.OWNER,
      MemberRole.ADMIN,
    ]);
    return ctx.billingService.getBillingConfig(organizationId);
  }

  public async billingOverview(_root: any, _args: any, ctx: IContext) {
    const user = requireAuth(ctx);
    const organizationId = requireOrganization(ctx);
    await ctx.memberService.requireRole(organizationId, user.id, [
      MemberRole.OWNER,
      MemberRole.ADMIN,
    ]);
    return ctx.billingService.getBillingOverview(organizationId);
  }

  public async monthlyBilling(
    _root: any,
    args: { year: number; month: number },
    ctx: IContext,
  ) {
    const user = requireAuth(ctx);
    const organizationId = requireOrganization(ctx);
    await ctx.memberService.requireRole(organizationId, user.id, [
      MemberRole.OWNER,
      MemberRole.ADMIN,
    ]);
    return ctx.billingService.getMonthlyBilling(
      organizationId,
      args.year,
      args.month,
    );
  }

  public async apiMonthlyUsage(
    _root: any,
    args: { filter?: any },
    ctx: IContext,
  ) {
    const user = requireAuth(ctx);
    const organizationId = requireOrganization(ctx);
    await ctx.memberService.requireRole(organizationId, user.id, [
      MemberRole.OWNER,
      MemberRole.ADMIN,
    ]);
    const filter = {
      organizationId,
      ...(args.filter?.startDate && {
        startDate: new Date(args.filter.startDate),
      }),
      ...(args.filter?.endDate && { endDate: new Date(args.filter.endDate) }),
    };
    return ctx.apiHistoryRepository.getMonthlyUsage(filter);
  }

  // ── Mutations ─────────────────────────────────────────

  public async updateBillingConfig(
    _root: any,
    args: {
      data: {
        costPer1kInputTokens?: number;
        costPer1kOutputTokens?: number;
        currency?: string;
        monthlySpendAlert?: number | null;
        billingPeriodAnchorDay?: number;
      };
    },
    ctx: IContext,
  ) {
    const user = requireAuth(ctx);
    const organizationId = requireOrganization(ctx);
    await ctx.memberService.requireRole(organizationId, user.id, [
      MemberRole.OWNER,
      MemberRole.ADMIN,
    ]);
    return ctx.billingService.updateBillingConfig(organizationId, args.data);
  }

  public async recomputeMonthlyBilling(
    _root: any,
    args: { year: number; month: number },
    ctx: IContext,
  ) {
    const user = requireAuth(ctx);
    const organizationId = requireOrganization(ctx);
    await ctx.memberService.requireRole(organizationId, user.id, [
      MemberRole.OWNER,
      MemberRole.ADMIN,
    ]);
    return ctx.billingService.recomputeMonth(
      organizationId,
      args.year,
      args.month,
    );
  }
}
