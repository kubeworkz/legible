import { IContext } from '@server/types';
import { User } from '@server/repositories/userRepository';

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

/** Operations that don't require authentication */
export const PUBLIC_OPERATIONS = new Set([
  'signup',
  'login',
  'me',
  'acceptInvitation',
  'IntrospectionQuery',
]);
