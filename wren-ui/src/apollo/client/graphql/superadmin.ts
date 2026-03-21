import { gql } from '@apollo/client';

export const ADMIN_LIST_ORGANIZATIONS = gql`
  query AdminListOrganizations {
    adminListOrganizations {
      id
      displayName
      slug
      memberCount
      plan
      subscriptionStatus
      createdAt
    }
  }
`;

export const ADMIN_GET_ORGANIZATION = gql`
  query AdminGetOrganization($organizationId: Int!) {
    adminGetOrganization(organizationId: $organizationId) {
      id
      displayName
      slug
      memberCount
      plan
      subscriptionStatus
      projectCount
      members {
        id
        role
        user {
          id
          email
          displayName
          avatarUrl
        }
        createdAt
      }
      createdAt
      updatedAt
    }
  }
`;

export const ADMIN_LIST_USERS = gql`
  query AdminListUsers {
    adminListUsers {
      id
      email
      displayName
      isActive
      isSuperadmin
      emailVerified
      lastLoginAt
      createdAt
      organizations {
        organizationId
        organizationName
        role
      }
    }
  }
`;

export const ADMIN_PLATFORM_STATS = gql`
  query AdminPlatformStats {
    adminPlatformStats {
      totalUsers
      activeUsers
      totalOrganizations
      subscriptionsByPlan {
        plan
        count
      }
    }
  }
`;

export const ADMIN_SET_SUPERADMIN = gql`
  mutation AdminSetSuperadmin($userId: Int!) {
    adminSetSuperadmin(userId: $userId)
  }
`;

export const ADMIN_REVOKE_SUPERADMIN = gql`
  mutation AdminRevokeSuperadmin($userId: Int!) {
    adminRevokeSuperadmin(userId: $userId)
  }
`;

export const ADMIN_REVENUE_STATS = gql`
  query AdminRevenueStats {
    adminRevenueStats {
      mrr
      arr
      arpu
      churnRate
      totalPaidOrgs
      totalFreeOrgs
      totalCanceledOrgs
      planBreakdown {
        plan
        count
        mrr
      }
      orgRevenue {
        organizationId
        organizationName
        plan
        status
        mrr
        currentPeriodStart
        currentPeriodEnd
        canceledAt
      }
    }
  }
`;

export const ADMIN_AUDIT_LOGS = gql`
  query AdminAuditLogs(
    $filter: AuditLogFilterInput
    $pagination: AuditLogPaginationInput!
  ) {
    adminAuditLogs(filter: $filter, pagination: $pagination) {
      data {
        id
        timestamp
        userId
        userEmail
        clientIp
        organizationId
        category
        action
        targetType
        targetId
        result
        detail
      }
      total
    }
  }
`;

export const ADMIN_SECURITY_OVERVIEW = gql`
  query AdminSecurityOverview {
    adminSecurityOverview {
      failedLogins24h
      failedOidcLogins24h
      superadminActions7d
      totalEvents24h
      oidcProviderCount
      oidcEnabledCount
      ssoEnforcedCount
      activeSessions
      totalSessions
      superadminCount
      totalUsers
      recentSecurityEvents {
        id
        timestamp
        userEmail
        category
        action
        result
        detail
      }
    }
  }
`;
