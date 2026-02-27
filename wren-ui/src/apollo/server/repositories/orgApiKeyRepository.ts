import { Knex } from 'knex';
import { BaseRepository, IBasicRepository } from './baseRepository';

export interface OrgApiKey {
  id: number;
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

export interface IOrgApiKeyRepository extends IBasicRepository<OrgApiKey> {
  findAllByOrganization(organizationId: number): Promise<OrgApiKey[]>;
  findActiveByPrefix(keyPrefix: string): Promise<OrgApiKey | null>;
  updateLastUsed(id: number): Promise<void>;
  revoke(id: number): Promise<OrgApiKey>;
}

export class OrgApiKeyRepository
  extends BaseRepository<OrgApiKey>
  implements IOrgApiKeyRepository
{
  constructor(knexPg: Knex) {
    super({ knexPg, tableName: 'org_api_key' });
  }

  public async findAllByOrganization(
    organizationId: number,
  ): Promise<OrgApiKey[]> {
    return this.findAllBy({ organizationId } as Partial<OrgApiKey>);
  }

  public async findActiveByPrefix(
    keyPrefix: string,
  ): Promise<OrgApiKey | null> {
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

  public async revoke(id: number): Promise<OrgApiKey> {
    const [result] = await this.knex(this.tableName)
      .where({ id })
      .update({ revoked_at: new Date().toISOString() })
      .returning('*');
    return this.transformFromDBData(result);
  }
}
