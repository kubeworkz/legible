import { gql } from '@apollo/client';

export const API_HISTORY = gql`
  query ApiHistory(
    $filter: ApiHistoryFilterInput
    $pagination: ApiHistoryPaginationInput!
  ) {
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

export const API_USAGE_DASHBOARD = gql`
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
