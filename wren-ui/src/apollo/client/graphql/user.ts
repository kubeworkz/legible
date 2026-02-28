import { gql } from '@apollo/client';

export const UPDATE_PROFILE = gql`
  mutation UpdateProfile($data: UpdateProfileInput!) {
    updateProfile(data: $data) {
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

export const CHANGE_PASSWORD = gql`
  mutation ChangePassword($data: ChangePasswordInput!) {
    changePassword(data: $data)
  }
`;

export const DELETE_ACCOUNT = gql`
  mutation DeleteAccount {
    deleteAccount
  }
`;
