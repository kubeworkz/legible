import { NextApiRequest, NextApiResponse } from 'next';
import { components } from '@/common';
import { getLogger } from '@server/utils';

const logger = getLogger('API_KEY_AUTH');

/**
 * Result of API key authentication.
 * Attached to `req` as `apiKeyAuth` when an API key is used.
 */
export interface ApiKeyAuthResult {
  organizationId: number;
  permissions: string[];
  keyId: number;
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

const API_KEY_PREFIX = 'osk-';

/**
 * Extracts the bearer token from an Authorization header.
 */
function extractBearerToken(req: NextApiRequest): string | undefined {
  const authHeader = req.headers?.authorization || '';
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  return undefined;
}

/**
 * Returns true if the token looks like an organization API key (starts with "osk-").
 */
function isApiKey(token: string): boolean {
  return token.startsWith(API_KEY_PREFIX);
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

    const { orgApiKeyService, authService } = components;

    if (isApiKey(token)) {
      // ── API Key auth ──
      try {
        const result = await orgApiKeyService.validateKey(token);
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

        logger.debug(
          `API key auth success: keyId=${result.keyId}, orgId=${result.organizationId}`,
        );
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
