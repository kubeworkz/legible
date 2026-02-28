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
