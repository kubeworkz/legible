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
  // Rate limiting & quota
  rateLimitRpm: number | null; // requests per minute
  rateLimitRpd: number | null; // requests per day
  tokenQuotaMonthly: number | null; // monthly token budget
  tokenQuotaUsed: number; // tokens consumed this period
  quotaResetAt: string | null; // next reset timestamp
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
  updateRateLimits(
    id: number,
    limits: {
      rateLimitRpm?: number | null;
      rateLimitRpd?: number | null;
      tokenQuotaMonthly?: number | null;
    },
  ): Promise<ProjectApiKey>;
  incrementTokenUsage(id: number, tokens: number): Promise<void>;
  resetTokenQuota(id: number): Promise<void>;
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

  public async updateRateLimits(
    id: number,
    limits: {
      rateLimitRpm?: number | null;
      rateLimitRpd?: number | null;
      tokenQuotaMonthly?: number | null;
    },
  ): Promise<ProjectApiKey> {
    const updateData: Record<string, any> = {};
    if (limits.rateLimitRpm !== undefined)
      updateData.rate_limit_rpm = limits.rateLimitRpm;
    if (limits.rateLimitRpd !== undefined)
      updateData.rate_limit_rpd = limits.rateLimitRpd;
    if (limits.tokenQuotaMonthly !== undefined)
      updateData.token_quota_monthly = limits.tokenQuotaMonthly;

    const [result] = await this.knex(this.tableName)
      .where({ id })
      .update(updateData)
      .returning('*');
    return this.transformFromDBData(result);
  }

  public async incrementTokenUsage(
    id: number,
    tokens: number,
  ): Promise<void> {
    await this.knex(this.tableName)
      .where({ id })
      .increment('token_quota_used', tokens);
  }

  public async resetTokenQuota(id: number): Promise<void> {
    const nextReset = new Date();
    nextReset.setMonth(nextReset.getMonth() + 1);
    nextReset.setDate(1);
    nextReset.setHours(0, 0, 0, 0);

    await this.knex(this.tableName)
      .where({ id })
      .update({
        token_quota_used: 0,
        quota_reset_at: nextReset.toISOString(),
      });
  }
}
