import { Knex } from 'knex';
import { BaseRepository, IBasicRepository } from './baseRepository';
import { camelCase, isPlainObject, mapKeys, mapValues, snakeCase } from 'lodash';

export interface Agent {
  id: number;
  projectId: number;
  name: string;
  sandboxName: string;
  status: string;
  providerName: string | null;
  policyYaml: string | null;
  image: string | null;
  metadata: Record<string, any> | null;
  blueprintId: number | null;
  inferenceProfile: string | null;
  gatewayId: number | null;
  autoProvisioned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AgentAuditLog {
  id: number;
  agentId: number;
  action: string;
  detail: string | null;
  createdAt: string;
}

export interface IAgentRepository extends IBasicRepository<Agent> {
  findAllByProjectId(projectId: number): Promise<Agent[]>;
  findBySandboxName(sandboxName: string): Promise<Agent | null>;
}

export interface IAgentAuditLogRepository
  extends IBasicRepository<AgentAuditLog> {
  findByAgentId(agentId: number, limit?: number): Promise<AgentAuditLog[]>;
}

export class AgentRepository
  extends BaseRepository<Agent>
  implements IAgentRepository
{
  private readonly jsonbColumns = ['metadata'];

  constructor(knexPg: Knex) {
    super({ knexPg, tableName: 'agent' });
  }

  public async findAllByProjectId(projectId: number): Promise<Agent[]> {
    return this.findAllBy({ projectId } as Partial<Agent>);
  }

  public async findBySandboxName(sandboxName: string): Promise<Agent | null> {
    return this.findOneBy({ sandboxName } as Partial<Agent>);
  }

  protected override transformFromDBData = (data: any) => {
    if (!isPlainObject(data)) {
      throw new Error('Unexpected dbdata');
    }
    const camelCaseData = mapKeys(data, (_value, key) => camelCase(key));
    const transformData = mapValues(camelCaseData, (value, key) => {
      if (this.jsonbColumns.includes(key)) {
        if (typeof value === 'string') {
          return value ? JSON.parse(value) : value;
        }
        return value;
      }
      return value;
    });
    return transformData as Agent;
  };

  protected override transformToDBData = (data: any) => {
    if (!isPlainObject(data)) {
      throw new Error('Unexpected dbdata');
    }
    const transformedData = mapValues(data, (value, key) => {
      if (this.jsonbColumns.includes(key)) {
        return JSON.stringify(value);
      }
      return value;
    });
    return mapKeys(transformedData, (_value, key) => snakeCase(key));
  };
}

export class AgentAuditLogRepository
  extends BaseRepository<AgentAuditLog>
  implements IAgentAuditLogRepository
{
  constructor(knexPg: Knex) {
    super({ knexPg, tableName: 'agent_audit_log' });
  }

  public async findByAgentId(
    agentId: number,
    limit = 50,
  ): Promise<AgentAuditLog[]> {
    return this.findAllBy({ agentId } as Partial<AgentAuditLog>, {
      order: 'id',
      limit,
    });
  }
}
