/**
 * POST /api/v1/agents/:agentId/sessions — Create a new chat session.
 * Requires the agent to be deployed.
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

const logger = getLogger('API_AGENT_SESSIONS');

const { agentChatService, agentDefinitionService } = components;

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!(await requireProjectAccess(req, res))) return;

  const startTime = Date.now();
  const apiKeyAttribution = extractApiKeyAttribution(req);
  const projectId = Number(req.headers['x-project-id']);
  const agentId = Number(req.query.agentId);

  try {
    if (req.method !== 'POST') {
      throw new ApiError('Method not allowed', 405);
    }

    if (!projectId) {
      throw new ApiError('X-Project-Id header is required', 400);
    }

    if (!agentId || isNaN(agentId)) {
      throw new ApiError('Invalid agent ID', 400);
    }

    // Verify agent exists and is deployed
    const agent = await agentDefinitionService.getAgentDefinition(agentId);
    if (agent.projectId !== projectId) {
      throw new ApiError('Agent not found', 404);
    }
    if (agent.status !== 'deployed') {
      throw new ApiError(
        'Agent is not deployed. Deploy the agent first.',
        400,
      );
    }

    const session = await agentChatService.createSession(projectId, agentId);

    const responsePayload = {
      sessionId: session.id,
      agentId: session.agentDefinitionId,
      title: session.title,
      status: session.status,
      createdAt: session.createdAt,
    };

    return respondWithSimple({
      res,
      statusCode: 201,
      responsePayload,
      projectId,
      apiType: ApiType.AGENT_CHAT,
      startTime,
      requestPayload: { agentId },
      apiKeyAttribution,
    });
  } catch (error) {
    return handleApiError({
      error,
      res,
      projectId,
      apiType: ApiType.AGENT_CHAT,
      requestPayload: { agentId },
      startTime,
      logger,
      apiKeyAttribution,
    });
  }
}

export default withApiKeyAuth(handler);
