import { IContext } from '@server/types';
import { MemberRole } from '@server/repositories/memberRepository';
import { requireAuth } from '../utils/authGuard';

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
    return ctx.organizationService.createOrganization(args.data, user.id);
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
    );
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
    return ctx.memberService.inviteMember(args.data, user.id);
  }

  public async acceptInvitation(
    _root: any,
    args: { token: string },
    ctx: IContext,
  ) {
    const user = requireAuth(ctx);
    return ctx.memberService.acceptInvitation(args.token, user.id);
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
    return ctx.memberService.updateMemberRole(
      args.data.memberId,
      args.data.role,
    );
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
    return ctx.memberService.removeMember(args.memberId);
  }
}
