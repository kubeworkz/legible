import { Knex } from 'knex';
import { BaseRepository, IBasicRepository } from './baseRepository';
import { camelCase, isPlainObject, mapKeys, mapValues, snakeCase } from 'lodash';

export interface ToolDefinition {
  id: number;
  projectId: number;
  name: string;
  description: string | null;
  source: string; // 'mcp', 'custom_api', 'builtin'
  mcpServerName: string | null;
  method: string | null;
  endpoint: string | null;
  inputSchema: Record<string, any> | null;
  outputSchema: Record<string, any> | null;
  headers: Record<string, string> | null;
  authConfig: Record<string, any> | null;
  enabled: boolean;
  tags: string[] | null;
  lastSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IToolDefinitionRepository
  extends IBasicRepository<ToolDefinition> {
  findByProjectId(projectId: number): Promise<ToolDefinition[]>;
  findBySource(projectId: number, source: string): Promise<ToolDefinition[]>;
  findByName(projectId: number, name: string): Promise<ToolDefinition | null>;
}

const JSON_FIELDS = ['inputSchema', 'outputSchema', 'headers', 'authConfig', 'tags'];

export class ToolDefinitionRepository
  extends BaseRepository<ToolDefinition>
  implements IToolDefinitionRepository
{
  constructor(knexPg: Knex) {
    super({ knexPg, tableName: 'tool_definition' });
  }

  public async findByProjectId(projectId: number): Promise<ToolDefinition[]> {
    return this.findAllBy({ projectId } as Partial<ToolDefinition>);
  }

  public async findBySource(
    projectId: number,
    source: string,
  ): Promise<ToolDefinition[]> {
    return this.findAllBy({ projectId, source } as Partial<ToolDefinition>);
  }

  public async findByName(
    projectId: number,
    name: string,
  ): Promise<ToolDefinition | null> {
    return this.findOneBy({ projectId, name } as Partial<ToolDefinition>);
  }

  protected override transformFromDBData = (data: any) => {
    if (!isPlainObject(data)) throw new Error('Unexpected dbdata');
    const camelCaseData = mapKeys(data, (_v, k) => camelCase(k));
    return mapValues(camelCaseData, (value, key) => {
      if (JSON_FIELDS.includes(key) && typeof value === 'string') {
        return value ? JSON.parse(value) : value;
      }
      return value;
    }) as ToolDefinition;
  };

  protected override transformToDBData = (data: any) => {
    if (!isPlainObject(data)) throw new Error('Unexpected dbdata');
    const transformed = mapValues(data, (value, key) => {
      if (JSON_FIELDS.includes(key) && value != null) {
        return JSON.stringify(value);
      }
      return value;
    });
    return mapKeys(transformed, (_v, k) => snakeCase(k));
  };
}
