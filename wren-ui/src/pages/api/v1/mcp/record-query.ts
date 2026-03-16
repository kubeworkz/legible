import { NextApiRequest, NextApiResponse } from 'next';
import { components } from '@/common';
import { getLogger } from '@server/utils';

const logger = getLogger('API_MCP_RECORD_QUERY');

const { queryMeteringService } = components;

/**
 * POST /api/v1/mcp/record-query
 *
 * Called by the MCP server after executing a query to record it for billing.
 *
 * Headers:
 *   X-Service-Token: <INTERNAL_SERVICE_TOKEN>
 *
 * Body:
 *   {
 *     "organizationId": 1,
 *     "projectId": 13,
 *     "keyId": 5,
 *     "durationMs": 123,
 *     "sqlHash": "abc123..."
 *   }
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify internal service token
  const serviceToken = req.headers['x-service-token'] as string;
  const expectedToken = process.env.INTERNAL_SERVICE_TOKEN || '';
  if (!expectedToken || serviceToken !== expectedToken) {
    return res.status(403).json({ error: 'Invalid service token' });
  }

  const { organizationId, projectId, keyId, durationMs, sqlHash } =
    req.body || {};

  if (!organizationId || !projectId) {
    return res
      .status(400)
      .json({ error: 'organizationId and projectId are required' });
  }

  try {
    const record = await queryMeteringService.recordQuery({
      organizationId,
      projectId,
      source: `mcp_api_key_${keyId || 'unknown'}`,
      durationMs: durationMs || 0,
      sqlHash: sqlHash || undefined,
    });

    return res.status(200).json({ recorded: !!record });
  } catch (err) {
    logger.error(`MCP record-query error: ${(err as Error).message}`);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
