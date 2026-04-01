import { IContext } from '@server/types';
import { MemberRole } from '@server/repositories/memberRepository';
import { requireAuth } from '../utils/authGuard';
import {
  AuditCategory,
  AuditAction,
} from '@server/repositories/auditLogRepository';

export class OrganizationResolver {
  constructor() {
    this.listOrganizations = this.listOrganizations.bind(this);
    this.getOrganization = this.getOrganization.bind(this);
    this.getOrganizationMembers = this.getOrganizationMembers.bind(this);
    this.createOrganization = this.createOrganization.bind(this);
    this.updateOrganization = this.updateOrganization.bind(this);
    this.deleteOrganization = this.deleteOrganization.bind(this);
    this.inviteMember = this.inviteMember.bind(this);
    this.acceptInvitation = this.acceptInvitation.bind(this);
    this.updateMemberRole = this.updateMemberRole.bind(this);
    this.removeMember = this.removeMember.bind(this);
  }

  public async listOrganizations(_root: any, _args: any, ctx: IContext) {
    const user = requireAuth(ctx);
    return ctx.organizationService.listUserOrganizations(user.id);
  }

  public async getOrganization(
    _root: any,
    args: { organizationId: number },
    ctx: IContext,
  ) {
    const user = requireAuth(ctx);
    // Verify membership
    await ctx.memberService.requireRole(args.organizationId, user.id, [
      MemberRole.OWNER,
      MemberRole.ADMIN,
      MemberRole.MEMBER,
    ]);
    return ctx.organizationService.getOrganization(args.organizationId);
  }

  public async getOrganizationMembers(
    _root: any,
    args: { organizationId: number },
    ctx: IContext,
  ) {
    const user = requireAuth(ctx);
    await ctx.memberService.requireRole(args.organizationId, user.id, [
      MemberRole.OWNER,
      MemberRole.ADMIN,
      MemberRole.MEMBER,
    ]);
    return ctx.organizationService.getMembers(args.organizationId);
  }

  public async createOrganization(
    _root: any,
    args: {
      data: { displayName: string; slug: string; logoUrl?: string };
    },
    ctx: IContext,
  ) {
    const user = requireAuth(ctx);
    const org = await ctx.organizationService.createOrganization(args.data, user.id);

    ctx.auditLogService.log({
      userId: user.id,
      userEmail: user.email,
      clientIp: ctx.clientIp,
      organizationId: org.id,
      category: AuditCategory.ORG,
      action: AuditAction.ORG_CREATED,
      targetType: 'organization',
      targetId: org.id,
      detail: { displayName: args.data.displayName },
    });

    return org;
  }

  public async updateOrganization(
    _root: any,
    args: {
      organizationId: number;
      data: { displayName?: string; slug?: string; logoUrl?: string };
    },
    ctx: IContext,
  ) {
    const user = requireAuth(ctx);
    await ctx.memberService.requireRole(args.organizationId, user.id, [
      MemberRole.OWNER,
      MemberRole.ADMIN,
    ]);
    return ctx.organizationService.updateOrganization(
      args.organizationId,
      args.data,
    ).then((org) => {
      ctx.auditLogService.log({
        userId: user.id,
        userEmail: user.email,
        clientIp: ctx.clientIp,
        organizationId: args.organizationId,
        category: AuditCategory.ORG,
        action: AuditAction.ORG_UPDATED,
        targetType: 'organization',
        targetId: args.organizationId,
        detail: args.data,
      });
      return org;
    });
  }

  public async deleteOrganization(
    _root: any,
    args: { organizationId: number },
    ctx: IContext,
  ) {
    const user = requireAuth(ctx);
    await ctx.memberService.requireRole(args.organizationId, user.id, [
      MemberRole.OWNER,
    ]);

    ctx.auditLogService.log({
      userId: user.id,
      userEmail: user.email,
      clientIp: ctx.clientIp,
      organizationId: args.organizationId,
      category: AuditCategory.ORG,
      action: AuditAction.ORG_DELETED,
      targetType: 'organization',
      targetId: args.organizationId,
    });

    return ctx.organizationService.deleteOrganization(args.organizationId);
  }

  public async inviteMember(
    _root: any,
    args: {
      data: { organizationId: number; email: string; role?: MemberRole };
    },
    ctx: IContext,
  ) {
    const user = requireAuth(ctx);
    await ctx.memberService.requireRole(args.data.organizationId, user.id, [
      MemberRole.OWNER,
      MemberRole.ADMIN,
    ]);
    const invitation = await ctx.memberService.inviteMember(args.data, user.id);

    ctx.auditLogService.log({
      userId: user.id,
      userEmail: user.email,
      clientIp: ctx.clientIp,
      organizationId: args.data.organizationId,
      category: AuditCategory.ORG_MEMBER,
      action: AuditAction.MEMBER_INVITED,
      targetType: 'invitation',
      targetId: invitation.id,
      detail: { email: args.data.email, role: args.data.role },
    });

    return invitation;
  }

  public async acceptInvitation(
    _root: any,
    args: { token: string },
    ctx: IContext,
  ) {
    const user = requireAuth(ctx);
    const member = await ctx.memberService.acceptInvitation(args.token, user.id);

    ctx.auditLogService.log({
      userId: user.id,
      userEmail: user.email,
      clientIp: ctx.clientIp,
      organizationId: member.organizationId,
      category: AuditCategory.ORG_MEMBER,
      action: AuditAction.INVITATION_ACCEPTED,
      targetType: 'member',
      targetId: member.id,
    });

    return member;
  }

  public async updateMemberRole(
    _root: any,
    args: { data: { memberId: number; role: MemberRole } },
    ctx: IContext,
  ) {
    const user = requireAuth(ctx);
    // Get the member to find the org
    const member = await ctx.memberRepository.findOneBy({
      id: args.data.memberId,
    });
    if (!member) throw new Error('Member not found');

    await ctx.memberService.requireRole(member.organizationId, user.id, [
      MemberRole.OWNER,
      MemberRole.ADMIN,
    ]);
    const updated = await ctx.memberService.updateMemberRole(
      args.data.memberId,
      args.data.role,
    );

    ctx.auditLogService.log({
      userId: user.id,
      userEmail: user.email,
      clientIp: ctx.clientIp,
      organizationId: member.organizationId,
      category: AuditCategory.ORG_MEMBER,
      action: AuditAction.MEMBER_ROLE_CHANGED,
      targetType: 'member',
      targetId: args.data.memberId,
      detail: { newRole: args.data.role },
    });

    return updated;
  }

  public async removeMember(
    _root: any,
    args: { memberId: number },
    ctx: IContext,
  ) {
    const user = requireAuth(ctx);
    const member = await ctx.memberRepository.findOneBy({
      id: args.memberId,
    });
    if (!member) throw new Error('Member not found');

    await ctx.memberService.requireRole(member.organizationId, user.id, [
      MemberRole.OWNER,
      MemberRole.ADMIN,
    ]);

    // Cascade: remove the user's project_member rows for all projects
    const projectMemberships =
      await ctx.projectMemberRepository.findAllByUser(member.userId);
    for (const pm of projectMemberships) {
      await ctx.projectMemberRepository.removeByProjectAndUser(
        pm.projectId,
        member.userId,
      );
    }

    ctx.auditLogService.log({
      userId: user.id,
      userEmail: user.email,
      clientIp: ctx.clientIp,
      organizationId: member.organizationId,
      category: AuditCategory.ORG_MEMBER,
      action: AuditAction.MEMBER_REMOVED,
      targetType: 'member',
      targetId: args.memberId,
      detail: { removedUserId: member.userId },
    });

    return ctx.memberService.removeMember(args.memberId);
  }
}
