import { gql } from '@apollo/client';

export const BILLING_CONFIG = gql`
  query BillingConfig {
    billingConfig {
      costPer1kInputTokens
      costPer1kOutputTokens
      currency
      monthlySpendAlert
      billingPeriodAnchorDay
    }
  }
`;

export const BILLING_OVERVIEW = gql`
  query BillingOverview {
    billingOverview {
      config {
        costPer1kInputTokens
        costPer1kOutputTokens
        currency
        monthlySpendAlert
        billingPeriodAnchorDay
      }
      currentMonth {
        year
        month
        totalRequests
        successfulRequests
        failedRequests
        tokensInput
        tokensOutput
        tokensTotal
        estimatedCost
        perKeyBreakdown {
          apiKeyId
          apiKeyType
          totalRequests
          tokensTotal
          estimatedCost
        }
        perApiTypeBreakdown {
          apiType
          totalRequests
          tokensTotal
          estimatedCost
        }
      }
      history {
        year
        month
        totalRequests
        successfulRequests
        failedRequests
        tokensInput
        tokensOutput
        tokensTotal
        estimatedCost
        perKeyBreakdown {
          apiKeyId
          apiKeyType
          totalRequests
          tokensTotal
          estimatedCost
        }
        perApiTypeBreakdown {
          apiType
          totalRequests
          tokensTotal
          estimatedCost
        }
      }
    }
  }
`;

export const MONTHLY_BILLING = gql`
  query MonthlyBilling($year: Int!, $month: Int!) {
    monthlyBilling(year: $year, month: $month) {
      year
      month
      totalRequests
      successfulRequests
      failedRequests
      tokensInput
      tokensOutput
      tokensTotal
      estimatedCost
      perKeyBreakdown {
        apiKeyId
        apiKeyType
        totalRequests
        tokensTotal
        estimatedCost
      }
      perApiTypeBreakdown {
        apiType
        totalRequests
        tokensTotal
        estimatedCost
      }
    }
  }
`;

export const UPDATE_BILLING_CONFIG = gql`
  mutation UpdateBillingConfig($data: UpdateBillingConfigInput!) {
    updateBillingConfig(data: $data) {
      costPer1kInputTokens
      costPer1kOutputTokens
      currency
      monthlySpendAlert
      billingPeriodAnchorDay
    }
  }
`;

export const RECOMPUTE_MONTHLY_BILLING = gql`
  mutation RecomputeMonthlyBilling($year: Int!, $month: Int!) {
    recomputeMonthlyBilling(year: $year, month: $month) {
      year
      month
      totalRequests
      tokensTotal
      estimatedCost
    }
  }
`;
