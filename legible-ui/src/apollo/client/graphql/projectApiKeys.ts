import { gql } from '@apollo/client';

export const LIST_PROJECT_API_KEYS = gql`
  query ListProjectApiKeys($projectId: Int!) {
    listProjectApiKeys(projectId: $projectId) {
      id
      projectId
      organizationId
      name
      secretKeyMasked
      permissions
      lastUsedAt
      expiresAt
      createdBy
      createdByEmail
      createdAt
      revokedAt
      rateLimitRpm
      rateLimitRpd
      tokenQuotaMonthly
      tokenQuotaUsed
      quotaResetAt
    }
  }
`;

export const CREATE_PROJECT_API_KEY = gql`
  mutation CreateProjectApiKey($data: CreateProjectApiKeyInput!) {
    createProjectApiKey(data: $data) {
      key {
        id
        projectId
        organizationId
        name
        secretKeyMasked
        permissions
        lastUsedAt
        expiresAt
        createdBy
        createdByEmail
        createdAt
        revokedAt
        rateLimitRpm
        rateLimitRpd
        tokenQuotaMonthly
        tokenQuotaUsed
        quotaResetAt
      }
      secretKey
    }
  }
`;

export const REVOKE_PROJECT_API_KEY = gql`
  mutation RevokeProjectApiKey($keyId: Int!, $projectId: Int!) {
    revokeProjectApiKey(keyId: $keyId, projectId: $projectId)
  }
`;

export const DELETE_PROJECT_API_KEY = gql`
  mutation DeleteProjectApiKey($keyId: Int!, $projectId: Int!) {
    deleteProjectApiKey(keyId: $keyId, projectId: $projectId)
  }
`;

export const UPDATE_PROJECT_API_KEY_RATE_LIMITS = gql`
  mutation UpdateProjectApiKeyRateLimits(
    $data: UpdateProjectApiKeyRateLimitsInput!
  ) {
    updateProjectApiKeyRateLimits(data: $data) {
      id
      rateLimitRpm
      rateLimitRpd
      tokenQuotaMonthly
      tokenQuotaUsed
      quotaResetAt
    }
  }
`;

export const RESET_PROJECT_API_KEY_TOKEN_QUOTA = gql`
  mutation ResetProjectApiKeyTokenQuota($keyId: Int!, $projectId: Int!) {
    resetProjectApiKeyTokenQuota(keyId: $keyId, projectId: $projectId)
  }
`;
