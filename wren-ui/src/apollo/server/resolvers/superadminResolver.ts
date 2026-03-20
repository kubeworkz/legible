import { IContext } from '@server/types';
import { requireSuperAdmin } from '../utils/authGuard';
import {
  AuditCategory,
  AuditAction,
} from '@server/repositories/auditLogRepository';

export class SuperadminResolver {
  constructor() {
    this.adminListOrganizations = this.adminListOrganizations.bind(this);
    this.adminGetOrganization = this.adminGetOrganization.bind(this);
    this.adminListUsers = this.adminListUsers.bind(this);
    this.adminPlatformStats = this.adminPlatformStats.bind(this);
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
