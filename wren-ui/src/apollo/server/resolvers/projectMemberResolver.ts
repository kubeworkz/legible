import { IContext } from '@server/types';
import { ProjectRole } from '@server/repositories/projectMemberRepository';
import { ViewerAccess } from '@server/repositories/projectPermissionOverrideRepository';
import {
  requireAuth,
  requireProjectRead,
  requireProjectAdmin,
} from '../utils/authGuard';

export class ProjectMemberResolver {
  constructor() {
    this.listProjectMembers = this.listProjectMembers.bind(this);
    this.addProjectMember = this.addProjectMember.bind(this);
    this.updateProjectMemberRole = this.updateProjectMemberRole.bind(this);
    this.removeProjectMember = this.removeProjectMember.bind(this);
    this.getMyProjectRole = this.getMyProjectRole.bind(this);
  }

  /**
   * Query: myProjectRole
   * Returns the current user's effective role and computed permission flags.
   */
  public async getMyProjectRole(
    _root: any,
    _args: any,
    ctx: IContext,
  ) {
    const user = requireAuth(ctx);
    const projectId = ctx.projectId!;
    const organizationId = ctx.organizationId;

    const role = await ctx.projectMemberService.getEffectiveRole(
      projectId,
      user.id,
      organizationId,
    );

    if (!role) {
      throw new Error('You do not have access to this project');
    }

    // OWNER and CONTRIBUTOR always have full access
    const isOwner = role === ProjectRole.OWNER;
    const isContributor = role === ProjectRole.CONTRIBUTOR;
    const canWrite = isOwner || isContributor;
    const canAdmin = isOwner;

    // For viewers, check permission overrides
    let canAccessModeling = true;
    let canAccessKnowledge = true;

    if (role === ProjectRole.VIEWER) {
      const overrides =
        await ctx.projectPermissionOverrideRepository.findByProject(projectId);
      if (overrides) {
        canAccessModeling =
          overrides.viewerModelingAccess !== ViewerAccess.NO_PERMISSION;
        canAccessKnowledge =
          overrides.viewerKnowledgeAccess !== ViewerAccess.NO_PERMISSION;
      }
    }

    return {
      role: role.toUpperCase(),
      canWrite,
      canAdmin,
      canAccessModeling,
      canAccessKnowledge,
    };
  }

  /**
   * List all explicit members of the current project.
   * Requires at least VIEWER access (requireProjectRead).
   */
  public async listProjectMembers(
    _root: any,
    _args: any,
    ctx: IContext,
  ) {
    await requireProjectRead(ctx);
    const projectId = ctx.projectId!;
    const members =
      await ctx.projectMemberService.listMembers(projectId);

    // Enrich each member with user info
    const enriched = await Promise.all(
      members.map(async (pm) => {
        const user = await ctx.userRepository.findOneBy({ id: pm.userId });
        return {
          id: pm.id,
          projectId: pm.projectId,
          userId: pm.userId,
          role: pm.role.toUpperCase(),
          grantedBy: pm.grantedBy,
          createdAt: pm.createdAt,
          updatedAt: pm.updatedAt,
          user: user
            ? {
                id: user.id,
                email: user.email,
                displayName: user.displayName,
                avatarUrl: user.avatarUrl,
                isActive: user.isActive,
                lastLoginAt: user.lastLoginAt,
                createdAt: user.createdAt,
              }
            : null,
        };
      }),
    );
    return enriched;
  }

  /**
   * Add a member to the current project.
   * Requires OWNER (requireProjectAdmin).
   */
  public async addProjectMember(
    _root: any,
    args: { data: { userId: number; role: string } },
    ctx: IContext,
  ) {
    const user = requireAuth(ctx);
    await requireProjectAdmin(ctx);
    const projectId = ctx.projectId!;

    const role = args.data.role.toLowerCase() as ProjectRole;
    if (!Object.values(ProjectRole).includes(role)) {
      throw new Error(`Invalid project role: ${args.data.role}`);
    }

    const pm = await ctx.projectMemberService.addMember(
      projectId,
      args.data.userId,
      role,
      user.id,
    );

    const targetUser = await ctx.userRepository.findOneBy({
      id: pm.userId,
    });
    return {
      ...pm,
      role: pm.role.toUpperCase(),
      user: targetUser
        ? {
            id: targetUser.id,
            email: targetUser.email,
            displayName: targetUser.displayName,
            avatarUrl: targetUser.avatarUrl,
            isActive: targetUser.isActive,
            lastLoginAt: targetUser.lastLoginAt,
            createdAt: targetUser.createdAt,
          }
        : null,
    };
  }

  /**
   * Update an existing project member's role.
   * Requires OWNER (requireProjectAdmin).
   */
  public async updateProjectMemberRole(
    _root: any,
    args: { data: { userId: number; role: string } },
    ctx: IContext,
  ) {
    await requireProjectAdmin(ctx);
    const projectId = ctx.projectId!;

    const role = args.data.role.toLowerCase() as ProjectRole;
    if (!Object.values(ProjectRole).includes(role)) {
      throw new Error(`Invalid project role: ${args.data.role}`);
    }

    const pm = await ctx.projectMemberService.updateRole(
      projectId,
      args.data.userId,
      role,
    );

    const targetUser = await ctx.userRepository.findOneBy({
      id: pm.userId,
    });
    return {
      ...pm,
      role: pm.role.toUpperCase(),
      user: targetUser
        ? {
            id: targetUser.id,
            email: targetUser.email,
            displayName: targetUser.displayName,
            avatarUrl: targetUser.avatarUrl,
            isActive: targetUser.isActive,
            lastLoginAt: targetUser.lastLoginAt,
            createdAt: targetUser.createdAt,
          }
        : null,
    };
  }

  /**
   * Remove a user from the current project.
   * Requires OWNER (requireProjectAdmin).
   */
  public async removeProjectMember(
    _root: any,
    args: { userId: number },
    ctx: IContext,
  ) {
    await requireProjectAdmin(ctx);
    const projectId = ctx.projectId!;
    return ctx.projectMemberService.removeMember(projectId, args.userId);
  }
}
