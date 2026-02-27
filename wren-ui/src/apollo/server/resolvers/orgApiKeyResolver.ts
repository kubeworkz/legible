import { IContext } from '@server/types';
import { MemberRole } from '@server/repositories/memberRepository';
import { requireAuth, requireOrganization } from '../utils/authGuard';

export class OrgApiKeyResolver {
  constructor() {
    this.listApiKeys = this.listApiKeys.bind(this);
    this.createApiKey = this.createApiKey.bind(this);
    this.revokeApiKey = this.revokeApiKey.bind(this);
    this.deleteApiKey = this.deleteApiKey.bind(this);
  }

  public async listApiKeys(_root: any, _args: any, ctx: IContext) {
    const user = requireAuth(ctx);
    const organizationId = requireOrganization(ctx);
    await ctx.memberService.requireRole(organizationId, user.id, [
      MemberRole.OWNER,
      MemberRole.ADMIN,
    ]);
    return ctx.orgApiKeyService.listKeys(organizationId);
  }

  public async createApiKey(
    _root: any,
    args: {
      data: {
        name: string;
        permissions?: string[];
        expiresAt?: string;
      };
    },
    ctx: IContext,
  ) {
    try {
      const user = requireAuth(ctx);
      const organizationId = requireOrganization(ctx);
      await ctx.memberService.requireRole(organizationId, user.id, [
        MemberRole.OWNER,
        MemberRole.ADMIN,
      ]);
      return await ctx.orgApiKeyService.createKey({
        organizationId,
        name: args.data.name,
        permissions: args.data.permissions,
        createdBy: user.id,
        expiresAt: args.data.expiresAt,
      });
    } catch (error) {
      console.error('[createApiKey] Error:', error);
      console.error('[createApiKey] args:', JSON.stringify(args));
      console.error(
        '[createApiKey] ctx.organizationId:',
        ctx.organizationId,
        'ctx.currentUser:',
        ctx.currentUser?.id,
      );
      throw error;
    }
  }

  public async revokeApiKey(
    _root: any,
    args: { keyId: number },
    ctx: IContext,
  ) {
    const user = requireAuth(ctx);
    const organizationId = requireOrganization(ctx);
    await ctx.memberService.requireRole(organizationId, user.id, [
      MemberRole.OWNER,
      MemberRole.ADMIN,
    ]);
    return ctx.orgApiKeyService.revokeKey(args.keyId, organizationId);
  }

  public async deleteApiKey(
    _root: any,
    args: { keyId: number },
    ctx: IContext,
  ) {
    const user = requireAuth(ctx);
    const organizationId = requireOrganization(ctx);
    await ctx.memberService.requireRole(organizationId, user.id, [
      MemberRole.OWNER,
      MemberRole.ADMIN,
    ]);
    return ctx.orgApiKeyService.deleteKey(args.keyId, organizationId);
  }
}
