import { IContext } from '@server/types';
import { requireSuperAdmin } from '../utils/authGuard';
import {
  AuditCategory,
  AuditAction,
  AuditLogFilter,
} from '@server/repositories/auditLogRepository';

// Plan prices in cents per month (used for MRR calculations)
const PLAN_PRICE_CENTS: Record<string, number> = {
  free: 0,
  pro: 4900, // $49/mo
  enterprise: 19900, // $199/mo
};

export class SuperadminResolver {
  constructor() {
    this.adminListOrganizations = this.adminListOrganizations.bind(this);
    this.adminGetOrganization = this.adminGetOrganization.bind(this);
    this.adminListUsers = this.adminListUsers.bind(this);
    this.adminPlatformStats = this.adminPlatformStats.bind(this);
    this.adminRevenueStats = this.adminRevenueStats.bind(this);
    this.adminAuditLogs = this.adminAuditLogs.bind(this);
    this.adminSecurityOverview = this.adminSecurityOverview.bind(this);
    this.adminSetSuperadmin = this.adminSetSuperadmin.bind(this);
    this.adminRevokeSuperadmin = this.adminRevokeSuperadmin.bind(this);
  }

  // ── Queries ──────────────────────────────────────

  public async adminListOrganizations(
    _root: any,
    _args: any,
    ctx: IContext,
  ) {
    const admin = requireSuperAdmin(ctx);

    const orgs = await ctx.organizationRepository.findAll();
    const members = await ctx.memberRepository.findAll();
    const subscriptions = await ctx.subscriptionRepository.findAll();

    const subsByOrg = new Map(
      subscriptions.map((s) => [s.organizationId, s]),
    );

    const result = orgs.map((org) => {
      const orgMembers = members.filter(
        (m) => m.organizationId === org.id,
      );
      const sub = subsByOrg.get(org.id);
      return {
        ...org,
        memberCount: orgMembers.length,
        plan: sub?.plan ?? 'free',
        subscriptionStatus: sub?.status ?? null,
      };
    });

    ctx.auditLogService.log({
      userId: admin.id,
      userEmail: admin.email,
      clientIp: ctx.clientIp,
      category: AuditCategory.SUPERADMIN,
      action: AuditAction.ADMIN_LIST_ORGS,
    });

    return result;
  }

  public async adminGetOrganization(
    _root: any,
    args: { organizationId: number },
    ctx: IContext,
  ) {
    const admin = requireSuperAdmin(ctx);

    const org = await ctx.organizationRepository.findOneBy({
      id: args.organizationId,
    });
    if (!org) throw new Error('Organization not found');

    const orgMembers = await ctx.memberRepository.findAllByOrganization(
      args.organizationId,
    );
    const users = await ctx.userRepository.findAll();
    const usersById = new Map(users.map((u) => [u.id, u]));

    const enrichedMembers = orgMembers.map((m) => {
      const u = usersById.get(m.userId);
      return {
        ...m,
        role: m.role.toUpperCase(),
        user: u
          ? {
              id: u.id,
              email: u.email,
              displayName: u.displayName,
              avatarUrl: u.avatarUrl,
              isActive: u.isActive,
            }
          : null,
      };
    });

    const sub = await ctx.subscriptionRepository.findByOrganizationId(
      args.organizationId,
    );

    const projects = await ctx.projectRepository.listProjects(
      args.organizationId,
    );

    ctx.auditLogService.log({
      userId: admin.id,
      userEmail: admin.email,
      clientIp: ctx.clientIp,
      category: AuditCategory.SUPERADMIN,
      action: AuditAction.ADMIN_VIEW_ORG,
      targetType: 'organization',
      targetId: args.organizationId,
    });

    return {
      ...org,
      members: enrichedMembers,
      memberCount: enrichedMembers.length,
      plan: sub?.plan ?? 'free',
      subscriptionStatus: sub?.status ?? null,
      projectCount: projects.length,
    };
  }

  public async adminListUsers(_root: any, _args: any, ctx: IContext) {
    const admin = requireSuperAdmin(ctx);

    const users = await ctx.userRepository.findAll();
    const members = await ctx.memberRepository.findAll();
    const orgs = await ctx.organizationRepository.findAll();
    const orgsById = new Map(orgs.map((o) => [o.id, o]));

    const result = users.map((u) => {
      const userMemberships = members
        .filter((m) => m.userId === u.id)
        .map((m) => ({
          organizationId: m.organizationId,
          organizationName:
            orgsById.get(m.organizationId)?.displayName ?? null,
          role: m.role,
        }));

      return {
        id: u.id,
        email: u.email,
        displayName: u.displayName,
        avatarUrl: u.avatarUrl,
        isActive: u.isActive,
        isSuperadmin: u.isSuperadmin,
        emailVerified: u.emailVerified,
        lastLoginAt: u.lastLoginAt,
        createdAt: u.createdAt,
        organizations: userMemberships,
      };
    });

    ctx.auditLogService.log({
      userId: admin.id,
      userEmail: admin.email,
      clientIp: ctx.clientIp,
      category: AuditCategory.SUPERADMIN,
      action: AuditAction.ADMIN_LIST_USERS,
    });

    return result;
  }

  public async adminPlatformStats(_root: any, _args: any, ctx: IContext) {
    const admin = requireSuperAdmin(ctx);

    const users = await ctx.userRepository.findAll();
    const orgs = await ctx.organizationRepository.findAll();
    const subscriptions = await ctx.subscriptionRepository.findAll();

    const planCounts: Record<string, number> = {};
    for (const sub of subscriptions) {
      planCounts[sub.plan] = (planCounts[sub.plan] || 0) + 1;
    }

    return {
      totalUsers: users.length,
      activeUsers: users.filter((u) => u.isActive).length,
      totalOrganizations: orgs.length,
      subscriptionsByPlan: Object.entries(planCounts).map(
        ([plan, count]) => ({ plan, count }),
      ),
    };
  }

  public async adminRevenueStats(_root: any, _args: any, ctx: IContext) {
    const admin = requireSuperAdmin(ctx);

    const subscriptions = await ctx.subscriptionRepository.findAll();
    const orgs = await ctx.organizationRepository.findAll();
    const orgsById = new Map(orgs.map((o) => [o.id, o]));

    // Active paid subscriptions
    const activePaid = subscriptions.filter(
      (s) => s.status === 'active' && s.plan !== 'free',
    );

    // MRR = sum of monthly price for all active paid subs
    const mrrCents = activePaid.reduce(
      (sum, s) => sum + (PLAN_PRICE_CENTS[s.plan] || 0),
      0,
    );
    const mrr = mrrCents / 100;
    const arr = mrr * 12;

    // ARPU = MRR / total active paid orgs (avoid div by zero)
    const arpu = activePaid.length > 0 ? mrr / activePaid.length : 0;

    // Churn: subscriptions canceled in the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentlyCanceled = subscriptions.filter(
      (s) =>
        s.status === 'canceled' &&
        s.canceledAt &&
        new Date(s.canceledAt) >= thirtyDaysAgo,
    );
    // Churn rate = canceled in last 30d / (active paid + recently canceled)
    const churnBase = activePaid.length + recentlyCanceled.length;
    const churnRate =
      churnBase > 0 ? (recentlyCanceled.length / churnBase) * 100 : 0;

    // Plan breakdown
    const planBreakdown: Record<
      string,
      { plan: string; count: number; mrr: number }
    > = {};
    for (const sub of subscriptions) {
      if (!planBreakdown[sub.plan]) {
        planBreakdown[sub.plan] = { plan: sub.plan, count: 0, mrr: 0 };
      }
      planBreakdown[sub.plan].count += 1;
      if (sub.status === 'active') {
        planBreakdown[sub.plan].mrr +=
          (PLAN_PRICE_CENTS[sub.plan] || 0) / 100;
      }
    }

    // Per-org revenue
    const orgRevenue = subscriptions.map((s) => {
      const org = orgsById.get(s.organizationId);
      return {
        organizationId: s.organizationId,
        organizationName: org?.displayName ?? 'Unknown',
        plan: s.plan,
        status: s.status,
        mrr: s.status === 'active' ? (PLAN_PRICE_CENTS[s.plan] || 0) / 100 : 0,
        currentPeriodStart: s.currentPeriodStart,
        currentPeriodEnd: s.currentPeriodEnd,
        canceledAt: s.canceledAt,
      };
    });

    ctx.auditLogService.log({
      userId: admin.id,
      userEmail: admin.email,
      clientIp: ctx.clientIp,
      category: AuditCategory.SUPERADMIN,
      action: AuditAction.ADMIN_VIEW_REVENUE,
    });

    return {
      mrr,
      arr,
      arpu: Math.round(arpu * 100) / 100,
      churnRate: Math.round(churnRate * 100) / 100,
      totalPaidOrgs: activePaid.length,
      totalFreeOrgs: subscriptions.filter(
        (s) => s.plan === 'free' && s.status === 'active',
      ).length,
      totalCanceledOrgs: subscriptions.filter(
        (s) => s.status === 'canceled',
      ).length,
      planBreakdown: Object.values(planBreakdown),
      orgRevenue,
    };
  }

  public async adminAuditLogs(
    _root: any,
    args: {
      filter?: {
        category?: string;
        action?: string;
        userId?: number;
        organizationId?: number;
        result?: string;
        startTime?: string;
        endTime?: string;
      };
      pagination: { limit: number; offset: number };
    },
    ctx: IContext,
  ) {
    const admin = requireSuperAdmin(ctx);

    const filter: AuditLogFilter = {};
    if (args.filter) {
      if (args.filter.category) filter.category = args.filter.category as any;
      if (args.filter.action) filter.action = args.filter.action as any;
      if (args.filter.userId) filter.userId = args.filter.userId;
      if (args.filter.organizationId)
        filter.organizationId = args.filter.organizationId;
      if (args.filter.result) filter.result = args.filter.result as any;
      if (args.filter.startTime) filter.startTime = args.filter.startTime;
      if (args.filter.endTime) filter.endTime = args.filter.endTime;
    }
    // NOTE: no org-scoping — superadmin sees ALL audit logs

    const pagination = {
      limit: Math.min(args.pagination.limit, 500),
      offset: args.pagination.offset ?? 0,
    };

    ctx.auditLogService.log({
      userId: admin.id,
      userEmail: admin.email,
      clientIp: ctx.clientIp,
      category: AuditCategory.SUPERADMIN,
      action: AuditAction.ADMIN_VIEW_AUDIT,
    });

    return ctx.auditLogService.query(filter, pagination);
  }

  public async adminSecurityOverview(
    _root: any,
    _args: any,
    ctx: IContext,
  ) {
    const admin = requireSuperAdmin(ctx);

    // Failed logins in last 24h
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    const recentFailedLogins = await ctx.auditLogService.query(
      {
        action: AuditAction.LOGIN_FAILED,
        startTime: oneDayAgo.toISOString(),
      },
      { limit: 1, offset: 0 },
    );

    // Failed OIDC logins in last 24h
    const recentFailedOidc = await ctx.auditLogService.query(
      {
        action: AuditAction.OIDC_LOGIN_FAILED,
        startTime: oneDayAgo.toISOString(),
      },
      { limit: 1, offset: 0 },
    );

    // Superadmin actions in last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const superadminActions = await ctx.auditLogService.query(
      {
        category: AuditCategory.SUPERADMIN,
        startTime: sevenDaysAgo.toISOString(),
      },
      { limit: 1, offset: 0 },
    );

    // Total audit events in last 24h
    const recentAllEvents = await ctx.auditLogService.query(
      { startTime: oneDayAgo.toISOString() },
      { limit: 1, offset: 0 },
    );

    // OIDC provider count
    const oidcProviders = await ctx.oidcProviderRepository.findAll();
    const enabledOidc = oidcProviders.filter((p: any) => p.enabled || p.is_enabled);
    const ssoEnforced = oidcProviders.filter(
      (p: any) => p.ssoEnforced || p.sso_enforced,
    );

    // Active sessions
    const sessions = await ctx.sessionRepository.findAll();
    const now = new Date();
    const activeSessions = sessions.filter(
      (s: any) => s.expiresAt && new Date(s.expiresAt) > now,
    );

    // Superadmin users count
    const users = await ctx.userRepository.findAll();
    const superadmins = users.filter((u) => u.isSuperadmin);

    // Recent security events (last 10 notable events)
    const securityEvents = await ctx.auditLogService.query(
      {
        startTime: sevenDaysAgo.toISOString(),
      },
      { limit: 10, offset: 0 },
    );

    ctx.auditLogService.log({
      userId: admin.id,
      userEmail: admin.email,
      clientIp: ctx.clientIp,
      category: AuditCategory.SUPERADMIN,
      action: AuditAction.ADMIN_VIEW_SECURITY,
    });

    return {
      failedLogins24h: recentFailedLogins.total,
      failedOidcLogins24h: recentFailedOidc.total,
      superadminActions7d: superadminActions.total,
      totalEvents24h: recentAllEvents.total,
      oidcProviderCount: oidcProviders.length,
      oidcEnabledCount: enabledOidc.length,
      ssoEnforcedCount: ssoEnforced.length,
      activeSessions: activeSessions.length,
      totalSessions: sessions.length,
      superadminCount: superadmins.length,
      totalUsers: users.length,
      recentSecurityEvents: securityEvents.data,
    };
  }

  // ── Mutations ────────────────────────────────────

  public async adminSetSuperadmin(
    _root: any,
    args: { userId: number },
    ctx: IContext,
  ) {
    const admin = requireSuperAdmin(ctx);

    const target = await ctx.userRepository.findOneBy({ id: args.userId });
    if (!target) throw new Error('User not found');

    await ctx.userRepository.updateOne(args.userId, {
      isSuperadmin: true,
    } as any);

    ctx.auditLogService.log({
      userId: admin.id,
      userEmail: admin.email,
      clientIp: ctx.clientIp,
      category: AuditCategory.SUPERADMIN,
      action: AuditAction.ADMIN_GRANT_SUPERADMIN,
      targetType: 'user',
      targetId: args.userId,
      detail: { targetEmail: target.email },
    });

    return true;
  }

  public async adminRevokeSuperadmin(
    _root: any,
    args: { userId: number },
    ctx: IContext,
  ) {
    const admin = requireSuperAdmin(ctx);

    if (args.userId === admin.id) {
      throw new Error('Cannot revoke your own superadmin access');
    }

    const target = await ctx.userRepository.findOneBy({ id: args.userId });
    if (!target) throw new Error('User not found');

    await ctx.userRepository.updateOne(args.userId, {
      isSuperadmin: false,
    } as any);

    ctx.auditLogService.log({
      userId: admin.id,
      userEmail: admin.email,
      clientIp: ctx.clientIp,
      category: AuditCategory.SUPERADMIN,
      action: AuditAction.ADMIN_REVOKE_SUPERADMIN,
      targetType: 'user',
      targetId: args.userId,
      detail: { targetEmail: target.email },
    });

    return true;
  }
}
