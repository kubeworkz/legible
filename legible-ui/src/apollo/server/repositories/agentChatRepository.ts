import { Knex } from 'knex';
import { BaseRepository, IBasicRepository } from './baseRepository';
import { camelCase, isPlainObject, mapKeys, mapValues, snakeCase } from 'lodash';

// ─── Interfaces ────────────────────────────────────────────

export interface AgentChatSession {
  id: number;
  projectId: number;
  agentDefinitionId: number;
  title: string | null;
  status: string; // active | archived
  createdBy: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface AgentChatMessage {
  id: number;
  sessionId: number;
  role: string; // user | assistant | system | tool
  content: string | null;
  toolCallId: string | null;
  toolName: string | null;
  toolInput: Record<string, any> | null;
  toolOutput: Record<string, any> | null;
  reasoningSteps: ReasoningStep[] | null;
  metadata: ChatMessageMetadata | null;
  status: string; // pending | streaming | completed | error
  error: string | null;
  createdAt: string;
}

export interface ReasoningStep {
  type: 'thinking' | 'tool_call' | 'tool_result' | 'observation';
  content: string;
  toolName?: string;
  toolInput?: Record<string, any>;
  toolOutput?: Record<string, any>;
  durationMs?: number;
  timestamp?: string;
}

export interface ChatMessageMetadata {
  model?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason?: string;
  durationMs?: number;
}

// ─── Repository Interfaces ─────────────────────────────────

export interface IAgentChatSessionRepository
  extends IBasicRepository<AgentChatSession> {
  findByAgentDefinitionId(agentDefinitionId: number): Promise<AgentChatSession[]>;
  findByProjectId(projectId: number): Promise<AgentChatSession[]>;
}

export interface IAgentChatMessageRepository
  extends IBasicRepository<AgentChatMessage> {
  findBySessionId(sessionId: number): Promise<AgentChatMessage[]>;
}

// ─── JSON Fields ───────────────────────────────────────────

const SESSION_JSON_FIELDS: string[] = [];

const MESSAGE_JSON_FIELDS = [
  'toolInput',
  'toolOutput',
  'reasoningSteps',
  'metadata',
];

function sessionFromDB(data: any): any {
  if (!isPlainObject(data)) throw new Error('Unexpected dbdata');
  return mapKeys(data, (_v, k) => camelCase(k));
}

function sessionToDB(data: any): any {
  if (!isPlainObject(data)) throw new Error('Unexpected dbdata');
  return mapKeys(data, (_v, k) => snakeCase(k));
}

function messageFromDB(data: any): any {
  if (!isPlainObject(data)) throw new Error('Unexpected dbdata');
  const camelCaseData = mapKeys(data, (_v, k) => camelCase(k));
  return mapValues(camelCaseData, (value, key) => {
    if (MESSAGE_JSON_FIELDS.includes(key) && typeof value === 'string') {
      return value ? JSON.parse(value) : value;
    }
    return value;
  });
}

function messageToDB(data: any): any {
  if (!isPlainObject(data)) throw new Error('Unexpected dbdata');
  const transformed = mapValues(data, (value, key) => {
    if (MESSAGE_JSON_FIELDS.includes(key) && value != null) {
      return JSON.stringify(value);
    }
    return value;
  });
  return mapKeys(transformed, (_v, k) => snakeCase(k));
}

// ─── Repository Implementations ────────────────────────────

export class AgentChatSessionRepository
  extends BaseRepository<AgentChatSession>
  implements IAgentChatSessionRepository
{
  constructor(knexPg: Knex) {
    super({ knexPg, tableName: 'agent_chat_session' });
  }

  public async findByAgentDefinitionId(
    agentDefinitionId: number,
  ): Promise<AgentChatSession[]> {
    const rows = await this.knex
      .select('*')
      .from(this.tableName)
      .where('agent_definition_id', agentDefinitionId)
      .orderBy('updated_at', 'desc');
    return rows.map((r: any) => this.transformFromDBData(r));
  }

  public async findByProjectId(
    projectId: number,
  ): Promise<AgentChatSession[]> {
    const rows = await this.knex
      .select('*')
      .from(this.tableName)
      .where('project_id', projectId)
      .orderBy('updated_at', 'desc');
    return rows.map((r: any) => this.transformFromDBData(r));
  }

  protected override transformFromDBData = (data: any) =>
    sessionFromDB(data) as AgentChatSession;

  protected override transformToDBData = (data: any) => sessionToDB(data);
}

export class AgentChatMessageRepository
  extends BaseRepository<AgentChatMessage>
  implements IAgentChatMessageRepository
{
  constructor(knexPg: Knex) {
    super({ knexPg, tableName: 'agent_chat_message' });
  }

  public async findBySessionId(
    sessionId: number,
  ): Promise<AgentChatMessage[]> {
    const rows = await this.knex
      .select('*')
      .from(this.tableName)
      .where('session_id', sessionId)
      .orderBy('id', 'asc');
    return rows.map((r: any) => this.transformFromDBData(r));
  }

  protected override transformFromDBData = (data: any) =>
    messageFromDB(data) as AgentChatMessage;

  protected override transformToDBData = (data: any) => messageToDB(data);
}
