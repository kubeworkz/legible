import * as Types from './__types__';

import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
const defaultOptions = {} as const;

// ── Fragment ────────────────────────────────────────────────

export type FolderFieldsFragment = {
  __typename?: 'Folder';
  id: number;
  projectId: number;
  name: string;
  type: Types.FolderType;
  ownerId: number;
  visibility: Types.FolderVisibility;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

// ── Query types ────────────────────────────────────────────

export type FoldersQueryVariables = Types.Exact<{ [key: string]: never }>;

export type FoldersQuery = {
  __typename?: 'Query';
  folders: Array<FolderFieldsFragment>;
};

export type FolderQueryVariables = Types.Exact<{
  where: Types.FolderWhereInput;
}>;

export type FolderQuery = {
  __typename?: 'Query';
  folder: FolderFieldsFragment & {
    access: Array<{
      __typename?: 'FolderAccess';
      id: number;
      folderId: number;
      userId: number;
      role: Types.FolderAccessRole;
      createdAt: string;
      updatedAt: string;
    }>;
  };
};

// ── Mutation types ─────────────────────────────────────────

export type CreateFolderMutationVariables = Types.Exact<{
  data: Types.CreateFolderInput;
}>;

export type CreateFolderMutation = {
  __typename?: 'Mutation';
  createFolder: FolderFieldsFragment;
};

export type UpdateFolderMutationVariables = Types.Exact<{
  where: Types.FolderWhereInput;
  data: Types.UpdateFolderInput;
}>;

export type UpdateFolderMutation = {
  __typename?: 'Mutation';
  updateFolder: FolderFieldsFragment;
};

export type DeleteFolderMutationVariables = Types.Exact<{
  where: Types.FolderWhereInput;
}>;

export type DeleteFolderMutation = {
  __typename?: 'Mutation';
  deleteFolder: boolean;
};

export type EnsureSystemFoldersMutationVariables = Types.Exact<{
  [key: string]: never;
}>;

export type EnsureSystemFoldersMutation = {
  __typename?: 'Mutation';
  ensureSystemFolders: {
    __typename?: 'SystemFolders';
    personal: FolderFieldsFragment;
    public: FolderFieldsFragment;
  };
};

export type MoveDashboardToFolderMutationVariables = Types.Exact<{
  data: Types.MoveDashboardToFolderInput;
}>;

export type MoveDashboardToFolderMutation = {
  __typename?: 'Mutation';
  moveDashboardToFolder: boolean;
};

export type MoveThreadToFolderMutationVariables = Types.Exact<{
  data: Types.MoveThreadToFolderInput;
}>;

export type MoveThreadToFolderMutation = {
  __typename?: 'Mutation';
  moveThreadToFolder: boolean;
};

// ── Documents ──────────────────────────────────────────────

export const FolderFieldsFragmentDoc = gql`
  fragment FolderFields on Folder {
    id
    projectId
    name
    type
    ownerId
    visibility
    sortOrder
    createdAt
    updatedAt
  }
`;

export const FoldersDocument = gql`
  query Folders {
    folders {
      ...FolderFields
    }
  }
  ${FolderFieldsFragmentDoc}
`;

export const FolderDocument = gql`
  query Folder($where: FolderWhereInput!) {
    folder(where: $where) {
      ...FolderFields
      access {
        id
        folderId
        userId
        role
        createdAt
        updatedAt
      }
    }
  }
  ${FolderFieldsFragmentDoc}
`;

export const CreateFolderDocument = gql`
  mutation CreateFolder($data: CreateFolderInput!) {
    createFolder(data: $data) {
      ...FolderFields
    }
  }
  ${FolderFieldsFragmentDoc}
`;

export const UpdateFolderDocument = gql`
  mutation UpdateFolder($where: FolderWhereInput!, $data: UpdateFolderInput!) {
    updateFolder(where: $where, data: $data) {
      ...FolderFields
    }
  }
  ${FolderFieldsFragmentDoc}
`;

export const DeleteFolderDocument = gql`
  mutation DeleteFolder($where: FolderWhereInput!) {
    deleteFolder(where: $where)
  }
`;

export const EnsureSystemFoldersDocument = gql`
  mutation EnsureSystemFolders {
    ensureSystemFolders {
      personal {
        ...FolderFields
      }
      public {
        ...FolderFields
      }
    }
  }
  ${FolderFieldsFragmentDoc}
`;

export const MoveDashboardToFolderDocument = gql`
  mutation MoveDashboardToFolder($data: MoveDashboardToFolderInput!) {
    moveDashboardToFolder(data: $data)
  }
`;

export const MoveThreadToFolderDocument = gql`
  mutation MoveThreadToFolder($data: MoveThreadToFolderInput!) {
    moveThreadToFolder(data: $data)
  }
`;

// ── Query Hooks ────────────────────────────────────────────

export function useFoldersQuery(
  baseOptions?: Apollo.QueryHookOptions<FoldersQuery, FoldersQueryVariables>,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<FoldersQuery, FoldersQueryVariables>(
    FoldersDocument,
    options,
  );
}

export function useFoldersLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    FoldersQuery,
    FoldersQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<FoldersQuery, FoldersQueryVariables>(
    FoldersDocument,
    options,
  );
}

export type FoldersQueryHookResult = ReturnType<typeof useFoldersQuery>;
export type FoldersLazyQueryHookResult = ReturnType<typeof useFoldersLazyQuery>;
export type FoldersQueryResult = Apollo.QueryResult<
  FoldersQuery,
  FoldersQueryVariables
>;

export function useFolderQuery(
  baseOptions: Apollo.QueryHookOptions<FolderQuery, FolderQueryVariables>,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<FolderQuery, FolderQueryVariables>(
    FolderDocument,
    options,
  );
}

export function useFolderLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    FolderQuery,
    FolderQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<FolderQuery, FolderQueryVariables>(
    FolderDocument,
    options,
  );
}

export type FolderQueryHookResult = ReturnType<typeof useFolderQuery>;
export type FolderLazyQueryHookResult = ReturnType<typeof useFolderLazyQuery>;
export type FolderQueryResult = Apollo.QueryResult<
  FolderQuery,
  FolderQueryVariables
>;

// ── Mutation Hooks ─────────────────────────────────────────

export type CreateFolderMutationFn = Apollo.MutationFunction<
  CreateFolderMutation,
  CreateFolderMutationVariables
>;

export function useCreateFolderMutation(
  baseOptions?: Apollo.MutationHookOptions<
    CreateFolderMutation,
    CreateFolderMutationVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<
    CreateFolderMutation,
    CreateFolderMutationVariables
  >(CreateFolderDocument, options);
}

export type CreateFolderMutationHookResult = ReturnType<
  typeof useCreateFolderMutation
>;

export type UpdateFolderMutationFn = Apollo.MutationFunction<
  UpdateFolderMutation,
  UpdateFolderMutationVariables
>;

export function useUpdateFolderMutation(
  baseOptions?: Apollo.MutationHookOptions<
    UpdateFolderMutation,
    UpdateFolderMutationVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<
    UpdateFolderMutation,
    UpdateFolderMutationVariables
  >(UpdateFolderDocument, options);
}

export type UpdateFolderMutationHookResult = ReturnType<
  typeof useUpdateFolderMutation
>;

export type DeleteFolderMutationFn = Apollo.MutationFunction<
  DeleteFolderMutation,
  DeleteFolderMutationVariables
>;

export function useDeleteFolderMutation(
  baseOptions?: Apollo.MutationHookOptions<
    DeleteFolderMutation,
    DeleteFolderMutationVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<
    DeleteFolderMutation,
    DeleteFolderMutationVariables
  >(DeleteFolderDocument, options);
}

export type DeleteFolderMutationHookResult = ReturnType<
  typeof useDeleteFolderMutation
>;

export type EnsureSystemFoldersMutationFn = Apollo.MutationFunction<
  EnsureSystemFoldersMutation,
  EnsureSystemFoldersMutationVariables
>;

export function useEnsureSystemFoldersMutation(
  baseOptions?: Apollo.MutationHookOptions<
    EnsureSystemFoldersMutation,
    EnsureSystemFoldersMutationVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<
    EnsureSystemFoldersMutation,
    EnsureSystemFoldersMutationVariables
  >(EnsureSystemFoldersDocument, options);
}

export type EnsureSystemFoldersMutationHookResult = ReturnType<
  typeof useEnsureSystemFoldersMutation
>;

export type MoveDashboardToFolderMutationFn = Apollo.MutationFunction<
  MoveDashboardToFolderMutation,
  MoveDashboardToFolderMutationVariables
>;

export function useMoveDashboardToFolderMutation(
  baseOptions?: Apollo.MutationHookOptions<
    MoveDashboardToFolderMutation,
    MoveDashboardToFolderMutationVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<
    MoveDashboardToFolderMutation,
    MoveDashboardToFolderMutationVariables
  >(MoveDashboardToFolderDocument, options);
}

export type MoveDashboardToFolderMutationHookResult = ReturnType<
  typeof useMoveDashboardToFolderMutation
>;

export type MoveThreadToFolderMutationFn = Apollo.MutationFunction<
  MoveThreadToFolderMutation,
  MoveThreadToFolderMutationVariables
>;

export function useMoveThreadToFolderMutation(
  baseOptions?: Apollo.MutationHookOptions<
    MoveThreadToFolderMutation,
    MoveThreadToFolderMutationVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<
    MoveThreadToFolderMutation,
    MoveThreadToFolderMutationVariables
  >(MoveThreadToFolderDocument, options);
}

export type MoveThreadToFolderMutationHookResult = ReturnType<
  typeof useMoveThreadToFolderMutation
>;
