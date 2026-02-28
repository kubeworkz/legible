import * as Types from './__types__';

import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
const defaultOptions = {} as const;

// ── Fragment Types ───────────────────────────────────

export type RlsPolicyFieldsFragment = {
  __typename?: 'RlsPolicy';
  id: number;
  projectId: number;
  name: string;
  condition: string;
  modelIds: Array<number>;
  sessionPropertyIds: Array<number>;
  createdAt: string;
  updatedAt: string;
};

export type SessionPropertyFieldsFragment = {
  __typename?: 'SessionProperty';
  id: number;
  projectId: number;
  name: string;
  type: string;
  required: boolean;
  defaultExpr?: string | null;
  createdAt: string;
  updatedAt: string;
};

// ── RLS Policy Query Types ───────────────────────────

export type RlsPoliciesQueryVariables = Types.Exact<{ [key: string]: never }>;

export type RlsPoliciesQuery = {
  __typename?: 'Query';
  rlsPolicies: Array<{
    __typename?: 'RlsPolicy';
    id: number;
    projectId: number;
    name: string;
    condition: string;
    modelIds: Array<number>;
    sessionPropertyIds: Array<number>;
    createdAt: string;
    updatedAt: string;
  }>;
};

export type RlsPolicyQueryVariables = Types.Exact<{
  where: Types.RlsPolicyWhereUniqueInput;
}>;

export type RlsPolicyQuery = {
  __typename?: 'Query';
  rlsPolicy: {
    __typename?: 'RlsPolicy';
    id: number;
    projectId: number;
    name: string;
    condition: string;
    modelIds: Array<number>;
    sessionPropertyIds: Array<number>;
    createdAt: string;
    updatedAt: string;
  };
};

// ── Session Property Query Types ─────────────────────

export type SessionPropertiesQueryVariables = Types.Exact<{
  [key: string]: never;
}>;

export type SessionPropertiesQuery = {
  __typename?: 'Query';
  sessionProperties: Array<{
    __typename?: 'SessionProperty';
    id: number;
    projectId: number;
    name: string;
    type: string;
    required: boolean;
    defaultExpr?: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
};

// ── RLS Policy Mutation Types ────────────────────────

export type CreateRlsPolicyMutationVariables = Types.Exact<{
  data: Types.CreateRlsPolicyInput;
}>;

export type CreateRlsPolicyMutation = {
  __typename?: 'Mutation';
  createRlsPolicy: {
    __typename?: 'RlsPolicy';
    id: number;
    projectId: number;
    name: string;
    condition: string;
    modelIds: Array<number>;
    sessionPropertyIds: Array<number>;
    createdAt: string;
    updatedAt: string;
  };
};

export type UpdateRlsPolicyMutationVariables = Types.Exact<{
  where: Types.RlsPolicyWhereUniqueInput;
  data: Types.UpdateRlsPolicyInput;
}>;

export type UpdateRlsPolicyMutation = {
  __typename?: 'Mutation';
  updateRlsPolicy: {
    __typename?: 'RlsPolicy';
    id: number;
    projectId: number;
    name: string;
    condition: string;
    modelIds: Array<number>;
    sessionPropertyIds: Array<number>;
    createdAt: string;
    updatedAt: string;
  };
};

export type DeleteRlsPolicyMutationVariables = Types.Exact<{
  where: Types.RlsPolicyWhereUniqueInput;
}>;

export type DeleteRlsPolicyMutation = {
  __typename?: 'Mutation';
  deleteRlsPolicy: boolean;
};

// ── Session Property Mutation Types ──────────────────

export type CreateSessionPropertyMutationVariables = Types.Exact<{
  data: Types.CreateSessionPropertyInput;
}>;

export type CreateSessionPropertyMutation = {
  __typename?: 'Mutation';
  createSessionProperty: {
    __typename?: 'SessionProperty';
    id: number;
    projectId: number;
    name: string;
    type: string;
    required: boolean;
    defaultExpr?: string | null;
    createdAt: string;
    updatedAt: string;
  };
};

export type UpdateSessionPropertyMutationVariables = Types.Exact<{
  where: Types.SessionPropertyWhereUniqueInput;
  data: Types.UpdateSessionPropertyInput;
}>;

export type UpdateSessionPropertyMutation = {
  __typename?: 'Mutation';
  updateSessionProperty: {
    __typename?: 'SessionProperty';
    id: number;
    projectId: number;
    name: string;
    type: string;
    required: boolean;
    defaultExpr?: string | null;
    createdAt: string;
    updatedAt: string;
  };
};

export type DeleteSessionPropertyMutationVariables = Types.Exact<{
  where: Types.SessionPropertyWhereUniqueInput;
}>;

export type DeleteSessionPropertyMutation = {
  __typename?: 'Mutation';
  deleteSessionProperty: boolean;
};

// ── Fragment Docs ────────────────────────────────────

export const RlsPolicyFieldsFragmentDoc = gql`
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

export const SessionPropertyFieldsFragmentDoc = gql`
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

// ── RLS Policy Query Documents & Hooks ───────────────

export const RlsPoliciesDocument = gql`
  query RlsPolicies {
    rlsPolicies {
      ...RlsPolicyFields
    }
  }
  ${RlsPolicyFieldsFragmentDoc}
`;

export function useRlsPoliciesQuery(
  baseOptions?: Apollo.QueryHookOptions<
    RlsPoliciesQuery,
    RlsPoliciesQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<RlsPoliciesQuery, RlsPoliciesQueryVariables>(
    RlsPoliciesDocument,
    options,
  );
}
export function useRlsPoliciesLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    RlsPoliciesQuery,
    RlsPoliciesQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<RlsPoliciesQuery, RlsPoliciesQueryVariables>(
    RlsPoliciesDocument,
    options,
  );
}
export type RlsPoliciesQueryHookResult = ReturnType<typeof useRlsPoliciesQuery>;
export type RlsPoliciesLazyQueryHookResult = ReturnType<
  typeof useRlsPoliciesLazyQuery
>;
export type RlsPoliciesQueryResult = Apollo.QueryResult<
  RlsPoliciesQuery,
  RlsPoliciesQueryVariables
>;

export const RlsPolicyDocument = gql`
  query RlsPolicy($where: RlsPolicyWhereUniqueInput!) {
    rlsPolicy(where: $where) {
      ...RlsPolicyFields
    }
  }
  ${RlsPolicyFieldsFragmentDoc}
`;

export function useRlsPolicyQuery(
  baseOptions: Apollo.QueryHookOptions<
    RlsPolicyQuery,
    RlsPolicyQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<RlsPolicyQuery, RlsPolicyQueryVariables>(
    RlsPolicyDocument,
    options,
  );
}
export type RlsPolicyQueryHookResult = ReturnType<typeof useRlsPolicyQuery>;
export type RlsPolicyQueryResult = Apollo.QueryResult<
  RlsPolicyQuery,
  RlsPolicyQueryVariables
>;

// ── Session Property Query Documents & Hooks ─────────

export const SessionPropertiesDocument = gql`
  query SessionProperties {
    sessionProperties {
      ...SessionPropertyFields
    }
  }
  ${SessionPropertyFieldsFragmentDoc}
`;

export function useSessionPropertiesQuery(
  baseOptions?: Apollo.QueryHookOptions<
    SessionPropertiesQuery,
    SessionPropertiesQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<
    SessionPropertiesQuery,
    SessionPropertiesQueryVariables
  >(SessionPropertiesDocument, options);
}
export function useSessionPropertiesLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    SessionPropertiesQuery,
    SessionPropertiesQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<
    SessionPropertiesQuery,
    SessionPropertiesQueryVariables
  >(SessionPropertiesDocument, options);
}
export type SessionPropertiesQueryHookResult = ReturnType<
  typeof useSessionPropertiesQuery
>;
export type SessionPropertiesLazyQueryHookResult = ReturnType<
  typeof useSessionPropertiesLazyQuery
>;
export type SessionPropertiesQueryResult = Apollo.QueryResult<
  SessionPropertiesQuery,
  SessionPropertiesQueryVariables
>;

// ── RLS Policy Mutation Documents & Hooks ────────────

export const CreateRlsPolicyDocument = gql`
  mutation CreateRlsPolicy($data: CreateRlsPolicyInput!) {
    createRlsPolicy(data: $data) {
      ...RlsPolicyFields
    }
  }
  ${RlsPolicyFieldsFragmentDoc}
`;
export type CreateRlsPolicyMutationFn = Apollo.MutationFunction<
  CreateRlsPolicyMutation,
  CreateRlsPolicyMutationVariables
>;

export function useCreateRlsPolicyMutation(
  baseOptions?: Apollo.MutationHookOptions<
    CreateRlsPolicyMutation,
    CreateRlsPolicyMutationVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<
    CreateRlsPolicyMutation,
    CreateRlsPolicyMutationVariables
  >(CreateRlsPolicyDocument, options);
}
export type CreateRlsPolicyMutationHookResult = ReturnType<
  typeof useCreateRlsPolicyMutation
>;
export type CreateRlsPolicyMutationResult =
  Apollo.MutationResult<CreateRlsPolicyMutation>;
export type CreateRlsPolicyMutationOptions = Apollo.BaseMutationOptions<
  CreateRlsPolicyMutation,
  CreateRlsPolicyMutationVariables
>;

export const UpdateRlsPolicyDocument = gql`
  mutation UpdateRlsPolicy(
    $where: RlsPolicyWhereUniqueInput!
    $data: UpdateRlsPolicyInput!
  ) {
    updateRlsPolicy(where: $where, data: $data) {
      ...RlsPolicyFields
    }
  }
  ${RlsPolicyFieldsFragmentDoc}
`;
export type UpdateRlsPolicyMutationFn = Apollo.MutationFunction<
  UpdateRlsPolicyMutation,
  UpdateRlsPolicyMutationVariables
>;

export function useUpdateRlsPolicyMutation(
  baseOptions?: Apollo.MutationHookOptions<
    UpdateRlsPolicyMutation,
    UpdateRlsPolicyMutationVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<
    UpdateRlsPolicyMutation,
    UpdateRlsPolicyMutationVariables
  >(UpdateRlsPolicyDocument, options);
}
export type UpdateRlsPolicyMutationHookResult = ReturnType<
  typeof useUpdateRlsPolicyMutation
>;
export type UpdateRlsPolicyMutationResult =
  Apollo.MutationResult<UpdateRlsPolicyMutation>;
export type UpdateRlsPolicyMutationOptions = Apollo.BaseMutationOptions<
  UpdateRlsPolicyMutation,
  UpdateRlsPolicyMutationVariables
>;

export const DeleteRlsPolicyDocument = gql`
  mutation DeleteRlsPolicy($where: RlsPolicyWhereUniqueInput!) {
    deleteRlsPolicy(where: $where)
  }
`;
export type DeleteRlsPolicyMutationFn = Apollo.MutationFunction<
  DeleteRlsPolicyMutation,
  DeleteRlsPolicyMutationVariables
>;

export function useDeleteRlsPolicyMutation(
  baseOptions?: Apollo.MutationHookOptions<
    DeleteRlsPolicyMutation,
    DeleteRlsPolicyMutationVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<
    DeleteRlsPolicyMutation,
    DeleteRlsPolicyMutationVariables
  >(DeleteRlsPolicyDocument, options);
}
export type DeleteRlsPolicyMutationHookResult = ReturnType<
  typeof useDeleteRlsPolicyMutation
>;
export type DeleteRlsPolicyMutationResult =
  Apollo.MutationResult<DeleteRlsPolicyMutation>;
export type DeleteRlsPolicyMutationOptions = Apollo.BaseMutationOptions<
  DeleteRlsPolicyMutation,
  DeleteRlsPolicyMutationVariables
>;

// ── Session Property Mutation Documents & Hooks ──────

export const CreateSessionPropertyDocument = gql`
  mutation CreateSessionProperty($data: CreateSessionPropertyInput!) {
    createSessionProperty(data: $data) {
      ...SessionPropertyFields
    }
  }
  ${SessionPropertyFieldsFragmentDoc}
`;
export type CreateSessionPropertyMutationFn = Apollo.MutationFunction<
  CreateSessionPropertyMutation,
  CreateSessionPropertyMutationVariables
>;

export function useCreateSessionPropertyMutation(
  baseOptions?: Apollo.MutationHookOptions<
    CreateSessionPropertyMutation,
    CreateSessionPropertyMutationVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<
    CreateSessionPropertyMutation,
    CreateSessionPropertyMutationVariables
  >(CreateSessionPropertyDocument, options);
}
export type CreateSessionPropertyMutationHookResult = ReturnType<
  typeof useCreateSessionPropertyMutation
>;
export type CreateSessionPropertyMutationResult =
  Apollo.MutationResult<CreateSessionPropertyMutation>;
export type CreateSessionPropertyMutationOptions = Apollo.BaseMutationOptions<
  CreateSessionPropertyMutation,
  CreateSessionPropertyMutationVariables
>;

export const UpdateSessionPropertyDocument = gql`
  mutation UpdateSessionProperty(
    $where: SessionPropertyWhereUniqueInput!
    $data: UpdateSessionPropertyInput!
  ) {
    updateSessionProperty(where: $where, data: $data) {
      ...SessionPropertyFields
    }
  }
  ${SessionPropertyFieldsFragmentDoc}
`;
export type UpdateSessionPropertyMutationFn = Apollo.MutationFunction<
  UpdateSessionPropertyMutation,
  UpdateSessionPropertyMutationVariables
>;

export function useUpdateSessionPropertyMutation(
  baseOptions?: Apollo.MutationHookOptions<
    UpdateSessionPropertyMutation,
    UpdateSessionPropertyMutationVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<
    UpdateSessionPropertyMutation,
    UpdateSessionPropertyMutationVariables
  >(UpdateSessionPropertyDocument, options);
}
export type UpdateSessionPropertyMutationHookResult = ReturnType<
  typeof useUpdateSessionPropertyMutation
>;
export type UpdateSessionPropertyMutationResult =
  Apollo.MutationResult<UpdateSessionPropertyMutation>;
export type UpdateSessionPropertyMutationOptions = Apollo.BaseMutationOptions<
  UpdateSessionPropertyMutation,
  UpdateSessionPropertyMutationVariables
>;

export const DeleteSessionPropertyDocument = gql`
  mutation DeleteSessionProperty($where: SessionPropertyWhereUniqueInput!) {
    deleteSessionProperty(where: $where)
  }
`;
export type DeleteSessionPropertyMutationFn = Apollo.MutationFunction<
  DeleteSessionPropertyMutation,
  DeleteSessionPropertyMutationVariables
>;

export function useDeleteSessionPropertyMutation(
  baseOptions?: Apollo.MutationHookOptions<
    DeleteSessionPropertyMutation,
    DeleteSessionPropertyMutationVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<
    DeleteSessionPropertyMutation,
    DeleteSessionPropertyMutationVariables
  >(DeleteSessionPropertyDocument, options);
}
export type DeleteSessionPropertyMutationHookResult = ReturnType<
  typeof useDeleteSessionPropertyMutation
>;
export type DeleteSessionPropertyMutationResult =
  Apollo.MutationResult<DeleteSessionPropertyMutation>;
export type DeleteSessionPropertyMutationOptions = Apollo.BaseMutationOptions<
  DeleteSessionPropertyMutation,
  DeleteSessionPropertyMutationVariables
>;
