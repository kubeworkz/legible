import { gql } from '@apollo/client';

export const ME = gql`
  query Me {
    me {
      id
      email
      displayName
      avatarUrl
      isActive
      isSuperadmin
      emailVerified
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
        emailVerified
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
        emailVerified
        createdAt
      }
    }
  }
`;

export const LOGOUT = gql`
  mutation Logout {
    logout {
      success
      endSessionUrl
    }
  }
`;

export const VERIFY_EMAIL = gql`
  mutation VerifyEmail($token: String!) {
    verifyEmail(token: $token)
  }
`;

export const RESEND_VERIFICATION_EMAIL = gql`
  mutation ResendVerificationEmail {
    resendVerificationEmail
  }
`;

export const REQUEST_MAGIC_LINK = gql`
  mutation RequestMagicLink($email: String!) {
    requestMagicLink(email: $email)
  }
`;

export const LOGIN_WITH_MAGIC_LINK = gql`
  mutation LoginWithMagicLink($token: String!) {
    loginWithMagicLink(token: $token) {
      token
      user {
        id
        email
        displayName
        avatarUrl
        isActive
        emailVerified
        createdAt
      }
    }
  }
`;

export const LIST_ORGANIZATIONS = gql`
  query ListOrganizations {
    listOrganizations {
      id
      displayName
      slug
      logoUrl
      timezone
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
      timezone
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
      timezone
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
      timezone
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
