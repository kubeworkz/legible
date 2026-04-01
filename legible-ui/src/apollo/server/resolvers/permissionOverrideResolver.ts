import { IContext } from '@server/types';
import { requireProjectRead, requireProjectAdmin } from '../utils/authGuard';
import { ViewerAccess } from '../repositories/projectPermissionOverrideRepository';
import {
  AuditCategory,
  AuditAction,
} from '@server/repositories/auditLogRepository';

export class PermissionOverrideResolver {
  constructor() {
    this.getProjectPermissionOverrides =
      this.getProjectPermissionOverrides.bind(this);
    this.updateProjectPermissionOverrides =
      this.updateProjectPermissionOverrides.bind(this);
  }

  /**
   * Query: projectPermissionOverrides
   * Returns the current viewer permission overrides for the active project.
   * Any project member can read these (needed by UI to gate visibility).
   */
  public async getProjectPermissionOverrides(
    _root: any,
    _args: any,
    ctx: IContext,
  ) {
    const projectId = await requireProjectRead(ctx);
    const override =
      await ctx.projectPermissionOverrideRepository.findByProject(projectId);
    if (override) {
      return {
        projectId: override.projectId,
        viewerModelingAccess: override.viewerModelingAccess,
        viewerKnowledgeAccess: override.viewerKnowledgeAccess,
      };
    }
    // Return defaults if no override row exists
    return {
      projectId,
      viewerModelingAccess: ViewerAccess.READ_ONLY,
      viewerKnowledgeAccess: ViewerAccess.READ_ONLY,
    };
  }

  /**
   * Mutation: updateProjectPermissionOverrides
   * Only project owners can change viewer permission settings.
   */
  public async updateProjectPermissionOverrides(
    _root: any,
    args: {
      data: {
        viewerModelingAccess?: ViewerAccess;
        viewerKnowledgeAccess?: ViewerAccess;
      };
    },
    ctx: IContext,
  ) {
    const projectId = await requireProjectAdmin(ctx);
    const override =
      await ctx.projectPermissionOverrideRepository.upsert(projectId, {
        viewerModelingAccess: args.data.viewerModelingAccess,
        viewerKnowledgeAccess: args.data.viewerKnowledgeAccess,
      });

    ctx.auditLogService.log({
      userId: ctx.currentUser?.id,
      userEmail: ctx.currentUser?.email,
      clientIp: ctx.clientIp,
      organizationId: ctx.organizationId,
      projectId,
      category: AuditCategory.PROJECT_PERMISSION,
      action: AuditAction.VIEWER_PERMISSION_UPDATED,
      targetType: 'project',
      targetId: projectId,
      detail: args.data,
    });

    return {
      projectId: override.projectId,
      viewerModelingAccess: override.viewerModelingAccess,
      viewerKnowledgeAccess: override.viewerKnowledgeAccess,
    };
  }
}
