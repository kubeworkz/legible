import { IContext } from '@server/types';
import { requireAuth, requireOrganization } from '@server/utils/authGuard';
import { MemberRole } from '@server/repositories/memberRepository';
import {
  AuditCategory,
  AuditAction,
  AuditResult,
} from '@server/repositories/auditLogRepository';

export class OidcResolver {
  constructor() {
    this.oidcProviders = this.oidcProviders.bind(this);
    this.linkedIdentities = this.linkedIdentities.bind(this);
    this.oidcAuthUrl = this.oidcAuthUrl.bind(this);
    this.oidcCallback = this.oidcCallback.bind(this);
    this.unlinkIdentity = this.unlinkIdentity.bind(this);
    this.oidcProvidersAdmin = this.oidcProvidersAdmin.bind(this);
    this.createOidcProvider = this.createOidcProvider.bind(this);
    this.updateOidcProvider = this.updateOidcProvider.bind(this);
    this.deleteOidcProvider = this.deleteOidcProvider.bind(this);
  }

  public async oidcProviders(_root: any, _args: any, ctx: IContext) {
    return ctx.oidcService.listProviders();
  }

  public async linkedIdentities(_root: any, _args: any, ctx: IContext) {
    const user = requireAuth(ctx);
    return ctx.oidcService.listLinkedIdentities(user.id);
  }

  public async oidcAuthUrl(
    _root: any,
    args: { providerSlug: string; callbackUrl: string },
    ctx: IContext,
  ) {
    return ctx.oidcService.getAuthorizationUrl(
      args.providerSlug,
      args.callbackUrl,
    );
  }

  public async oidcCallback(
    _root: any,
    args: {
      providerSlug: string;
      code: string;
      state: string;
      nonce: string;
      callbackUrl: string;
    },
    ctx: IContext,
  ) {
    try {
      const result = await ctx.oidcService.handleCallback(
        args.providerSlug,
        args.code,
        args.state,
        args.nonce,
        args.callbackUrl,
      );
      const { passwordHash, ...user } = result.user;

      ctx.auditLogService.log({
        userId: user.id,
        userEmail: user.email,
        clientIp: ctx.clientIp,
        category: AuditCategory.AUTH,
        action: AuditAction.OIDC_LOGIN,
        targetType: 'user',
        targetId: user.id,
        detail: { provider: args.providerSlug },
      });

      return { token: result.token, user };
    } catch (err) {
      ctx.auditLogService.log({
        clientIp: ctx.clientIp,
        category: AuditCategory.AUTH,
        action: AuditAction.OIDC_LOGIN_FAILED,
        result: AuditResult.FAILURE,
        detail: { provider: args.providerSlug },
      });
      throw err;
    }
  }

  public async unlinkIdentity(
    _root: any,
    args: { identityId: number },
    ctx: IContext,
  ) {
    const user = requireAuth(ctx);
    const result = await ctx.oidcService.unlinkIdentity(
      user.id,
      args.identityId,
    );

    ctx.auditLogService.log({
      userId: user.id,
      userEmail: user.email,
      clientIp: ctx.clientIp,
      category: AuditCategory.AUTH,
      action: AuditAction.OIDC_IDENTITY_UNLINKED,
      targetType: 'user_identity',
      targetId: args.identityId,
    });

    return result;
  }

  // ── Admin CRUD ─────────────────────────────────────────────

  private async requireOrgAdmin(ctx: IContext) {
    const user = requireAuth(ctx);
    const organizationId = requireOrganization(ctx);
    await ctx.memberService.requireRole(organizationId, user.id, [
      MemberRole.OWNER,
      MemberRole.ADMIN,
    ]);
    return { user, organizationId };
  }

  public async oidcProvidersAdmin(_root: any, _args: any, ctx: IContext) {
    await this.requireOrgAdmin(ctx);
    return ctx.oidcService.listAllProviders();
  }

  public async createOidcProvider(
    _root: any,
    args: { data: any },
    ctx: IContext,
  ) {
    const { user, organizationId } = await this.requireOrgAdmin(ctx);
    const provider = await ctx.oidcService.createProvider(args.data);

    ctx.auditLogService.log({
      userId: user.id,
      userEmail: user.email,
      clientIp: ctx.clientIp,
      organizationId,
      category: AuditCategory.AUTH,
      action: AuditAction.OIDC_PROVIDER_CREATED,
      targetType: 'oidc_provider',
      targetId: provider.id,
      detail: { slug: provider.slug },
    });

    return provider;
  }

  public async updateOidcProvider(
    _root: any,
    args: { id: number; data: any },
    ctx: IContext,
  ) {
    const { user, organizationId } = await this.requireOrgAdmin(ctx);
    const provider = await ctx.oidcService.updateProvider(args.id, args.data);

    ctx.auditLogService.log({
      userId: user.id,
      userEmail: user.email,
      clientIp: ctx.clientIp,
      organizationId,
      category: AuditCategory.AUTH,
      action: AuditAction.OIDC_PROVIDER_UPDATED,
      targetType: 'oidc_provider',
      targetId: provider.id,
      detail: { slug: provider.slug },
    });

    return provider;
  }

  public async deleteOidcProvider(
    _root: any,
    args: { id: number },
    ctx: IContext,
  ) {
    const { user, organizationId } = await this.requireOrgAdmin(ctx);
    const result = await ctx.oidcService.deleteProvider(args.id);

    ctx.auditLogService.log({
      userId: user.id,
      userEmail: user.email,
      clientIp: ctx.clientIp,
      organizationId,
      category: AuditCategory.AUTH,
      action: AuditAction.OIDC_PROVIDER_DELETED,
      targetType: 'oidc_provider',
      targetId: args.id,
    });

    return result;
  }
}
