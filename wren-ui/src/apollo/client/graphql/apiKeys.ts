import { gql } from '@apollo/client';

export const LIST_API_KEYS = gql`
  query ListApiKeys {
    listApiKeys {
      id
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

export const CREATE_API_KEY = gql`
  mutation CreateApiKey($data: CreateApiKeyInput!) {
    createApiKey(data: $data) {
      key {
        id
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

export const REVOKE_API_KEY = gql`
  mutation RevokeApiKey($keyId: Int!) {
    revokeApiKey(keyId: $keyId)
  }
`;

export const DELETE_API_KEY = gql`
  mutation DeleteApiKey($keyId: Int!) {
    deleteApiKey(keyId: $keyId)
  }
`;

export const UPDATE_API_KEY_RATE_LIMITS = gql`
  mutation UpdateApiKeyRateLimits($data: UpdateApiKeyRateLimitsInput!) {
    updateApiKeyRateLimits(data: $data) {
      id
      rateLimitRpm
      rateLimitRpd
      tokenQuotaMonthly
      tokenQuotaUsed
      quotaResetAt
    }
  }
`;

export const RESET_API_KEY_TOKEN_QUOTA = gql`
  mutation ResetApiKeyTokenQuota($keyId: Int!) {
    resetApiKeyTokenQuota(keyId: $keyId)
  }
`;
