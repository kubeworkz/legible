import { gql } from '@apollo/client';

export const OIDC_PROVIDERS = gql`
  query OidcProviders {
    oidcProviders {
      slug
      displayName
      issuerUrl
      emailDomainFilter
      enabled
    }
  }
`;

export const OIDC_AUTH_URL = gql`
  mutation OidcAuthUrl($providerSlug: String!, $callbackUrl: String!) {
    oidcAuthUrl(providerSlug: $providerSlug, callbackUrl: $callbackUrl) {
      url
      state
      nonce
    }
  }
`;

export const OIDC_CALLBACK = gql`
  mutation OidcCallback(
    $providerSlug: String!
    $code: String!
    $state: String!
    $nonce: String!
    $callbackUrl: String!
  ) {
    oidcCallback(
      providerSlug: $providerSlug
      code: $code
      state: $state
      nonce: $nonce
      callbackUrl: $callbackUrl
    ) {
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

export const LINKED_IDENTITIES = gql`
  query LinkedIdentities {
    linkedIdentities {
      id
      providerSlug
      email
      displayName
      avatarUrl
      createdAt
    }
  }
`;

export const UNLINK_IDENTITY = gql`
  mutation UnlinkIdentity($identityId: Int!) {
    unlinkIdentity(identityId: $identityId)
  }
`;
