import * as Types from './__types__';

import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
const defaultOptions = {} as const;
export type ApiHistoryQueryVariables = Types.Exact<{
  filter?: Types.InputMaybe<Types.ApiHistoryFilterInput>;
  pagination: Types.ApiHistoryPaginationInput;
}>;


export type ApiHistoryQuery = { __typename?: 'Query', apiHistory: { __typename?: 'ApiHistoryPaginatedResponse', total: number, hasMore: boolean, items: Array<{ __typename?: 'ApiHistoryResponse', id: string, projectId: number, apiType: Types.ApiType, threadId?: string | null, headers?: any | null, requestPayload?: any | null, responsePayload?: any | null, statusCode?: number | null, durationMs?: number | null, apiKeyId?: number | null, apiKeyType?: string | null, organizationId?: number | null, tokensInput?: number | null, tokensOutput?: number | null, tokensTotal?: number | null, createdAt: string, updatedAt: string }> } };

export type ApiUsageDashboardQueryVariables = Types.Exact<{
  filter?: Types.InputMaybe<Types.ApiUsageFilterInput>;
}>;

export type ApiUsageDashboardQuery = { __typename?: 'Query', apiUsageDashboard: { __typename?: 'ApiUsageDashboard', summary: { __typename?: 'ApiUsageSummary', totalRequests: number, successfulRequests: number, failedRequests: number, avgDurationMs: number, tokensInput: number, tokensOutput: number, tokensTotal: number }, byApiType: Array<{ __typename?: 'ApiUsageByApiType', apiType: Types.ApiType, totalRequests: number, successfulRequests: number, failedRequests: number, avgDurationMs: number, tokensTotal: number }>, byApiKey: Array<{ __typename?: 'ApiUsageByApiKey', apiKeyId: number, apiKeyType: string, totalRequests: number, successfulRequests: number, failedRequests: number, avgDurationMs: number, tokensTotal: number, lastUsedAt?: string | null }>, dailyUsage: Array<{ __typename?: 'ApiDailyUsage', date: string, totalRequests: number, successfulRequests: number, failedRequests: number, tokensTotal: number }> } };


export const ApiHistoryDocument = gql`
    query ApiHistory($filter: ApiHistoryFilterInput, $pagination: ApiHistoryPaginationInput!) {
  apiHistory(filter: $filter, pagination: $pagination) {
    items {
      id
      projectId
      apiType
      threadId
      headers
      requestPayload
      responsePayload
      statusCode
      durationMs
      apiKeyId
      apiKeyType
      organizationId
      tokensInput
      tokensOutput
      tokensTotal
      createdAt
      updatedAt
    }
    total
    hasMore
  }
}
    `;

/**
 * __useApiHistoryQuery__
 *
 * To run a query within a React component, call `useApiHistoryQuery` and pass it any options that fit your needs.
 * When your component renders, `useApiHistoryQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useApiHistoryQuery({
 *   variables: {
 *      filter: // value for 'filter'
 *      pagination: // value for 'pagination'
 *   },
 * });
 */
export function useApiHistoryQuery(baseOptions: Apollo.QueryHookOptions<ApiHistoryQuery, ApiHistoryQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ApiHistoryQuery, ApiHistoryQueryVariables>(ApiHistoryDocument, options);
      }
export function useApiHistoryLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ApiHistoryQuery, ApiHistoryQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ApiHistoryQuery, ApiHistoryQueryVariables>(ApiHistoryDocument, options);
        }
export type ApiHistoryQueryHookResult = ReturnType<typeof useApiHistoryQuery>;
export type ApiHistoryLazyQueryHookResult = ReturnType<typeof useApiHistoryLazyQuery>;
export type ApiHistoryQueryResult = Apollo.QueryResult<ApiHistoryQuery, ApiHistoryQueryVariables>;

export const ApiUsageDashboardDocument = gql`
    query ApiUsageDashboard($filter: ApiUsageFilterInput) {
  apiUsageDashboard(filter: $filter) {
    summary {
      totalRequests
      successfulRequests
      failedRequests
      avgDurationMs
      tokensInput
      tokensOutput
      tokensTotal
    }
    byApiType {
      apiType
      totalRequests
      successfulRequests
      failedRequests
      avgDurationMs
      tokensTotal
    }
    byApiKey {
      apiKeyId
      apiKeyType
      totalRequests
      successfulRequests
      failedRequests
      avgDurationMs
      tokensTotal
      lastUsedAt
    }
    dailyUsage {
      date
      totalRequests
      successfulRequests
      failedRequests
      tokensTotal
    }
  }
}
    `;

/**
 * __useApiUsageDashboardQuery__
 *
 * To run a query within a React component, call `useApiUsageDashboardQuery` and pass it any options that fit your needs.
 * When your component renders, `useApiUsageDashboardQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useApiUsageDashboardQuery({
 *   variables: {
 *      filter: // value for 'filter'
 *   },
 * });
 */
export function useApiUsageDashboardQuery(baseOptions?: Apollo.QueryHookOptions<ApiUsageDashboardQuery, ApiUsageDashboardQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ApiUsageDashboardQuery, ApiUsageDashboardQueryVariables>(ApiUsageDashboardDocument, options);
      }
export function useApiUsageDashboardLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ApiUsageDashboardQuery, ApiUsageDashboardQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ApiUsageDashboardQuery, ApiUsageDashboardQueryVariables>(ApiUsageDashboardDocument, options);
        }
export type ApiUsageDashboardQueryHookResult = ReturnType<typeof useApiUsageDashboardQuery>;
export type ApiUsageDashboardQueryLazyQueryHookResult = ReturnType<typeof useApiUsageDashboardLazyQuery>;
export type ApiUsageDashboardQueryResult = Apollo.QueryResult<ApiUsageDashboardQuery, ApiUsageDashboardQueryVariables>;