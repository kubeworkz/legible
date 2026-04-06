/**
 * POST /api/v1/agents/:agentId/sessions/:sessionId/messages — Send a message (runs agentic loop).
 * GET  /api/v1/agents/:agentId/sessions/:sessionId/messages — List messages.
 * DELETE /api/v1/agents/:agentId/sessions/:sessionId/messages — Delete the session.
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

const logger = getLogger('API_AGENT_MESSAGES');

const { agentChatService, agentDefinitionService } = components;

function formatMessage(msg: any) {
  return {
    id: msg.id,
    role: msg.role,
    content: msg.content,
    toolName: msg.toolName || undefined,
    toolInput: msg.toolInput || undefined,
    toolOutput: msg.toolOutput || undefined,
    reasoningSteps: msg.reasoningSteps || undefined,
    metadata: msg.metadata || undefined,
    status: msg.status,
    error: msg.error || undefined,
    createdAt: msg.createdAt,
  };
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!(await requireProjectAccess(req, res))) return;

  const startTime = Date.now();
  const apiKeyAttribution = extractApiKeyAttribution(req);
  const projectId = Number(req.headers['x-project-id']);
  const agentId = Number(req.query.agentId);
  const sessionId = Number(req.query.sessionId);

  try {
    if (!projectId) {
      throw new ApiError('X-Project-Id header is required', 400);
    }

    if (!agentId || isNaN(agentId)) {
      throw new ApiError('Invalid agent ID', 400);
    }

    if (!sessionId || isNaN(sessionId)) {
      throw new ApiError('Invalid session ID', 400);
    }

    // Verify agent exists and belongs to project
    const agent = await agentDefinitionService.getAgentDefinition(agentId);
    if (agent.projectId !== projectId) {
      throw new ApiError('Agent not found', 404);
    }
    if (agent.status !== 'deployed') {
      throw new ApiError('Agent is not deployed', 400);
    }

    // Verify session belongs to this agent
    const session = await agentChatService.getSession(sessionId);
    if (session.agentDefinitionId !== agentId) {
      throw new ApiError('Session not found for this agent', 404);
    }

    if (req.method === 'GET') {
      // ── List messages ──
      const messages = await agentChatService.getMessages(sessionId);

      return respondWithSimple({
        res,
        statusCode: 200,
        responsePayload: {
          sessionId,
          messages: messages
            .filter((m) => m.role !== 'system')
            .map(formatMessage),
        },
        projectId,
        apiType: ApiType.AGENT_CHAT,
        startTime,
        apiKeyAttribution,
      });
    }

    if (req.method === 'POST') {
      // ── Send message ──
      const { message: content } = req.body || {};

      if (!content || typeof content !== 'string' || !content.trim()) {
        throw new ApiError(
          'Request body must include a non-empty "message" string',
          400,
        );
      }

      const newMessages = await agentChatService.sendMessage(
        sessionId,
        projectId,
        { content: content.trim() },
      );

      // Find the final assistant response
      const assistantMsg = newMessages.find((m) => m.role === 'assistant');

      const responsePayload: Record<string, any> = {
        sessionId,
        messages: newMessages
          .filter((m) => m.role !== 'system')
          .map(formatMessage),
      };

      // Expose the assistant reply at top level for convenience
      if (assistantMsg) {
        responsePayload.reply = assistantMsg.content;
        responsePayload.model = assistantMsg.metadata?.model;
        responsePayload.usage = assistantMsg.metadata?.usage;
      }

      return respondWithSimple({
        res,
        statusCode: 200,
        responsePayload,
        projectId,
        apiType: ApiType.AGENT_CHAT,
        startTime,
        requestPayload: { agentId, sessionId, message: content },
        apiKeyAttribution,
      });
    }

    if (req.method === 'DELETE') {
      // ── Delete session ──
      await agentChatService.deleteSession(sessionId);

      return respondWithSimple({
        res,
        statusCode: 200,
        responsePayload: { deleted: true },
        projectId,
        apiType: ApiType.AGENT_CHAT,
        startTime,
        apiKeyAttribution,
      });
    }

    throw new ApiError('Method not allowed', 405);
  } catch (error) {
    return handleApiError({
      error,
      res,
      projectId,
      apiType: ApiType.AGENT_CHAT,
      requestPayload: { agentId, sessionId },
      startTime,
      logger,
      apiKeyAttribution,
    });
  }
}

export default withApiKeyAuth(handler);
