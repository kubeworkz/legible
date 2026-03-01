import { gql } from '@apollo/client';

const RLS_POLICY = gql`
  fragment RlsPolicyFields on RlsPolicy {
    id
    projectId
    name
    condition
    modelIds
    sessionPropertyIds
    createdAt
    updatedAt
  }
`;

const SESSION_PROPERTY = gql`
  fragment SessionPropertyFields on SessionProperty {
    id
    projectId
    name
    type
    required
    defaultExpr
    createdAt
    updatedAt
  }
`;

// ── Queries ──────────────────────────────────────────

export const LIST_RLS_POLICIES = gql`
  query RlsPolicies {
    rlsPolicies {
      ...RlsPolicyFields
    }
  }

  ${RLS_POLICY}
`;

export const GET_RLS_POLICY = gql`
  query RlsPolicy($where: RlsPolicyWhereUniqueInput!) {
    rlsPolicy(where: $where) {
      ...RlsPolicyFields
    }
  }

  ${RLS_POLICY}
`;

export const LIST_SESSION_PROPERTIES = gql`
  query SessionProperties {
    sessionProperties {
      ...SessionPropertyFields
    }
  }

  ${SESSION_PROPERTY}
`;

// ── RLS Policy Mutations ─────────────────────────────

export const CREATE_RLS_POLICY = gql`
  mutation CreateRlsPolicy($data: CreateRlsPolicyInput!) {
    createRlsPolicy(data: $data) {
      ...RlsPolicyFields
    }
  }

  ${RLS_POLICY}
`;

export const UPDATE_RLS_POLICY = gql`
  mutation UpdateRlsPolicy(
    $where: RlsPolicyWhereUniqueInput!
    $data: UpdateRlsPolicyInput!
  ) {
    updateRlsPolicy(where: $where, data: $data) {
      ...RlsPolicyFields
    }
  }

  ${RLS_POLICY}
`;

export const DELETE_RLS_POLICY = gql`
  mutation DeleteRlsPolicy($where: RlsPolicyWhereUniqueInput!) {
    deleteRlsPolicy(where: $where)
  }
`;

// ── Session Property Mutations ───────────────────────

export const CREATE_SESSION_PROPERTY = gql`
  mutation CreateSessionProperty($data: CreateSessionPropertyInput!) {
    createSessionProperty(data: $data) {
      ...SessionPropertyFields
    }
  }

  ${SESSION_PROPERTY}
`;

export const UPDATE_SESSION_PROPERTY = gql`
  mutation UpdateSessionProperty(
    $where: SessionPropertyWhereUniqueInput!
    $data: UpdateSessionPropertyInput!
  ) {
    updateSessionProperty(where: $where, data: $data) {
      ...SessionPropertyFields
    }
  }

  ${SESSION_PROPERTY}
`;

export const DELETE_SESSION_PROPERTY = gql`
  mutation DeleteSessionProperty($where: SessionPropertyWhereUniqueInput!) {
    deleteSessionProperty(where: $where)
  }
`;

// ── User Session Property Value Queries ──────────────

export const USER_SESSION_PROPERTY_VALUES = gql`
  query UserSessionPropertyValues($userId: Int!) {
    userSessionPropertyValues(userId: $userId) {
      id
      userId
      sessionPropertyId
      value
      createdAt
      updatedAt
    }
  }
`;

// ── User Session Property Value Mutations ────────────

export const ASSIGN_SESSION_PROPERTY_VALUES = gql`
  mutation AssignSessionPropertyValues(
    $data: [AssignSessionPropertyValueInput!]!
  ) {
    assignSessionPropertyValues(data: $data)
  }
`;
