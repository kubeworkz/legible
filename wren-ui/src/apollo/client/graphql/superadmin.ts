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
