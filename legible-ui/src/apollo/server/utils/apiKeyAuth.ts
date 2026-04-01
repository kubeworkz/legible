import { NextApiRequest, NextApiResponse } from 'next';
import { components } from '@/common';
import { getLogger } from '@server/utils';
import { IRateLimitService } from '@server/services/rateLimitService';

const logger = getLogger('API_KEY_AUTH');

/**
 * Result of API key authentication.
 * Attached to `req` as `apiKeyAuth` when an API key is used.
 */
export interface ApiKeyAuthResult {
  organizationId: number;
  projectId?: number;
  permissions: string[];
  keyId: number;
  keyType: 'org' | 'project';
}

/**
 * Extended NextApiRequest that may carry API key auth info.
 */
export interface AuthenticatedApiRequest extends NextApiRequest {
  apiKeyAuth?: ApiKeyAuthResult;
}

type NextApiHandler = (
  req: NextApiRequest,
  res: NextApiResponse,
) => Promise<void> | void;

const ORG_API_KEY_PREFIX = 'osk-';
const PROJECT_API_KEY_PREFIX = 'psk-';

/**
 * Extracts the bearer token from an Authorization header.
 */
function extractBearerToken(req: NextApiRequest): string | undefined {
  const authHeader = req.headers?.authorization || '';
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  // Fallback: check query parameter for SSE/EventSource endpoints
  // (EventSource browser API cannot set custom headers)
  const queryToken = req.query?.access_token;
  if (typeof queryToken === 'string' && queryToken) {
    return queryToken;
  }
  return undefined;
}

/**
 * Returns true if the token looks like an organization API key (starts with "osk-").
 */
function isOrgApiKey(token: string): boolean {
  return token.startsWith(ORG_API_KEY_PREFIX);
}

/**
 * Returns true if the token looks like a project API key (starts with "psk-").
 */
function isProjectApiKey(token: string): boolean {
  return token.startsWith(PROJECT_API_KEY_PREFIX);
}

/**
 * Returns true if the token looks like any API key (org or project).
 */
function isApiKey(token: string): boolean {
  return isOrgApiKey(token) || isProjectApiKey(token);
}

/**
 * Higher-order function that wraps an API route handler with API key authentication.
 *
 * Auth flow:
 *  1. If `Authorization: Bearer osk-...` → validate as org API key
 *  2. If `Authorization: Bearer <other>` → validate as user session token
 *  3. If no Authorization header → reject with 401
 *
 * On success, the request proceeds with:
 *  - For API keys: `req.apiKeyAuth` is set, `X-Organization-Id` is auto-injected
 *  - For session tokens: `req.headers.authorization` is kept as-is (handlers use it)
 *
 * Usage:
 *   export default withApiKeyAuth(handler);
 */
export function withApiKeyAuth(handler: NextApiHandler): NextApiHandler {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const token = extractBearerToken(req);

    if (!token) {
      return res.status(401).json({
        error: 'Authentication required',
        message:
          'Provide an API key or session token via Authorization: Bearer <token>',
      });
    }

    const { orgApiKeyService, authService, projectApiKeyService } = components;

    if (isApiKey(token)) {
      // ── API Key auth ──
      try {
        let result: ApiKeyAuthResult | null = null;

        if (isOrgApiKey(token)) {
          const orgResult = await orgApiKeyService.validateKey(token);
          if (orgResult) {
            result = {
              organizationId: orgResult.organizationId,
              permissions: orgResult.permissions,
              keyId: orgResult.keyId,
              keyType: 'org',
            };
          }
        } else if (isProjectApiKey(token)) {
          const projResult = await projectApiKeyService.validateKey(token);
          if (projResult) {
            result = {
              organizationId: projResult.organizationId,
              projectId: projResult.projectId,
              permissions: projResult.permissions,
              keyId: projResult.keyId,
              keyType: 'project',
            };
          }
        }

        if (!result) {
          return res.status(401).json({
            error: 'Invalid API key',
            message: 'The provided API key is invalid, expired, or revoked',
          });
        }

        // Attach auth result to request
        (req as AuthenticatedApiRequest).apiKeyAuth = result;

        // Auto-inject organization context header so downstream code can read it
        req.headers['x-organization-id'] = String(result.organizationId);

        // For project keys, also inject the project context
        if (result.projectId) {
          req.headers['x-project-id'] = String(result.projectId);
        }

        logger.debug(
          `API key auth success: keyId=${result.keyId}, type=${result.keyType}, orgId=${result.organizationId}${result.projectId ? `, projectId=${result.projectId}` : ''}`,
        );

        // ── Rate limit check ──
        const { rateLimitService } = components;
        if (rateLimitService) {
          const rateLimitResult = await rateLimitService.checkAndRecord({
            keyId: result.keyId,
            keyType: result.keyType,
          });

          if (!rateLimitResult.allowed) {
            const headers: Record<string, string> = {};
            if (rateLimitResult.limit) {
              headers['X-RateLimit-Limit'] = String(rateLimitResult.limit);
            }
            headers['X-RateLimit-Remaining'] = '0';
            if (rateLimitResult.resetAt) {
              headers['X-RateLimit-Reset'] = rateLimitResult.resetAt;
            }
            if (rateLimitResult.retryAfterMs) {
              headers['Retry-After'] = String(
                Math.ceil(rateLimitResult.retryAfterMs / 1000),
              );
            }

            Object.entries(headers).forEach(([k, v]) =>
              res.setHeader(k, v),
            );

            return res.status(429).json({
              error: 'Rate limit exceeded',
              message: rateLimitResult.reason || 'Too many requests',
              retryAfterMs: rateLimitResult.retryAfterMs,
              resetAt: rateLimitResult.resetAt,
            });
          }
        }
      } catch (err) {
        logger.error(`API key validation error: ${(err as Error).message}`);
        return res.status(500).json({
          error: 'Internal server error',
          message: 'Failed to validate API key',
        });
      }
    } else {
      // ── Session token auth ──
      try {
        const user = await authService.validateSession(token);
        if (!user) {
          return res.status(401).json({
            error: 'Invalid session',
            message: 'The provided session token is invalid or expired',
          });
        }

        logger.debug(`Session auth success: userId=${user.id}`);
      } catch (err) {
        logger.error(`Session validation error: ${(err as Error).message}`);
        return res.status(401).json({
          error: 'Invalid session',
          message: 'The provided session token is invalid or expired',
        });
      }
    }

    // Auth passed — proceed to the actual handler
    return handler(req, res);
  };
}

/**
 * Checks whether a permission is granted by the given permission set.
 * Supports wildcard (`*`) for full access.
 */
export function hasPermission(
  grantedPermissions: string[],
  requiredPermission: string,
): boolean {
  if (grantedPermissions.includes('*')) return true;
  return grantedPermissions.includes(requiredPermission);
}

/**
 * Middleware helper: require a specific permission when using an API key.
 * Returns 403 if the key lacks the required permission.
 * No-op for session-based auth (session users have full access).
 */
export function requirePermission(
  req: NextApiRequest,
  res: NextApiResponse,
  permission: string,
): boolean {
  const apiKeyAuth = (req as AuthenticatedApiRequest).apiKeyAuth;
  if (!apiKeyAuth) {
    // Session-based auth — full access
    return true;
  }

  if (!hasPermission(apiKeyAuth.permissions, permission)) {
    res.status(403).json({
      error: 'Forbidden',
      message: `API key lacks required permission: ${permission}`,
    });
    return false;
  }
  return true;
}

/**
 * Validate that a session-based user has at least READ access to the
 * project specified by the X-Project-Id header.
 *
 * For API key auth this is a no-op (project keys already scoped, org keys
 * have global access).
 *
 * Returns `true` if access is granted, `false` if a 403 was sent.
 */
export async function requireProjectAccess(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<boolean> {
  const apiKeyAuth = (req as AuthenticatedApiRequest).apiKeyAuth;
  // API key auth — skip (already validated by key type / permissions)
  if (apiKeyAuth) return true;

  // Session auth — validate project membership
  const projectIdHeader = req.headers['x-project-id'];
  const projectId = projectIdHeader ? Number(projectIdHeader) : null;
  if (!projectId) {
    // No project context — let the handler decide
    return true;
  }

  const token = extractBearerToken(req);
  if (!token) return true; // Should not happen after withApiKeyAuth

  try {
    const { authService, projectMemberService } = components;
    const user = await authService.validateSession(token);
    if (!user) {
      res.status(401).json({ error: 'Invalid session' });
      return false;
    }

    // Read organizationId from header (set by withApiKeyAuth or client)
    const orgIdHeader = req.headers['x-organization-id'];
    const organizationId = orgIdHeader ? Number(orgIdHeader) : undefined;

    const role = await projectMemberService.getEffectiveRole(
      projectId,
      user.id,
      organizationId,
    );
    if (!role) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have access to this project',
      });
      return false;
    }
    return true;
  } catch (err) {
    logger.error(`Project access check failed: ${(err as Error).message}`);
    res.status(500).json({ error: 'Internal server error' });
    return false;
  }
}
