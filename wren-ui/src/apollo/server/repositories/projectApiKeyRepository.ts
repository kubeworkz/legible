import { Knex } from 'knex';
import { BaseRepository, IBasicRepository } from './baseRepository';

export interface ProjectApiKey {
  id: number;
  projectId: number;
  organizationId: number;
  name: string;
  keyPrefix: string;
  keyHash: string;
  permissions: string | null; // JSON string of permission scopes
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdBy: number;
  revokedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IProjectApiKeyRepository
  extends IBasicRepository<ProjectApiKey> {
  findAllByProject(projectId: number): Promise<ProjectApiKey[]>;
  findAllByOrganization(organizationId: number): Promise<ProjectApiKey[]>;
  findActiveByPrefix(keyPrefix: string): Promise<ProjectApiKey | null>;
  updateLastUsed(id: number): Promise<void>;
  revoke(id: number): Promise<ProjectApiKey>;
}

export class ProjectApiKeyRepository
  extends BaseRepository<ProjectApiKey>
  implements IProjectApiKeyRepository
{
  constructor(knexPg: Knex) {
    super({ knexPg, tableName: 'project_api_key' });
  }

  public async findAllByProject(
    projectId: number,
  ): Promise<ProjectApiKey[]> {
    return this.findAllBy({ projectId } as Partial<ProjectApiKey>);
  }

  public async findAllByOrganization(
    organizationId: number,
  ): Promise<ProjectApiKey[]> {
    return this.findAllBy({ organizationId } as Partial<ProjectApiKey>);
  }

  public async findActiveByPrefix(
    keyPrefix: string,
  ): Promise<ProjectApiKey | null> {
    const executer = this.knex;
    const results = await executer(this.tableName)
      .where(this.transformToDBData({ keyPrefix }))
      .whereNull('revoked_at')
      .limit(1);
    return results && results.length > 0
      ? this.transformFromDBData(results[0])
      : null;
  }

  public async updateLastUsed(id: number): Promise<void> {
    await this.knex(this.tableName)
      .where({ id })
      .update({ last_used_at: new Date().toISOString() });
  }

  public async revoke(id: number): Promise<ProjectApiKey> {
    const [result] = await this.knex(this.tableName)
      .where({ id })
      .update({ revoked_at: new Date().toISOString() })
      .returning('*');
    return this.transformFromDBData(result);
  }
}
