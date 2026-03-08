import { IContext } from '@server/types';
import { User } from '@server/repositories/userRepository';
import { ProjectRole } from '@server/repositories/projectMemberRepository';

/**
 * Shared authentication guard. Throws if ctx.currentUser is not authenticated.
 * Returns the authenticated user for convenience.
 */
export function requireAuth(ctx: IContext): User {
  if (!ctx.currentUser) {
    throw new Error('Authentication required');
  }
  return ctx.currentUser;
}

/**
 * Ensures ctx has a valid organizationId. Throws otherwise.
 * Returns the organizationId for convenience.
 */
export function requireOrganization(ctx: IContext): number {
  if (!ctx.organizationId) {
    throw new Error('Organization context required');
  }
  return ctx.organizationId;
}

/**
 * Ensures ctx has both a valid user and organizationId.
 * Returns { user, organizationId }.
 */
export function requireAuthAndOrg(ctx: IContext): {
  user: User;
  organizationId: number;
} {
  const user = requireAuth(ctx);
  const organizationId = requireOrganization(ctx);
  return { user, organizationId };
}

/**
 * Ensures ctx has a valid projectId and verifies the project belongs
 * to the current organization. Returns the verified projectId.
 */
export async function requireProjectAccess(ctx: IContext): Promise<number> {
  requireAuth(ctx);
  const organizationId = requireOrganization(ctx);

  if (!ctx.projectId) {
    throw new Error('Project context required');
  }

  // Verify the project belongs to the current organization
  const project = await ctx.projectRepository.getProjectById(ctx.projectId);
  if (
    (project as any).organizationId &&
    (project as any).organizationId !== organizationId
  ) {
    throw new Error('Access denied: project does not belong to your organization');
  }

  return ctx.projectId;
}

/** Role sets for convenience */
const READ_ROLES = [ProjectRole.OWNER, ProjectRole.CONTRIBUTOR, ProjectRole.VIEWER];
const WRITE_ROLES = [ProjectRole.OWNER, ProjectRole.CONTRIBUTOR];
const ADMIN_ROLES = [ProjectRole.OWNER];

/**
 * Ensures the user has at least VIEWER access to the current project.
 * Org OWNER/ADMIN get implicit OWNER access (handled by ProjectMemberService).
 * Returns the verified projectId.
 */
export async function requireProjectRead(ctx: IContext): Promise<number> {
  const user = requireAuth(ctx);
  if (!ctx.projectId) {
    throw new Error('Project context required');
  }
  await ctx.projectMemberService.requireProjectRole(
    ctx.projectId,
    user.id,
    READ_ROLES,
    ctx.organizationId,
  );
  return ctx.projectId;
}

/**
 * Ensures the user has at least CONTRIBUTOR access to the current project.
 * Returns the verified projectId.
 */
export async function requireProjectWrite(ctx: IContext): Promise<number> {
  const user = requireAuth(ctx);
  if (!ctx.projectId) {
    throw new Error('Project context required');
  }
  await ctx.projectMemberService.requireProjectRole(
    ctx.projectId,
    user.id,
    WRITE_ROLES,
    ctx.organizationId,
  );
  return ctx.projectId;
}

/**
 * Ensures the user has OWNER access to the current project.
 * Returns the verified projectId.
 */
export async function requireProjectAdmin(ctx: IContext): Promise<number> {
  const user = requireAuth(ctx);
  if (!ctx.projectId) {
    throw new Error('Project context required');
  }
  await ctx.projectMemberService.requireProjectRole(
    ctx.projectId,
    user.id,
    ADMIN_ROLES,
    ctx.organizationId,
  );
  return ctx.projectId;
}

/** Operations that don't require authentication */
export const PUBLIC_OPERATIONS = new Set([
  'signup',
  'login',
  'me',
  'acceptInvitation',
  'IntrospectionQuery',
  // Used by AI service internally without authentication
  'previewSql',
]);
