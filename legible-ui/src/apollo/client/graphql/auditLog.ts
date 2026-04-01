import { gql } from '@apollo/client';

export const AUDIT_LOGS = gql`
  query AuditLogs(
    $filter: AuditLogFilterInput
    $pagination: AuditLogPaginationInput!
  ) {
    auditLogs(filter: $filter, pagination: $pagination) {
      data {
        id
        timestamp
        userId
        userEmail
        clientIp
        organizationId
        projectId
        category
        action
        targetType
        targetId
        result
        detail
        createdAt
      }
      total
    }
  }
`;
