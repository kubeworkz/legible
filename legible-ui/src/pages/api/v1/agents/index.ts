/**
 * GET /api/v1/agents — List deployed agents for the project.
 * Requires `agents:read` permission.
 */
import { NextApiRequest, NextApiResponse } from 'next';
import { components } from '@/common';
import {
  withApiKeyAuth,
  requireProjectAccess,
} from '@/apollo/server/utils/apiKeyAuth';
import { ApiType } from '@server/repositories/apiHistoryRepository';
import {
  ApiError,
  respondWithSimple,
  handleApiError,
  extractApiKeyAttribution,
} from '@/apollo/server/utils/apiUtils';
import { getLogger } from '@server/utils';

const logger = getLogger('API_AGENTS');

const { agentDefinitionService } = components;

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!(await requireProjectAccess(req, res))) return;

  const startTime = Date.now();
  const apiKeyAttribution = extractApiKeyAttribution(req);
  const projectId = Number(req.headers['x-project-id']);

  try {
    if (req.method !== 'GET') {
      throw new ApiError('Method not allowed', 405);
    }

    if (!projectId) {
      throw new ApiError('X-Project-Id header is required', 400);
    }

    const agents = await agentDefinitionService.listAgentDefinitions(projectId);
    const deployed = agents.filter((a) => a.status === 'deployed');

    const responsePayload = {
      agents: deployed.map((a) => ({
        id: a.id,
        name: a.name,
        description: a.description,
        model: a.model,
        version: a.currentVersion,
        deployedAt: a.deployedAt,
      })),
    };

    return respondWithSimple({
      res,
      statusCode: 200,
      responsePayload,
      projectId,
      apiType: ApiType.AGENT_LIST,
      startTime,
      apiKeyAttribution,
    });
  } catch (error) {
    return handleApiError({
      error,
      res,
      projectId,
      apiType: ApiType.AGENT_LIST,
      startTime,
      logger,
      apiKeyAttribution,
    });
  }
}

export default withApiKeyAuth(handler);
