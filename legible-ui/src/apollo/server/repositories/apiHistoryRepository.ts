import {
  camelCase,
  isPlainObject,
  mapKeys,
  mapValues,
  snakeCase,
} from 'lodash';
import { BaseRepository, IBasicRepository } from './baseRepository';
import { Knex } from 'knex';

export enum ApiType {
  GENERATE_SQL = 'GENERATE_SQL',
  RUN_SQL = 'RUN_SQL',
  GENERATE_VEGA_CHART = 'GENERATE_VEGA_CHART',
  GENERATE_SUMMARY = 'GENERATE_SUMMARY',
  ASK = 'ASK',
  GET_INSTRUCTIONS = 'GET_INSTRUCTIONS',
  CREATE_INSTRUCTION = 'CREATE_INSTRUCTION',
  UPDATE_INSTRUCTION = 'UPDATE_INSTRUCTION',
  DELETE_INSTRUCTION = 'DELETE_INSTRUCTION',
  GET_SQL_PAIRS = 'GET_SQL_PAIRS',
  CREATE_SQL_PAIR = 'CREATE_SQL_PAIR',
  UPDATE_SQL_PAIR = 'UPDATE_SQL_PAIR',
  DELETE_SQL_PAIR = 'DELETE_SQL_PAIR',
  GET_MODELS = 'GET_MODELS',
  STREAM_ASK = 'STREAM_ASK',
  STREAM_GENERATE_SQL = 'STREAM_GENERATE_SQL',
  AGENT_CHAT = 'AGENT_CHAT',
  AGENT_LIST = 'AGENT_LIST',
}

export interface ApiHistory {
  id?: string;
  projectId: number;
  apiType: ApiType;
  threadId?: string;
  headers?: Record<string, string>;
  requestPayload?: Record<string, any>;
  responsePayload?: Record<string, any>;
  statusCode?: number;
  durationMs?: number;
  // API key attribution
  apiKeyId?: number;
  apiKeyType?: 'org' | 'project';
  organizationId?: number;
  // Token usage tracking
  tokensInput?: number;
  tokensOutput?: number;
  tokensTotal?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface PaginationOptions {
  offset: number;
  limit: number;
  orderBy?: Record<string, 'asc' | 'desc'>;
}

export interface UsageSummary {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  avgDurationMs: number;
  tokensInput: number;
  tokensOutput: number;
  tokensTotal: number;
}

export interface UsageByApiType {
  apiType: ApiType;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  avgDurationMs: number;
  tokensTotal: number;
}

export interface UsageByApiKey {
  apiKeyId: number;
  apiKeyType: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  avgDurationMs: number;
  tokensTotal: number;
  lastUsedAt: string;
}

export interface DailyUsage {
  date: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  tokensTotal: number;
}

export interface UsageFilter {
  organizationId?: number;
  projectId?: number;
  apiKeyId?: number;
  startDate?: Date;
  endDate?: Date;
}

export interface MonthlyUsage {
  year: number;
  month: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  tokensInput: number;
  tokensOutput: number;
  tokensTotal: number;
}

export interface IApiHistoryRepository extends IBasicRepository<ApiHistory> {
  count(
    filter?: Partial<ApiHistory>,
    dateFilter?: { startDate?: Date; endDate?: Date },
  ): Promise<number>;
  findAllWithPagination(
    filter?: Partial<ApiHistory>,
    dateFilter?: { startDate?: Date; endDate?: Date },
    pagination?: PaginationOptions,
  ): Promise<ApiHistory[]>;
  findAllForExport(
    filter?: Partial<ApiHistory>,
    dateFilter?: { startDate?: Date; endDate?: Date },
    maxRows?: number,
  ): Promise<ApiHistory[]>;
  getUsageSummary(filter: UsageFilter): Promise<UsageSummary>;
  getUsageByApiType(filter: UsageFilter): Promise<UsageByApiType[]>;
  getUsageByApiKey(filter: UsageFilter): Promise<UsageByApiKey[]>;
  getDailyUsage(filter: UsageFilter): Promise<DailyUsage[]>;
  getMonthlyUsage(filter: UsageFilter): Promise<MonthlyUsage[]>;
}

export class ApiHistoryRepository
  extends BaseRepository<ApiHistory>
  implements IApiHistoryRepository
{
  private readonly jsonbColumns = [
    'headers',
    'requestPayload',
    'responsePayload',
  ];

  constructor(knexPg: Knex) {
    super({ knexPg, tableName: 'api_history' });
  }

  /**
   * Count API history records with filtering
   */
  public async count(
    filter?: Partial<ApiHistory>,
    dateFilter?: { startDate?: Date; endDate?: Date },
  ): Promise<number> {
    let query = this.knex(this.tableName).count('id as count');

    if (filter) {
      query = query.where(this.transformToDBData(filter));
    }

    if (dateFilter) {
      if (dateFilter.startDate) {
        query = query.where('created_at', '>=', dateFilter.startDate);
      }

      if (dateFilter.endDate) {
        query = query.where('created_at', '<=', dateFilter.endDate);
      }
    }

    const result = await query;
    return parseInt(result[0].count as string, 10);
  }

  /**
   * Find API history records with pagination
   */
  public async findAllWithPagination(
    filter?: Partial<ApiHistory>,
    dateFilter?: { startDate?: Date; endDate?: Date },
    pagination?: PaginationOptions,
  ): Promise<ApiHistory[]> {
    let query = this.knex(this.tableName).select('*');

    if (filter) {
      query = query.where(this.transformToDBData(filter));
    }

    if (dateFilter) {
      if (dateFilter.startDate) {
        query = query.where('created_at', '>=', dateFilter.startDate);
      }

      if (dateFilter.endDate) {
        query = query.where('created_at', '<=', dateFilter.endDate);
      }
    }

    if (pagination) {
      if (pagination.orderBy) {
        Object.entries(pagination.orderBy).forEach(([field, direction]) => {
          query = query.orderBy(this.camelToSnakeCase(field), direction);
        });
      } else {
        // Default sort by created_at desc
        query = query.orderBy('created_at', 'desc');
      }

      query = query.offset(pagination.offset).limit(pagination.limit);
    }

    const result = await query;
    return result.map(this.transformFromDBData);
  }

  protected override transformFromDBData = (data: any): ApiHistory => {
    if (!isPlainObject(data)) {
      throw new Error('Unexpected dbdata');
    }
    const camelCaseData = mapKeys(data, (_value, key) => camelCase(key));
    const formattedData = mapValues(camelCaseData, (value, key) => {
      if (this.jsonbColumns.includes(key)) {
        // The value from Sqlite will be string type, while the value from PG is JSON object
        if (typeof value === 'string') {
          if (!value) return value;
          try {
            return JSON.parse(value);
          } catch (error) {
            console.error(`Failed to parse JSON for ${key}:`, error);
            return value; // Return raw value if parsing fails
          }
        } else {
          return value;
        }
      }
      return value;
    }) as ApiHistory;
    return formattedData;
  };

  protected override transformToDBData = (data: any) => {
    if (!isPlainObject(data)) {
      throw new Error('Unexpected dbdata');
    }
    const transformedData = mapValues(data, (value, key) => {
      if (this.jsonbColumns.includes(key)) {
        return JSON.stringify(value);
      } else {
        return value;
      }
    });
    return mapKeys(transformedData, (_value, key) => snakeCase(key));
  };

  /**
   * Convert camelCase to snake_case for DB column names
   */
  private camelToSnakeCase(str: string): string {
    return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  }

  /**
   * Apply common usage filter conditions to a query
   */
  private applyUsageFilter(query: Knex.QueryBuilder, filter: UsageFilter): Knex.QueryBuilder {
    if (filter.organizationId) {
      query = query.where('organization_id', filter.organizationId);
    }
    if (filter.projectId) {
      query = query.where('project_id', filter.projectId);
    }
    if (filter.apiKeyId) {
      query = query.where('api_key_id', filter.apiKeyId);
    }
    if (filter.startDate) {
      query = query.where('created_at', '>=', filter.startDate);
    }
    if (filter.endDate) {
      query = query.where('created_at', '<=', filter.endDate);
    }
    return query;
  }

  /**
   * Get overall usage summary (totals, averages, token counts)
   */
  public async getUsageSummary(filter: UsageFilter): Promise<UsageSummary> {
    let query = this.knex(this.tableName)
      .count('id as totalRequests')
      .sum({ tokensInput: 'tokens_input', tokensOutput: 'tokens_output', tokensTotal: 'tokens_total' })
      .avg({ avgDurationMs: 'duration_ms' })
      .select(
        this.knex.raw('COUNT(CASE WHEN status_code >= 200 AND status_code < 300 THEN 1 END) as "successfulRequests"'),
        this.knex.raw('COUNT(CASE WHEN status_code >= 400 THEN 1 END) as "failedRequests"'),
      );

    query = this.applyUsageFilter(query, filter);
    const result = await query;
    const row: any = result[0] || {};

    return {
      totalRequests: parseInt(row.totalRequests as string, 10) || 0,
      successfulRequests: parseInt(row.successfulRequests as string, 10) || 0,
      failedRequests: parseInt(row.failedRequests as string, 10) || 0,
      avgDurationMs: Math.round(parseFloat(row.avgDurationMs as string) || 0),
      tokensInput: parseInt(row.tokensInput as string, 10) || 0,
      tokensOutput: parseInt(row.tokensOutput as string, 10) || 0,
      tokensTotal: parseInt(row.tokensTotal as string, 10) || 0,
    };
  }

  /**
   * Get usage broken down by API type
   */
  public async getUsageByApiType(filter: UsageFilter): Promise<UsageByApiType[]> {
    let query = this.knex(this.tableName)
      .select('api_type as apiType')
      .count('id as totalRequests')
      .sum({ tokensTotal: 'tokens_total' })
      .avg({ avgDurationMs: 'duration_ms' })
      .select(
        this.knex.raw('COUNT(CASE WHEN status_code >= 200 AND status_code < 300 THEN 1 END) as "successfulRequests"'),
        this.knex.raw('COUNT(CASE WHEN status_code >= 400 THEN 1 END) as "failedRequests"'),
      )
      .groupBy('api_type')
      .orderBy('totalRequests', 'desc');

    query = this.applyUsageFilter(query, filter);
    const rows = await query;

    return rows.map((row: any) => ({
      apiType: row.apiType as ApiType,
      totalRequests: parseInt(row.totalRequests as string, 10) || 0,
      successfulRequests: parseInt(row.successfulRequests as string, 10) || 0,
      failedRequests: parseInt(row.failedRequests as string, 10) || 0,
      avgDurationMs: Math.round(parseFloat(row.avgDurationMs as string) || 0),
      tokensTotal: parseInt(row.tokensTotal as string, 10) || 0,
    }));
  }

  /**
   * Get usage broken down by API key
   */
  public async getUsageByApiKey(filter: UsageFilter): Promise<UsageByApiKey[]> {
    let query = this.knex(this.tableName)
      .select('api_key_id as apiKeyId', 'api_key_type as apiKeyType')
      .count('id as totalRequests')
      .sum({ tokensTotal: 'tokens_total' })
      .avg({ avgDurationMs: 'duration_ms' })
      .max({ lastUsedAt: 'created_at' })
      .select(
        this.knex.raw('COUNT(CASE WHEN status_code >= 200 AND status_code < 300 THEN 1 END) as "successfulRequests"'),
        this.knex.raw('COUNT(CASE WHEN status_code >= 400 THEN 1 END) as "failedRequests"'),
      )
      .whereNotNull('api_key_id')
      .groupBy('api_key_id', 'api_key_type')
      .orderBy('totalRequests', 'desc');

    query = this.applyUsageFilter(query, filter);
    const rows = await query;

    return rows.map((row: any) => ({
      apiKeyId: row.apiKeyId,
      apiKeyType: row.apiKeyType || 'unknown',
      totalRequests: parseInt(row.totalRequests as string, 10) || 0,
      successfulRequests: parseInt(row.successfulRequests as string, 10) || 0,
      failedRequests: parseInt(row.failedRequests as string, 10) || 0,
      avgDurationMs: Math.round(parseFloat(row.avgDurationMs as string) || 0),
      tokensTotal: parseInt(row.tokensTotal as string, 10) || 0,
      lastUsedAt: row.lastUsedAt,
    }));
  }

  /**
   * Get daily usage time series
   */
  public async getDailyUsage(filter: UsageFilter): Promise<DailyUsage[]> {
    let query = this.knex(this.tableName)
      .select(this.knex.raw("DATE(created_at) as date"))
      .count('id as totalRequests')
      .sum({ tokensTotal: 'tokens_total' })
      .select(
        this.knex.raw('COUNT(CASE WHEN status_code >= 200 AND status_code < 300 THEN 1 END) as "successfulRequests"'),
        this.knex.raw('COUNT(CASE WHEN status_code >= 400 THEN 1 END) as "failedRequests"'),
      )
      .groupByRaw('DATE(created_at)')
      .orderBy('date', 'asc');

    query = this.applyUsageFilter(query, filter);
    const rows = await query;

    return rows.map((row: any) => ({
      date: row.date,
      totalRequests: parseInt(row.totalRequests as string, 10) || 0,
      successfulRequests: parseInt(row.successfulRequests as string, 10) || 0,
      failedRequests: parseInt(row.failedRequests as string, 10) || 0,
      tokensTotal: parseInt(row.tokensTotal as string, 10) || 0,
    }));
  }

  /**
   * Find all records for export (no pagination limit, just a safety max)
   */
  public async findAllForExport(
    filter?: Partial<ApiHistory>,
    dateFilter?: { startDate?: Date; endDate?: Date },
    maxRows: number = 50000,
  ): Promise<ApiHistory[]> {
    let query = this.knex(this.tableName).select('*');

    if (filter) {
      query = query.where(this.transformToDBData(filter));
    }

    if (dateFilter) {
      if (dateFilter.startDate) {
        query = query.where('created_at', '>=', dateFilter.startDate);
      }
      if (dateFilter.endDate) {
        query = query.where('created_at', '<=', dateFilter.endDate);
      }
    }

    query = query.orderBy('created_at', 'desc').limit(maxRows);
    const result = await query;
    return result.map(this.transformFromDBData);
  }

  /**
   * Get monthly usage aggregation (grouped by year + month)
   */
  public async getMonthlyUsage(filter: UsageFilter): Promise<MonthlyUsage[]> {
    // Use strftime for SQLite, to_char for PG — we use raw that works for both
    // SQLite: strftime('%Y', created_at), strftime('%m', created_at)
    // PG:    EXTRACT(YEAR FROM created_at), EXTRACT(MONTH FROM created_at)
    // Using CAST approach that works for both:
    let query = this.knex(this.tableName)
      .select(
        this.knex.raw("CAST(strftime('%Y', created_at) AS INTEGER) as year"),
        this.knex.raw("CAST(strftime('%m', created_at) AS INTEGER) as month"),
      )
      .count('id as totalRequests')
      .sum({
        tokensInput: 'tokens_input',
        tokensOutput: 'tokens_output',
        tokensTotal: 'tokens_total',
      })
      .select(
        this.knex.raw(
          'COUNT(CASE WHEN status_code >= 200 AND status_code < 300 THEN 1 END) as "successfulRequests"',
        ),
        this.knex.raw(
          'COUNT(CASE WHEN status_code >= 400 THEN 1 END) as "failedRequests"',
        ),
      )
      .groupByRaw("strftime('%Y', created_at), strftime('%m', created_at)")
      .orderByRaw("year DESC, month DESC");

    query = this.applyUsageFilter(query, filter);
    const rows = await query;

    return rows.map((row: any) => ({
      year: parseInt(row.year as string, 10),
      month: parseInt(row.month as string, 10),
      totalRequests: parseInt(row.totalRequests as string, 10) || 0,
      successfulRequests: parseInt(row.successfulRequests as string, 10) || 0,
      failedRequests: parseInt(row.failedRequests as string, 10) || 0,
      tokensInput: parseInt(row.tokensInput as string, 10) || 0,
      tokensOutput: parseInt(row.tokensOutput as string, 10) || 0,
      tokensTotal: parseInt(row.tokensTotal as string, 10) || 0,
    }));
  }
}
