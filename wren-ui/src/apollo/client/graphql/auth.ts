import { gql } from '@apollo/client';

export const ME = gql`
  query Me {
    me {
      id
      email
      displayName
      avatarUrl
      isActive
      lastLoginAt
      createdAt
    }
  }
`;

export const SIGNUP = gql`
  mutation Signup($data: SignupInput!) {
    signup(data: $data) {
      token
      user {
        id
        email
        displayName
        avatarUrl
        isActive
        createdAt
      }
    }
  }
`;

export const LOGIN = gql`
  mutation Login($data: LoginInput!) {
    login(data: $data) {
      token
      user {
        id
        email
        displayName
        avatarUrl
        isActive
        createdAt
      }
    }
  }
`;

export const LOGOUT = gql`
  mutation Logout {
    logout
  }
`;

export const LIST_ORGANIZATIONS = gql`
  query ListOrganizations {
    listOrganizations {
      id
      displayName
      slug
      logoUrl
      currentUserRole
      createdAt
      updatedAt
    }
  }
`;

export const GET_ORGANIZATION = gql`
  query GetOrganization($organizationId: Int!) {
    organization(organizationId: $organizationId) {
      id
      displayName
      slug
      logoUrl
      currentUserRole
      createdAt
      updatedAt
    }
  }
`;

export const ORGANIZATION_MEMBERS = gql`
  query OrganizationMembers($organizationId: Int!) {
    organizationMembers(organizationId: $organizationId) {
      id
      organizationId
      userId
      role
      user {
        id
        email
        displayName
        avatarUrl
      }
      createdAt
      updatedAt
    }
  }
`;

export const CREATE_ORGANIZATION = gql`
  mutation CreateOrganization($data: CreateOrganizationInput!) {
    createOrganization(data: $data) {
      id
      displayName
      slug
      logoUrl
      createdAt
      updatedAt
    }
  }
`;

export const UPDATE_ORGANIZATION = gql`
  mutation UpdateOrganization(
    $organizationId: Int!
    $data: UpdateOrganizationInput!
  ) {
    updateOrganization(organizationId: $organizationId, data: $data) {
      id
      displayName
      slug
      logoUrl
      createdAt
      updatedAt
    }
  }
`;

export const DELETE_ORGANIZATION = gql`
  mutation DeleteOrganization($organizationId: Int!) {
    deleteOrganization(organizationId: $organizationId)
  }
`;

export const INVITE_MEMBER = gql`
  mutation InviteMember($data: InviteMemberInput!) {
    inviteMember(data: $data) {
      id
      organizationId
      email
      role
      token
      expiresAt
      createdAt
    }
  }
`;

export const ACCEPT_INVITATION = gql`
  mutation AcceptInvitation($token: String!) {
    acceptInvitation(token: $token) {
      id
      organizationId
      userId
      role
      createdAt
    }
  }
`;

export const UPDATE_MEMBER_ROLE = gql`
  mutation UpdateMemberRole($data: UpdateMemberRoleInput!) {
    updateMemberRole(data: $data) {
      id
      organizationId
      userId
      role
    }
  }
`;

export const REMOVE_MEMBER = gql`
  mutation RemoveMember($memberId: Int!) {
    removeMember(memberId: $memberId)
  }
`;
