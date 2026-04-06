import { getLogger } from '@server/utils';
import {
  IAgentChatSessionRepository,
  IAgentChatMessageRepository,
  AgentChatSession,
  AgentChatMessage,
  ReasoningStep,
  ChatMessageMetadata,
} from '@server/repositories/agentChatRepository';
import {
  IAgentDefinitionRepository,
  AgentDefinition,
} from '@server/repositories/agentDefinitionRepository';
import {
  ILLMService,
  ChatMessage,
} from '@server/services/llmService';
import {
  IToolDefinitionRepository,
  ToolDefinition,
} from '@server/repositories/toolDefinitionRepository';
import { IToolExecutionService } from '@server/services/toolExecutionService';

const logger = getLogger('AgentChatService');

const MAX_TOOL_ROUNDS = 10; // prevent infinite tool-calling loops

// ─── Interfaces ────────────────────────────────────────────

export interface SendMessageInput {
  content: string;
}

export interface IAgentChatService {
  createSession(
    projectId: number,
    agentDefinitionId: number,
    userId?: number,
  ): Promise<AgentChatSession>;

  listSessions(agentDefinitionId: number): Promise<AgentChatSession[]>;
  listProjectSessions(projectId: number): Promise<AgentChatSession[]>;
  getSession(sessionId: number): Promise<AgentChatSession>;
  deleteSession(sessionId: number): Promise<void>;

  getMessages(sessionId: number): Promise<AgentChatMessage[]>;

  sendMessage(
    sessionId: number,
    projectId: number,
    input: SendMessageInput,
    userId?: number,
  ): Promise<AgentChatMessage[]>;
}

// ─── Service Implementation ────────────────────────────────

export class AgentChatService implements IAgentChatService {
  private readonly sessionRepo: IAgentChatSessionRepository;
  private readonly messageRepo: IAgentChatMessageRepository;
  private readonly agentDefRepo: IAgentDefinitionRepository;
  private readonly toolDefRepo: IToolDefinitionRepository;
  private readonly llmService: ILLMService;
  private readonly toolExecutionService: IToolExecutionService;

  constructor(opts: {
    agentChatSessionRepository: IAgentChatSessionRepository;
    agentChatMessageRepository: IAgentChatMessageRepository;
    agentDefinitionRepository: IAgentDefinitionRepository;
    toolDefinitionRepository: IToolDefinitionRepository;
    llmService: ILLMService;
    toolExecutionService: IToolExecutionService;
  }) {
    this.sessionRepo = opts.agentChatSessionRepository;
    this.messageRepo = opts.agentChatMessageRepository;
    this.agentDefRepo = opts.agentDefinitionRepository;
    this.toolDefRepo = opts.toolDefinitionRepository;
    this.llmService = opts.llmService;
    this.toolExecutionService = opts.toolExecutionService;
  }

  // ─── Session Management ─────────────────────────────────

  public async createSession(
    projectId: number,
    agentDefinitionId: number,
    userId?: number,
  ): Promise<AgentChatSession> {
    const agentDef = await this.agentDefRepo.findOneBy({ id: agentDefinitionId });
    if (!agentDef) throw new Error(`Agent definition ${agentDefinitionId} not found`);

    const now = new Date().toISOString();
    const session = await this.sessionRepo.createOne({
      projectId,
      agentDefinitionId,
      title: `Chat with ${agentDef.name}`,
      status: 'active',
      createdBy: userId ?? null,
      createdAt: now,
      updatedAt: now,
    } as any);

    // If the agent has a system prompt, add it as the first message
    if (agentDef.systemPrompt) {
      await this.messageRepo.createOne({
        sessionId: session.id,
        role: 'system',
        content: agentDef.systemPrompt,
        status: 'completed',
        createdAt: now,
      } as any);
    }

    return session;
  }

  public async listSessions(
    agentDefinitionId: number,
  ): Promise<AgentChatSession[]> {
    return this.sessionRepo.findByAgentDefinitionId(agentDefinitionId);
  }

  public async listProjectSessions(
    projectId: number,
  ): Promise<AgentChatSession[]> {
    return this.sessionRepo.findByProjectId(projectId);
  }

  public async getSession(sessionId: number): Promise<AgentChatSession> {
    const session = await this.sessionRepo.findOneBy({ id: sessionId });
    if (!session) throw new Error(`Chat session ${sessionId} not found`);
    return session;
  }

  public async deleteSession(sessionId: number): Promise<void> {
    await this.sessionRepo.deleteOne(sessionId);
  }

  // ─── Messages ───────────────────────────────────────────

  public async getMessages(
    sessionId: number,
  ): Promise<AgentChatMessage[]> {
    return this.messageRepo.findBySessionId(sessionId);
  }

  // ─── Send Message (Core Chat Loop) ──────────────────────

  public async sendMessage(
    sessionId: number,
    projectId: number,
    input: SendMessageInput,
    userId?: number,
  ): Promise<AgentChatMessage[]> {
    const session = await this.getSession(sessionId);
    const agentDef = await this.agentDefRepo.findOneBy({
      id: session.agentDefinitionId,
    });
    if (!agentDef) throw new Error('Agent definition not found');

    // 1. Store the user message
    const userMsg = await this.messageRepo.createOne({
      sessionId,
      role: 'user',
      content: input.content,
      status: 'completed',
      createdAt: new Date().toISOString(),
    } as any);

    // 2. Load available tools for this agent
    const tools = await this.loadAgentTools(agentDef);
    const toolSchemas = tools.map((t) => ({
      type: 'function' as const,
      function: {
        name: t.name,
        description: t.description || '',
        parameters: t.inputSchema || { type: 'object', properties: {} },
      },
    }));

    // 3. Build message history for LLM
    const allMessages = await this.messageRepo.findBySessionId(sessionId);
    const llmMessages = this.buildLLMMessages(allMessages);

    // 4. Agentic loop: call LLM → if tool_calls → execute → call LLM again
    const newMessages: AgentChatMessage[] = [userMsg];
    let currentMessages = llmMessages;
    let rounds = 0;

    while (rounds < MAX_TOOL_ROUNDS) {
      rounds++;
      const startTime = Date.now();

      try {
        const llmResponse = await this.llmService.chatCompletion(
          projectId,
          currentMessages,
          {
            model: agentDef.model || undefined,
            temperature: agentDef.temperature || undefined,
            maxTokens: agentDef.maxTokens || undefined,
          },
          toolSchemas.length > 0 ? toolSchemas : undefined,
        );

        const durationMs = Date.now() - startTime;
        const metadata: ChatMessageMetadata = {
          model: llmResponse.model,
          usage: llmResponse.usage,
          finishReason: llmResponse.finishReason,
          durationMs,
        };

        // Check if the LLM wants to call tools
        if (
          llmResponse.toolCalls &&
          llmResponse.toolCalls.length > 0
        ) {
          // Process each tool call
          const reasoningSteps: ReasoningStep[] = [];

          if (llmResponse.content) {
            reasoningSteps.push({
              type: 'thinking',
              content: llmResponse.content,
              timestamp: new Date().toISOString(),
            });
          }

          // Store assistant message with tool_calls intent
          const assistantMsg = await this.messageRepo.createOne({
            sessionId,
            role: 'assistant',
            content: llmResponse.content || null,
            reasoningSteps:
              reasoningSteps.length > 0 ? reasoningSteps : null,
            metadata,
            status: 'completed',
            createdAt: new Date().toISOString(),
          } as any);
          newMessages.push(assistantMsg);

          // Execute each tool call and store results
          for (const toolCall of llmResponse.toolCalls) {
            const toolStartTime = Date.now();
            const toolDef = tools.find(
              (t) => t.name === toolCall.function.name,
            );

            let toolOutput: any = null;
            let toolError: string | null = null;

            if (!toolDef) {
              toolError = `Tool "${toolCall.function.name}" not found`;
              toolOutput = { error: toolError };
            } else {
              try {
                const result =
                  await this.toolExecutionService.executeTool(
                    projectId,
                    toolDef.id,
                    toolCall.function.arguments,
                  );
                toolOutput = result;
              } catch (err: any) {
                toolError = err.message;
                toolOutput = { error: err.message };
              }
            }

            const toolDurationMs = Date.now() - toolStartTime;

            // Store tool message
            const toolMsg = await this.messageRepo.createOne({
              sessionId,
              role: 'tool',
              content: JSON.stringify(toolOutput),
              toolCallId: toolCall.id,
              toolName: toolCall.function.name,
              toolInput: toolCall.function.arguments,
              toolOutput,
              reasoningSteps: [
                {
                  type: toolError ? 'observation' : 'tool_result',
                  content: toolError
                    ? `Tool error: ${toolError}`
                    : `Tool "${toolCall.function.name}" completed`,
                  toolName: toolCall.function.name,
                  toolInput: toolCall.function.arguments,
                  toolOutput,
                  durationMs: toolDurationMs,
                  timestamp: new Date().toISOString(),
                },
              ],
              status: toolError ? 'error' : 'completed',
              error: toolError,
              createdAt: new Date().toISOString(),
            } as any);
            newMessages.push(toolMsg);
          }

          // Rebuild message history with tool results and loop
          const updatedMessages =
            await this.messageRepo.findBySessionId(sessionId);
          currentMessages = this.buildLLMMessages(updatedMessages);
          continue; // Next round of the agentic loop
        }

        // No tool calls — final assistant response
        const finalMsg = await this.messageRepo.createOne({
          sessionId,
          role: 'assistant',
          content: llmResponse.content,
          metadata,
          status: 'completed',
          createdAt: new Date().toISOString(),
        } as any);
        newMessages.push(finalMsg);
        break; // Done
      } catch (err: any) {
        logger.error(`Chat error in session ${sessionId}: ${err.message}`);
        const errorMsg = await this.messageRepo.createOne({
          sessionId,
          role: 'assistant',
          content: null,
          status: 'error',
          error: err.message,
          createdAt: new Date().toISOString(),
        } as any);
        newMessages.push(errorMsg);
        break;
      }
    }

    // Update session timestamp & auto-title from first user message
    const updates: any = { updatedAt: new Date().toISOString() };
    if (session.title?.startsWith('Chat with ') && input.content.length > 0) {
      updates.title =
        input.content.length > 80
          ? input.content.substring(0, 77) + '...'
          : input.content;
    }
    await this.sessionRepo.updateOne(sessionId, updates);

    return newMessages;
  }

  // ─── Helpers ────────────────────────────────────────────

  private async loadAgentTools(
    agentDef: AgentDefinition,
  ): Promise<ToolDefinition[]> {
    if (!agentDef.toolIds || agentDef.toolIds.length === 0) return [];
    const all: ToolDefinition[] = [];
    for (const id of agentDef.toolIds) {
      const tool = await this.toolDefRepo.findOneBy({ id });
      if (tool && tool.enabled) all.push(tool);
    }
    return all;
  }

  private buildLLMMessages(
    messages: AgentChatMessage[],
  ): ChatMessage[] {
    return messages
      .filter((m) => m.status !== 'error')
      .map((m) => {
        if (m.role === 'tool') {
          // Tool results sent as user messages with tool context
          return {
            role: 'user' as const,
            content: `[Tool Result: ${m.toolName}]\n${m.content || ''}`,
          };
        }
        return {
          role: m.role as 'system' | 'user' | 'assistant',
          content: m.content || '',
        };
      });
  }
}
