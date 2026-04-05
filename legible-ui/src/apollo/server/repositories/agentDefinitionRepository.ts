import { Knex } from 'knex';
import { BaseRepository, IBasicRepository } from './baseRepository';
import { camelCase, isPlainObject, mapKeys, mapValues, snakeCase } from 'lodash';

// ─── Interfaces ────────────────────────────────────────────

export interface AgentDefinition {
  id: number;
  projectId: number;
  name: string;
  description: string | null;
  workflowId: number | null;
  systemPrompt: string | null;
  toolIds: number[] | null;
  memoryConfig: Record<string, any> | null;
  model: string | null;
  temperature: number | null;
  maxTokens: number | null;
  status: string; // draft | published | deployed | archived
  currentVersion: number;
  deployConfig: Record<string, any> | null;
  deployedAt: string | null;
  tags: string[] | null;
  icon: string | null;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface AgentDefinitionVersion {
  id: number;
  agentDefinitionId: number;
  version: number;
  workflowId: number | null;
  systemPrompt: string | null;
  toolIds: number[] | null;
  memoryConfig: Record<string, any> | null;
  model: string | null;
  temperature: number | null;
  maxTokens: number | null;
  deployConfig: Record<string, any> | null;
  changeNote: string | null;
  createdBy: number | null;
  createdAt: string;
}

// ─── Repository Interfaces ─────────────────────────────────

export interface IAgentDefinitionRepository
  extends IBasicRepository<AgentDefinition> {
  findByProjectId(projectId: number): Promise<AgentDefinition[]>;
  findByName(projectId: number, name: string): Promise<AgentDefinition | null>;
}

export interface IAgentDefinitionVersionRepository
  extends IBasicRepository<AgentDefinitionVersion> {
  findByAgentDefinitionId(
    agentDefinitionId: number,
  ): Promise<AgentDefinitionVersion[]>;
}

// ─── JSON Fields ───────────────────────────────────────────

const JSON_FIELDS = ['toolIds', 'memoryConfig', 'deployConfig', 'tags'];

function transformFromDB(data: any): any {
  if (!isPlainObject(data)) throw new Error('Unexpected dbdata');
  const camelCaseData = mapKeys(data, (_v, k) => camelCase(k));
  return mapValues(camelCaseData, (value, key) => {
    if (JSON_FIELDS.includes(key) && typeof value === 'string') {
      return value ? JSON.parse(value) : value;
    }
    return value;
  });
}

function transformToDB(data: any): any {
  if (!isPlainObject(data)) throw new Error('Unexpected dbdata');
  const transformed = mapValues(data, (value, key) => {
    if (JSON_FIELDS.includes(key) && value != null) {
      return JSON.stringify(value);
    }
    return value;
  });
  return mapKeys(transformed, (_v, k) => snakeCase(k));
}

// ─── Repository Implementations ────────────────────────────

export class AgentDefinitionRepository
  extends BaseRepository<AgentDefinition>
  implements IAgentDefinitionRepository
{
  constructor(knexPg: Knex) {
    super({ knexPg, tableName: 'agent_definition' });
  }

  public async findByProjectId(
    projectId: number,
  ): Promise<AgentDefinition[]> {
    return this.findAllBy({ projectId } as Partial<AgentDefinition>);
  }

  public async findByName(
    projectId: number,
    name: string,
  ): Promise<AgentDefinition | null> {
    return this.findOneBy({ projectId, name } as Partial<AgentDefinition>);
  }

  protected override transformFromDBData = (data: any) =>
    transformFromDB(data) as AgentDefinition;

  protected override transformToDBData = (data: any) => transformToDB(data);
}

export class AgentDefinitionVersionRepository
  extends BaseRepository<AgentDefinitionVersion>
  implements IAgentDefinitionVersionRepository
{
  constructor(knexPg: Knex) {
    super({ knexPg, tableName: 'agent_definition_version' });
  }

  public async findByAgentDefinitionId(
    agentDefinitionId: number,
  ): Promise<AgentDefinitionVersion[]> {
    const rows = await this.knex
      .select('*')
      .from(this.tableName)
      .where('agent_definition_id', agentDefinitionId)
      .orderBy('version', 'desc');
    return rows.map((r: any) => this.transformFromDBData(r));
  }

  protected override transformFromDBData = (data: any) =>
    transformFromDB(data) as AgentDefinitionVersion;

  protected override transformToDBData = (data: any) => transformToDB(data);
}
