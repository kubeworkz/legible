import { Knex } from 'knex';
import { BaseRepository, IBasicRepository } from './baseRepository';
import { camelCase, isPlainObject, mapKeys, snakeCase } from 'lodash';

export interface Gateway {
  id: number;
  organizationId: number;
  status: string; // 'starting' | 'running' | 'stopped' | 'failed'
  endpoint: string | null;
  port: number | null;
  pid: number | null;
  cpus: string;
  memory: string;
  sandboxCount: number;
  maxSandboxes: number;
  version: string | null;
  errorMessage: string | null;
  lastHealthCheck: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IGatewayRepository extends IBasicRepository<Gateway> {
  findByOrganizationId(organizationId: number): Promise<Gateway | null>;
  findRunning(): Promise<Gateway[]>;
  incrementSandboxCount(id: number): Promise<Gateway>;
  decrementSandboxCount(id: number): Promise<Gateway>;
}

export class GatewayRepository
  extends BaseRepository<Gateway>
  implements IGatewayRepository
{
  constructor(knexPg: Knex) {
    super({ knexPg, tableName: 'gateway' });
  }

  public async findByOrganizationId(
    organizationId: number,
  ): Promise<Gateway | null> {
    return this.findOneBy({ organizationId } as Partial<Gateway>);
  }

  public async findRunning(): Promise<Gateway[]> {
    return this.findAllBy({ status: 'running' } as Partial<Gateway>);
  }

  public async incrementSandboxCount(id: number): Promise<Gateway> {
    await this.knex(this.tableName)
      .where('id', id)
      .increment('sandbox_count', 1)
      .update({ updated_at: new Date().toISOString() });
    return this.findOneBy({ id } as Partial<Gateway>) as Promise<Gateway>;
  }

  public async decrementSandboxCount(id: number): Promise<Gateway> {
    await this.knex(this.tableName)
      .where('id', id)
      .where('sandbox_count', '>', 0)
      .decrement('sandbox_count', 1)
      .update({ updated_at: new Date().toISOString() });
    return this.findOneBy({ id } as Partial<Gateway>) as Promise<Gateway>;
  }

  protected override transformFromDBData = (data: any) => {
    if (!isPlainObject(data)) {
      throw new Error('Unexpected dbdata');
    }
    return mapKeys(data, (_value, key) => camelCase(key)) as Gateway;
  };

  protected override transformToDBData = (data: any) => {
    if (!isPlainObject(data)) {
      throw new Error('Unexpected dbdata');
    }
    return mapKeys(data, (_value, key) => snakeCase(key));
  };
}
