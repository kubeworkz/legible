import { Knex } from 'knex';
import { camelCase, isPlainObject, mapKeys, snakeCase } from 'lodash';
import { BaseRepository, IBasicRepository } from './baseRepository';

// ── BillingConfig ──────────────────────────────────────

export interface BillingConfig {
  id?: number;
  organizationId: number;
  costPer1kInputTokens: number;
  costPer1kOutputTokens: number;
  currency: string;
  monthlySpendAlert: number | null;
  billingPeriodAnchorDay: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface IBillingConfigRepository
  extends IBasicRepository<BillingConfig> {
  findByOrgId(organizationId: number): Promise<BillingConfig | null>;
  upsert(data: Partial<BillingConfig>): Promise<BillingConfig>;
}

export class BillingConfigRepository
  extends BaseRepository<BillingConfig>
  implements IBillingConfigRepository
{
  constructor(knexPg: Knex) {
    super({ knexPg, tableName: 'billing_config' });
  }

  public async findByOrgId(
    organizationId: number,
  ): Promise<BillingConfig | null> {
    const row = await this.knex(this.tableName)
      .where('organization_id', organizationId)
      .first();
    return row ? this.transformFromDBData(row) : null;
  }

  public async upsert(data: Partial<BillingConfig>): Promise<BillingConfig> {
    const dbData = this.transformToDBData({
      ...data,
      updatedAt: new Date().toISOString(),
    });

    // Try update first, then insert if not found
    const existing = await this.knex(this.tableName)
      .where('organization_id', data.organizationId)
      .first();

    if (existing) {
      await this.knex(this.tableName)
        .where('id', existing.id)
        .update(dbData);
      const updated = await this.knex(this.tableName)
        .where('id', existing.id)
        .first();
      return this.transformFromDBData(updated);
    } else {
      const [result] = await this.knex(this.tableName)
        .insert(dbData)
        .returning('*');
      // SQLite doesn't support returning, so fetch by org_id
      if (!result || typeof result === 'number') {
        const inserted = await this.knex(this.tableName)
          .where('organization_id', data.organizationId)
          .first();
        return this.transformFromDBData(inserted);
      }
      return this.transformFromDBData(result);
    }
  }

  protected override transformFromDBData = (data: any): BillingConfig => {
    if (!isPlainObject(data)) throw new Error('Unexpected dbdata');
    return mapKeys(data, (_v, k) => camelCase(k)) as unknown as BillingConfig;
  };

  protected override transformToDBData = (data: any) => {
    if (!isPlainObject(data)) throw new Error('Unexpected dbdata');
    return mapKeys(data, (_v, k) => snakeCase(k));
  };
}

// ── MonthlyUsageCache ──────────────────────────────────

export interface MonthlyUsageCache {
  id?: number;
  organizationId: number;
  year: number;
  month: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  tokensInput: number;
  tokensOutput: number;
  tokensTotal: number;
  estimatedCost: number;
  perKeyBreakdown?: any[];
  perApiTypeBreakdown?: any[];
  lastComputedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface IMonthlyUsageCacheRepository
  extends IBasicRepository<MonthlyUsageCache> {
  findByOrgAndMonth(
    organizationId: number,
    year: number,
    month: number,
  ): Promise<MonthlyUsageCache | null>;
  findByOrg(
    organizationId: number,
    limit?: number,
  ): Promise<MonthlyUsageCache[]>;
  upsert(data: Partial<MonthlyUsageCache>): Promise<MonthlyUsageCache>;
}

export class MonthlyUsageCacheRepository
  extends BaseRepository<MonthlyUsageCache>
  implements IMonthlyUsageCacheRepository
{
  private readonly jsonbColumns = ['perKeyBreakdown', 'perApiTypeBreakdown'];

  constructor(knexPg: Knex) {
    super({ knexPg, tableName: 'monthly_usage_cache' });
  }

  public async findByOrgAndMonth(
    organizationId: number,
    year: number,
    month: number,
  ): Promise<MonthlyUsageCache | null> {
    const row = await this.knex(this.tableName)
      .where({ organization_id: organizationId, year, month })
      .first();
    return row ? this.transformFromDBData(row) : null;
  }

  public async findByOrg(
    organizationId: number,
    limit: number = 12,
  ): Promise<MonthlyUsageCache[]> {
    const rows = await this.knex(this.tableName)
      .where('organization_id', organizationId)
      .orderByRaw('year DESC, month DESC')
      .limit(limit);
    return rows.map(this.transformFromDBData);
  }

  public async upsert(
    data: Partial<MonthlyUsageCache>,
  ): Promise<MonthlyUsageCache> {
    const dbData = this.transformToDBData({
      ...data,
      lastComputedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const existing = await this.knex(this.tableName)
      .where({
        organization_id: data.organizationId,
        year: data.year,
        month: data.month,
      })
      .first();

    if (existing) {
      await this.knex(this.tableName).where('id', existing.id).update(dbData);
      const updated = await this.knex(this.tableName)
        .where('id', existing.id)
        .first();
      return this.transformFromDBData(updated);
    } else {
      const [result] = await this.knex(this.tableName)
        .insert(dbData)
        .returning('*');
      if (!result || typeof result === 'number') {
        const inserted = await this.knex(this.tableName)
          .where({
            organization_id: data.organizationId,
            year: data.year,
            month: data.month,
          })
          .first();
        return this.transformFromDBData(inserted);
      }
      return this.transformFromDBData(result);
    }
  }

  protected override transformFromDBData = (
    data: any,
  ): MonthlyUsageCache => {
    if (!isPlainObject(data)) throw new Error('Unexpected dbdata');
    const camelCaseData = mapKeys(data, (_v, k) => camelCase(k));
    // Parse JSON columns
    for (const col of this.jsonbColumns) {
      if (typeof camelCaseData[col] === 'string' && camelCaseData[col]) {
        try {
          camelCaseData[col] = JSON.parse(camelCaseData[col]);
        } catch {
          // leave as-is
        }
      }
    }
    return camelCaseData as unknown as MonthlyUsageCache;
  };

  protected override transformToDBData = (data: any) => {
    if (!isPlainObject(data)) throw new Error('Unexpected dbdata');
    const snaked: any = {};
    for (const [k, v] of Object.entries(data)) {
      const key = snakeCase(k);
      snaked[key] =
        this.jsonbColumns.includes(k) && typeof v === 'object'
          ? JSON.stringify(v)
          : v;
    }
    return snaked;
  };
}
