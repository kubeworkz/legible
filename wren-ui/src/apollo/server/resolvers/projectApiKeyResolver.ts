import { IContext } from '@server/types';
import { MemberRole } from '@server/repositories/memberRepository';
import { requireAuth, requireOrganization } from '../utils/authGuard';
import {
  AuditCategory,
  AuditAction,
} from '@server/repositories/auditLogRepository';

export class ProjectApiKeyResolver {
  constructor() {
    this.listProjectApiKeys = this.listProjectApiKeys.bind(this);
    this.createProjectApiKey = this.createProjectApiKey.bind(this);
    this.revokeProjectApiKey = this.revokeProjectApiKey.bind(this);
    this.deleteProjectApiKey = this.deleteProjectApiKey.bind(this);
    this.updateProjectApiKeyRateLimits =
      this.updateProjectApiKeyRateLimits.bind(this);
    this.resetProjectApiKeyTokenQuota =
      this.resetProjectApiKeyTokenQuota.bind(this);
  }

  public async listProjectApiKeys(
    _root: any,
    args: { projectId: number },
    ctx: IContext,
  ) {
    const user = requireAuth(ctx);
    const organizationId = requireOrganization(ctx);
    await ctx.memberService.requireRole(organizationId, user.id, [
      MemberRole.OWNER,
      MemberRole.ADMIN,
    ]);

    // Verify the project belongs to the organization
    const project = await ctx.projectRepository.getProjectById(args.projectId);
    if (
      (project as any).organizationId &&
      (project as any).organizationId !== organizationId
    ) {
      throw new Error(
        'Access denied: project does not belong to your organization',
      );
    }

    return ctx.projectApiKeyService.listKeys(args.projectId);
  }

  public async createProjectApiKey(
    _root: any,
    args: {
      data: {
        projectId: number;
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

      // Verify the project belongs to the organization
      const project = await ctx.projectRepository.getProjectById(
        args.data.projectId,
      );
      if (
        (project as any).organizationId &&
        (project as any).organizationId !== organizationId
      ) {
        throw new Error(
          'Access denied: project does not belong to your organization',
        );
      }

      return await ctx.projectApiKeyService.createKey({
        projectId: args.data.projectId,
        organizationId,
        name: args.data.name,
        permissions: args.data.permissions,
        createdBy: user.id,
        expiresAt: args.data.expiresAt,
        rateLimitRpm: args.data.rateLimitRpm,
        rateLimitRpd: args.data.rateLimitRpd,
        tokenQuotaMonthly: args.data.tokenQuotaMonthly,
      }).then((result) => {
        ctx.auditLogService.log({
          userId: user.id,
          userEmail: user.email,
          clientIp: ctx.clientIp,
          organizationId,
          projectId: args.data.projectId,
          category: AuditCategory.API_KEY,
          action: AuditAction.PROJECT_KEY_CREATED,
          targetType: 'project_api_key',
          targetId: result.key?.id,
          detail: { name: args.data.name, projectId: args.data.projectId },
        });
        return result;
      });
    } catch (error) {
      console.error('[createProjectApiKey] Error:', error);
      throw error;
    }
  }

  public async revokeProjectApiKey(
    _root: any,
    args: { keyId: number; projectId: number },
    ctx: IContext,
  ) {
    const user = requireAuth(ctx);
    const organizationId = requireOrganization(ctx);
    await ctx.memberService.requireRole(organizationId, user.id, [
      MemberRole.OWNER,
      MemberRole.ADMIN,
    ]);

    // Verify the project belongs to the organization
    const project = await ctx.projectRepository.getProjectById(args.projectId);
    if (
      (project as any).organizationId &&
      (project as any).organizationId !== organizationId
    ) {
      throw new Error(
        'Access denied: project does not belong to your organization',
      );
    }

    return ctx.projectApiKeyService.revokeKey(args.keyId, args.projectId).then(
      (result) => {
        ctx.auditLogService.log({
          userId: user.id,
          userEmail: user.email,
          clientIp: ctx.clientIp,
          organizationId,
          projectId: args.projectId,
          category: AuditCategory.API_KEY,
          action: AuditAction.PROJECT_KEY_REVOKED,
          targetType: 'project_api_key',
          targetId: args.keyId,
        });
        return result;
      },
    );
  }

  public async deleteProjectApiKey(
    _root: any,
    args: { keyId: number; projectId: number },
    ctx: IContext,
  ) {
    const user = requireAuth(ctx);
    const organizationId = requireOrganization(ctx);
    await ctx.memberService.requireRole(organizationId, user.id, [
      MemberRole.OWNER,
      MemberRole.ADMIN,
    ]);

    // Verify the project belongs to the organization
    const project = await ctx.projectRepository.getProjectById(args.projectId);
    if (
      (project as any).organizationId &&
      (project as any).organizationId !== organizationId
    ) {
      throw new Error(
        'Access denied: project does not belong to your organization',
      );
    }

    return ctx.projectApiKeyService.deleteKey(args.keyId, args.projectId).then(
      (result) => {
        ctx.auditLogService.log({
          userId: user.id,
          userEmail: user.email,
          clientIp: ctx.clientIp,
          organizationId,
          projectId: args.projectId,
          category: AuditCategory.API_KEY,
          action: AuditAction.PROJECT_KEY_DELETED,
          targetType: 'project_api_key',
          targetId: args.keyId,
        });
        return result;
      },
    );
  }

  public async updateProjectApiKeyRateLimits(
    _root: any,
    args: {
      data: {
        keyId: number;
        projectId: number;
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

    const project = await ctx.projectRepository.getProjectById(
      args.data.projectId,
    );
    if (
      (project as any).organizationId &&
      (project as any).organizationId !== organizationId
    ) {
      throw new Error(
        'Access denied: project does not belong to your organization',
      );
    }

    return ctx.projectApiKeyService.updateRateLimits(
      args.data.keyId,
      args.data.projectId,
      {
        rateLimitRpm: args.data.rateLimitRpm,
        rateLimitRpd: args.data.rateLimitRpd,
        tokenQuotaMonthly: args.data.tokenQuotaMonthly,
      },
    );
  }

  public async resetProjectApiKeyTokenQuota(
    _root: any,
    args: { keyId: number; projectId: number },
    ctx: IContext,
  ) {
    const user = requireAuth(ctx);
    const organizationId = requireOrganization(ctx);
    await ctx.memberService.requireRole(organizationId, user.id, [
      MemberRole.OWNER,
      MemberRole.ADMIN,
    ]);

    const project = await ctx.projectRepository.getProjectById(args.projectId);
    if (
      (project as any).organizationId &&
      (project as any).organizationId !== organizationId
    ) {
      throw new Error(
        'Access denied: project does not belong to your organization',
      );
    }

    return ctx.projectApiKeyService.resetTokenQuota(
      args.keyId,
      args.projectId,
    );
  }
}
