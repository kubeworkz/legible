/**
 * QueryUsageRepository — data access for the query_usage table.
 *
 * Each row represents one chargeable SQL query execution.
 */

import { Knex } from 'knex';
import { camelCase, isPlainObject, mapKeys, snakeCase } from 'lodash';
import { BaseRepository, IBasicRepository } from './baseRepository';

// ── Types ───────────────────────────────────────────────

export interface QueryUsage {
  id?: number;
  organizationId: number;
  projectId: number;
  userId?: number | null;
  source: string;
  cost: number;
  isFreeTier: boolean;
  durationMs?: number | null;
  sqlHash?: string | null;
  createdAt?: string;
}

export interface QueryUsageSummary {
  totalQueries: number;
  freeTierQueries: number;
  paidQueries: number;
  totalCost: number;
}

export interface QueryUsageBySource {
  source: string;
  totalQueries: number;
  totalCost: number;
}

export interface QueryUsageByProject {
  projectId: number;
  totalQueries: number;
  totalCost: number;
}

export interface QueryUsageFilter {
  organizationId: number;
  projectId?: number;
  userId?: number;
  startDate?: Date;
  endDate?: Date;
  sourcePrefix?: string;
}

// ── Interface ───────────────────────────────────────────

export interface IQueryUsageRepository extends IBasicRepository<QueryUsage> {
  /** Count all queries for an org in a date range */
  getUsageSummary(filter: QueryUsageFilter): Promise<QueryUsageSummary>;

  /** Count queries for the current billing period (for free-tier calculation) */
  getOrgQueryCount(
    organizationId: number,
    since?: Date,
  ): Promise<number>;

  /** Breakdown by source type */
  getUsageBySource(filter: QueryUsageFilter): Promise<QueryUsageBySource[]>;

  /** Breakdown by project */
  getUsageByProject(filter: QueryUsageFilter): Promise<QueryUsageByProject[]>;

  /** Get daily query counts for charting */
  getDailyUsage(
    filter: QueryUsageFilter,
  ): Promise<{ date: string; totalQueries: number; totalCost: number }[]>;

  /** Get daily paid-query breakdown for overage invoice detail */
  getOverageBreakdown(
    organizationId: number,
    since: Date,
    until?: Date,
  ): Promise<
    {
      date: string;
      paidQueries: number;
      cost: number;
    }[]
  >;
}

// ── Implementation ──────────────────────────────────────

export class QueryUsageRepository
  extends BaseRepository<QueryUsage>
  implements IQueryUsageRepository
{
  constructor(knexPg: Knex) {
    super({ knexPg, tableName: 'query_usage' });
  }

  public async getUsageSummary(
    filter: QueryUsageFilter,
  ): Promise<QueryUsageSummary> {
    const qb = this.knex(this.tableName)
      .where('organization_id', filter.organizationId);
    this.applyDateFilter(qb, filter);
    if (filter.projectId) qb.where('project_id', filter.projectId);
    if (filter.userId) qb.where('user_id', filter.userId);
    if (filter.sourcePrefix) qb.where('source', 'like', `${filter.sourcePrefix}%`);

    const row: any = await qb
      .select(
        this.knex.raw('COUNT(*) as total_queries'),
        this.knex.raw(
          "SUM(CASE WHEN is_free_tier = 1 OR is_free_tier = true THEN 1 ELSE 0 END) as free_tier_queries",
        ),
        this.knex.raw(
          "SUM(CASE WHEN is_free_tier = 0 OR is_free_tier = false THEN 1 ELSE 0 END) as paid_queries",
        ),
        this.knex.raw(
          "SUM(CASE WHEN is_free_tier = 0 OR is_free_tier = false THEN cost ELSE 0 END) as total_cost",
        ),
      )
      .first();

    return {
      totalQueries: Number(row?.total_queries) || 0,
      freeTierQueries: Number(row?.free_tier_queries) || 0,
      paidQueries: Number(row?.paid_queries) || 0,
      totalCost: Number(row?.total_cost) || 0,
    };
  }

  public async getOrgQueryCount(
    organizationId: number,
    since?: Date,
  ): Promise<number> {
    const qb = this.knex(this.tableName)
      .where('organization_id', organizationId);
    if (since) {
      qb.where('created_at', '>=', since.toISOString());
    }
    const row: any = await qb.count('* as cnt').first();
    return Number(row?.cnt) || 0;
  }

  public async getUsageBySource(
    filter: QueryUsageFilter,
  ): Promise<QueryUsageBySource[]> {
    const qb = this.knex(this.tableName)
      .where('organization_id', filter.organizationId);
    this.applyDateFilter(qb, filter);
    if (filter.projectId) qb.where('project_id', filter.projectId);
    if (filter.sourcePrefix) qb.where('source', 'like', `${filter.sourcePrefix}%`);

    const rows = await qb
      .select('source')
      .count('* as total_queries')
      .sum({ total_cost: 'cost' })
      .groupBy('source')
      .orderBy('total_queries', 'desc');

    return rows.map((r: any) => ({
      source: r.source,
      totalQueries: Number(r.total_queries) || 0,
      totalCost: Number(r.total_cost) || 0,
    }));
  }

  public async getUsageByProject(
    filter: QueryUsageFilter,
  ): Promise<QueryUsageByProject[]> {
    const qb = this.knex(this.tableName)
      .where('organization_id', filter.organizationId);
    this.applyDateFilter(qb, filter);
    if (filter.sourcePrefix) qb.where('source', 'like', `${filter.sourcePrefix}%`);

    const rows = await qb
      .select('project_id')
      .count('* as total_queries')
      .sum({ total_cost: 'cost' })
      .groupBy('project_id')
      .orderBy('total_queries', 'desc');

    return rows.map((r: any) => ({
      projectId: Number(r.project_id),
      totalQueries: Number(r.total_queries) || 0,
      totalCost: Number(r.total_cost) || 0,
    }));
  }

  public async getDailyUsage(
    filter: QueryUsageFilter,
  ): Promise<{ date: string; totalQueries: number; totalCost: number }[]> {
    const qb = this.knex(this.tableName)
      .where('organization_id', filter.organizationId);
    this.applyDateFilter(qb, filter);
    if (filter.projectId) qb.where('project_id', filter.projectId);
    if (filter.sourcePrefix) qb.where('source', 'like', `${filter.sourcePrefix}%`);

    const rows = await qb
      .select(this.knex.raw("DATE(created_at) as date"))
      .count('* as total_queries')
      .sum({ total_cost: 'cost' })
      .groupByRaw('DATE(created_at)')
      .orderBy('date', 'asc');

    return rows.map((r: any) => ({
      date: r.date,
      totalQueries: Number(r.total_queries) || 0,
      totalCost: Number(r.total_cost) || 0,
    }));
  }

  public async getOverageBreakdown(
    organizationId: number,
    since: Date,
    until?: Date,
  ): Promise<{ date: string; paidQueries: number; cost: number }[]> {
    const qb = this.knex(this.tableName)
      .where('organization_id', organizationId)
      .where('created_at', '>=', since.toISOString())
      .andWhere(function () {
        this.where('is_free_tier', 0).orWhere('is_free_tier', false);
      });

    if (until) {
      qb.where('created_at', '<=', until.toISOString());
    }

    const rows = await qb
      .select(this.knex.raw("DATE(created_at) as date"))
      .count('* as paid_queries')
      .sum({ cost: 'cost' })
      .groupByRaw('DATE(created_at)')
      .orderBy('date', 'asc');

    return rows.map((r: any) => ({
      date: r.date,
      paidQueries: Number(r.paid_queries) || 0,
      cost: Number(r.cost) || 0,
    }));
  }

  // ── Helpers ─────────────────────────────────────────

  private applyDateFilter(
    qb: Knex.QueryBuilder,
    filter: QueryUsageFilter,
  ): void {
    if (filter.startDate) {
      qb.where('created_at', '>=', filter.startDate.toISOString());
    }
    if (filter.endDate) {
      qb.where('created_at', '<=', filter.endDate.toISOString());
    }
  }

  protected override transformFromDBData = (data: any): QueryUsage => {
    if (!isPlainObject(data)) throw new Error('Unexpected dbdata');
    return mapKeys(data, (_v, k) => camelCase(k)) as unknown as QueryUsage;
  };

  protected override transformToDBData = (data: any) => {
    if (!isPlainObject(data)) throw new Error('Unexpected dbdata');
    return mapKeys(data, (_v, k) => snakeCase(k));
  };
}
