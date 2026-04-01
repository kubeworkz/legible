import { gql } from '@apollo/client';

export const QUERY_USAGE_OVERVIEW = gql`
  query QueryUsageOverview {
    queryUsageOverview {
      summary {
        totalQueries
        freeTierQueries
        paidQueries
        totalCost
      }
      freeTierRemaining
      isFreeTier
    }
  }
`;

export const QUERY_USAGE_STATS = gql`
  query QueryUsageStats($filter: QueryUsageFilterInput) {
    queryUsageStats(filter: $filter) {
      summary {
        totalQueries
        freeTierQueries
        paidQueries
        totalCost
      }
      bySource {
        source
        totalQueries
        totalCost
      }
      byProject {
        projectId
        totalQueries
        totalCost
      }
      dailyUsage {
        date
        totalQueries
        totalCost
      }
    }
  }
`;

export const QUERY_ALLOWANCE = gql`
  query QueryAllowance {
    queryAllowance {
      allowed
      reason
      plan
      monthlyUsed
      monthlyLimit
    }
  }
`;
