import { IContext } from '@server/types';
import { MemberRole } from '@server/repositories/memberRepository';
import { requireAuth, requireOrganization } from '../utils/authGuard';

export class OrgApiKeyResolver {
  constructor() {
    this.listApiKeys = this.listApiKeys.bind(this);
    this.createApiKey = this.createApiKey.bind(this);
    this.revokeApiKey = this.revokeApiKey.bind(this);
    this.deleteApiKey = this.deleteApiKey.bind(this);
    this.updateApiKeyRateLimits = this.updateApiKeyRateLimits.bind(this);
    this.resetApiKeyTokenQuota = this.resetApiKeyTokenQuota.bind(this);
    this.apiKeyRateLimitStatus = this.apiKeyRateLimitStatus.bind(this);
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
        rateLimitRpm?: number;
        rateLimitRpd?: number;
        tokenQuotaMonthly?: number;
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
        rateLimitRpm: args.data.rateLimitRpm,
        rateLimitRpd: args.data.rateLimitRpd,
        tokenQuotaMonthly: args.data.tokenQuotaMonthly,
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

  public async updateApiKeyRateLimits(
    _root: any,
    args: {
      data: {
        keyId: number;
        rateLimitRpm?: number;
        rateLimitRpd?: number;
        tokenQuotaMonthly?: number;
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
    return ctx.orgApiKeyService.updateRateLimits(
      args.data.keyId,
      organizationId,
      {
        rateLimitRpm: args.data.rateLimitRpm,
        rateLimitRpd: args.data.rateLimitRpd,
        tokenQuotaMonthly: args.data.tokenQuotaMonthly,
      },
    );
  }

  public async resetApiKeyTokenQuota(
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
    return ctx.orgApiKeyService.resetTokenQuota(args.keyId, organizationId);
  }

  public async apiKeyRateLimitStatus(
    _root: any,
    args: { keyId: number; keyType: string },
    ctx: IContext,
  ) {
    const user = requireAuth(ctx);
    const organizationId = requireOrganization(ctx);
    await ctx.memberService.requireRole(organizationId, user.id, [
      MemberRole.OWNER,
      MemberRole.ADMIN,
    ]);
    const { rateLimitService } = await import('@/common').then(
      (m) => m.components,
    );
    return rateLimitService.getStatus({
      keyId: args.keyId,
      keyType: args.keyType as 'org' | 'project',
    });
  }
}
