import { ApiType, ApiHistory, UsageFilter } from '@server/repositories/apiHistoryRepository';
import { IContext } from '@server/types';
import { requireProjectRead } from '../utils/authGuard';

export interface ApiHistoryFilter {
  apiType?: ApiType;
  statusCode?: number;
  threadId?: string;
  projectId?: number;
  organizationId?: number;
  apiKeyId?: number;
  startDate?: string;
  endDate?: string;
}

export interface ApiUsageFilterInput {
  organizationId?: number;
  projectId?: number;
  apiKeyId?: number;
  startDate?: string;
  endDate?: string;
}

export interface ApiHistoryPagination {
  offset: number;
  limit: number;
}

/**
 * Sanitize response payload to remove large data fields
 * This prevents excessive data transfer when displaying API history
 * @param payload The response payload to sanitize
 * @param apiType The type of API that generated this response
 */
const sanitizeResponsePayload = (payload: any, apiType?: ApiType): any => {
  if (!payload) return payload;

  const sanitized = { ...payload };

  // Handle specifically RUN_SQL responses that contain large record sets
  if (apiType === ApiType.RUN_SQL) {
    // Remove records array but keep metadata about how many records were returned
    if (sanitized.records && Array.isArray(sanitized.records)) {
      const recordCount = sanitized.records.length;
      sanitized.records = [`${recordCount} records omitted`];
    }
  }

  // Handle specifically GENERATE_VEGA_CHART responses that contain large data values
  if (apiType === ApiType.GENERATE_VEGA_CHART) {
    // Remove vegaSpec.data.values array but keep the structure
    if (
      sanitized.vegaSpec?.data?.values &&
      Array.isArray(sanitized.vegaSpec.data.values)
    ) {
      const dataCount = sanitized.vegaSpec.data.values.length;
      sanitized.vegaSpec.data.values = [`${dataCount} data points omitted`];
    }
  }

  return sanitized;
};

export class ApiHistoryResolver {
  constructor() {
    this.getApiHistory = this.getApiHistory.bind(this);
    this.getApiUsageDashboard = this.getApiUsageDashboard.bind(this);
  }

  /**
   * Get API history with filtering and pagination
   */
  public async getApiHistory(
    _root: unknown,
    args: {
      filter?: ApiHistoryFilter;
      pagination: ApiHistoryPagination;
    },
    ctx: IContext,
  ) {
    await requireProjectRead(ctx);
    const { filter, pagination } = args;
    const { offset, limit } = pagination;

    // Build filter criteria
    const filterCriteria: Partial<ApiHistory> = {};

    if (filter) {
      if (filter.apiType) {
        filterCriteria.apiType = filter.apiType;
      }

      if (filter.statusCode) {
        filterCriteria.statusCode = filter.statusCode;
      }

      if (filter.threadId) {
        filterCriteria.threadId = filter.threadId;
      }

      if (filter.projectId) {
        filterCriteria.projectId = filter.projectId;
      }

      if (filter.organizationId) {
        filterCriteria.organizationId = filter.organizationId;
      }

      if (filter.apiKeyId) {
        filterCriteria.apiKeyId = filter.apiKeyId;
      }
    }

    // Handle date filtering
    const dateFilter: { startDate?: Date; endDate?: Date } = {};
    if (filter?.startDate) {
      dateFilter.startDate = new Date(filter.startDate);
    }
    if (filter?.endDate) {
      dateFilter.endDate = new Date(filter.endDate);
    }

    // Get total count for pagination info
    const total = await ctx.apiHistoryRepository.count(
      filterCriteria,
      dateFilter,
    );

    if (total === 0 || total <= offset) {
      return {
        items: [],
        total,
        hasMore: false,
      };
    }

    // Get paginated items
    const items = await ctx.apiHistoryRepository.findAllWithPagination(
      filterCriteria,
      dateFilter,
      {
        offset,
        limit,
        orderBy: { createdAt: 'desc' },
      },
    );

    return {
      items,
      total,
      hasMore: offset + limit < total,
    };
  }

  /**
   * Get API usage dashboard with aggregated data
   */
  public async getApiUsageDashboard(
    _root: unknown,
    args: { filter?: ApiUsageFilterInput },
    ctx: IContext,
  ) {
    await requireProjectRead(ctx);
    const { filter } = args;

    // Build usage filter
    const usageFilter: UsageFilter = {};
    if (filter) {
      if (filter.organizationId) usageFilter.organizationId = filter.organizationId;
      if (filter.projectId) usageFilter.projectId = filter.projectId;
      if (filter.apiKeyId) usageFilter.apiKeyId = filter.apiKeyId;
      if (filter.startDate) usageFilter.startDate = new Date(filter.startDate);
      if (filter.endDate) usageFilter.endDate = new Date(filter.endDate);
    }

    // Run all aggregation queries in parallel
    const [summary, byApiType, byApiKey, dailyUsage] = await Promise.all([
      ctx.apiHistoryRepository.getUsageSummary(usageFilter),
      ctx.apiHistoryRepository.getUsageByApiType(usageFilter),
      ctx.apiHistoryRepository.getUsageByApiKey(usageFilter),
      ctx.apiHistoryRepository.getDailyUsage(usageFilter),
    ]);

    return {
      summary,
      byApiType,
      byApiKey,
      dailyUsage,
    };
  }

  /**
   * Resolver for ApiHistoryResponse fields
   */
  public getApiHistoryNestedResolver = () => ({
    createdAt: (apiHistory: ApiHistory) => {
      return apiHistory.createdAt
        ? new Date(apiHistory.createdAt).toISOString()
        : null;
    },
    updatedAt: (apiHistory: ApiHistory) => {
      return apiHistory.updatedAt
        ? new Date(apiHistory.updatedAt).toISOString()
        : null;
    },
    responsePayload: (apiHistory: ApiHistory) => {
      if (!apiHistory.responsePayload) return null;

      // If the response payload is an array, return it as is
      if (Array.isArray(apiHistory.responsePayload))
        return apiHistory.responsePayload;

      // Otherwise, sanitize the response payload
      return sanitizeResponsePayload(
        apiHistory.responsePayload,
        apiHistory.apiType,
      );
    },
  });
}
