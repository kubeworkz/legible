import * as Types from './__types__';

import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
const defaultOptions = {} as const;

export type SpreadsheetsQueryVariables = Types.Exact<{
  folderId?: Types.InputMaybe<Types.Scalars['Int']>;
}>;

export type SpreadsheetsQuery = { __typename?: 'Query', spreadsheets: Array<{ __typename?: 'Spreadsheet', id: number, projectId: number, name: string, description?: string | null, folderId?: number | null, sortOrder: number, sourceSql?: string | null, creatorName?: string | null, createdAt?: string | null, updatedAt?: string | null }> };

export type SpreadsheetQueryVariables = Types.Exact<{
  where: Types.SpreadsheetWhereInput;
}>;

export type SpreadsheetQuery = { __typename?: 'Query', spreadsheet: { __typename?: 'Spreadsheet', id: number, projectId: number, name: string, description?: string | null, folderId?: number | null, sortOrder: number, sourceSql?: string | null, columnsMetadata?: string | null, creatorName?: string | null, createdAt?: string | null, updatedAt?: string | null } };

export type CreateSpreadsheetMutationVariables = Types.Exact<{
  data: Types.CreateSpreadsheetInput;
}>;

export type CreateSpreadsheetMutation = { __typename?: 'Mutation', createSpreadsheet: { __typename?: 'Spreadsheet', id: number, projectId: number, name: string, description?: string | null, folderId?: number | null, sortOrder: number, sourceSql?: string | null } };

export type UpdateSpreadsheetMutationVariables = Types.Exact<{
  where: Types.SpreadsheetWhereInput;
  data: Types.UpdateSpreadsheetInput;
}>;

export type UpdateSpreadsheetMutation = { __typename?: 'Mutation', updateSpreadsheet: { __typename?: 'Spreadsheet', id: number, projectId: number, name: string, description?: string | null, sortOrder: number, sourceSql?: string | null } };

export type DeleteSpreadsheetMutationVariables = Types.Exact<{
  where: Types.SpreadsheetWhereInput;
}>;

export type DeleteSpreadsheetMutation = { __typename?: 'Mutation', deleteSpreadsheet: boolean };

export type PreviewSpreadsheetDataMutationVariables = Types.Exact<{
  data: Types.PreviewSpreadsheetDataInput;
}>;

export type PreviewSpreadsheetDataMutation = { __typename?: 'Mutation', previewSpreadsheetData: any };

// --- Spreadsheets list ---
export const SpreadsheetsDocument = gql`
    query Spreadsheets($folderId: Int) {
  spreadsheets(folderId: $folderId) {
    id
    projectId
    name
    description
    folderId
    sortOrder
    sourceSql
    creatorName
    createdAt
    updatedAt
  }
}
    `;

export function useSpreadsheetsQuery(baseOptions?: Apollo.QueryHookOptions<SpreadsheetsQuery, SpreadsheetsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<SpreadsheetsQuery, SpreadsheetsQueryVariables>(SpreadsheetsDocument, options);
      }
export function useSpreadsheetsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<SpreadsheetsQuery, SpreadsheetsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<SpreadsheetsQuery, SpreadsheetsQueryVariables>(SpreadsheetsDocument, options);
        }
export type SpreadsheetsQueryHookResult = ReturnType<typeof useSpreadsheetsQuery>;
export type SpreadsheetsLazyQueryHookResult = ReturnType<typeof useSpreadsheetsLazyQuery>;
export type SpreadsheetsQueryResult = Apollo.QueryResult<SpreadsheetsQuery, SpreadsheetsQueryVariables>;

// --- Get single Spreadsheet ---
export const SpreadsheetDocument = gql`
    query Spreadsheet($where: SpreadsheetWhereInput!) {
  spreadsheet(where: $where) {
    id
    projectId
    name
    description
    folderId
    sortOrder
    sourceSql
    columnsMetadata
    creatorName
    createdAt
    updatedAt
  }
}
    `;

export function useSpreadsheetQuery(baseOptions: Apollo.QueryHookOptions<SpreadsheetQuery, SpreadsheetQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<SpreadsheetQuery, SpreadsheetQueryVariables>(SpreadsheetDocument, options);
      }
export function useSpreadsheetLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<SpreadsheetQuery, SpreadsheetQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<SpreadsheetQuery, SpreadsheetQueryVariables>(SpreadsheetDocument, options);
        }
export type SpreadsheetQueryHookResult = ReturnType<typeof useSpreadsheetQuery>;
export type SpreadsheetLazyQueryHookResult = ReturnType<typeof useSpreadsheetLazyQuery>;
export type SpreadsheetQueryResult = Apollo.QueryResult<SpreadsheetQuery, SpreadsheetQueryVariables>;

// --- Create Spreadsheet ---
export const CreateSpreadsheetDocument = gql`
    mutation CreateSpreadsheet($data: CreateSpreadsheetInput!) {
  createSpreadsheet(data: $data) {
    id
    projectId
    name
    description
    folderId
    sortOrder
    sourceSql
  }
}
    `;
export type CreateSpreadsheetMutationFn = Apollo.MutationFunction<CreateSpreadsheetMutation, CreateSpreadsheetMutationVariables>;

export function useCreateSpreadsheetMutation(baseOptions?: Apollo.MutationHookOptions<CreateSpreadsheetMutation, CreateSpreadsheetMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateSpreadsheetMutation, CreateSpreadsheetMutationVariables>(CreateSpreadsheetDocument, options);
      }
export type CreateSpreadsheetMutationHookResult = ReturnType<typeof useCreateSpreadsheetMutation>;
export type CreateSpreadsheetMutationResult = Apollo.MutationResult<CreateSpreadsheetMutation>;
export type CreateSpreadsheetMutationOptions = Apollo.BaseMutationOptions<CreateSpreadsheetMutation, CreateSpreadsheetMutationVariables>;

// --- Update Spreadsheet ---
export const UpdateSpreadsheetDocument = gql`
    mutation UpdateSpreadsheet($where: SpreadsheetWhereInput!, $data: UpdateSpreadsheetInput!) {
  updateSpreadsheet(where: $where, data: $data) {
    id
    projectId
    name
    description
    sortOrder
    sourceSql
  }
}
    `;
export type UpdateSpreadsheetMutationFn = Apollo.MutationFunction<UpdateSpreadsheetMutation, UpdateSpreadsheetMutationVariables>;

export function useUpdateSpreadsheetMutation(baseOptions?: Apollo.MutationHookOptions<UpdateSpreadsheetMutation, UpdateSpreadsheetMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateSpreadsheetMutation, UpdateSpreadsheetMutationVariables>(UpdateSpreadsheetDocument, options);
      }
export type UpdateSpreadsheetMutationHookResult = ReturnType<typeof useUpdateSpreadsheetMutation>;
export type UpdateSpreadsheetMutationResult = Apollo.MutationResult<UpdateSpreadsheetMutation>;
export type UpdateSpreadsheetMutationOptions = Apollo.BaseMutationOptions<UpdateSpreadsheetMutation, UpdateSpreadsheetMutationVariables>;

// --- Delete Spreadsheet ---
export const DeleteSpreadsheetDocument = gql`
    mutation DeleteSpreadsheet($where: SpreadsheetWhereInput!) {
  deleteSpreadsheet(where: $where)
}
    `;
export type DeleteSpreadsheetMutationFn = Apollo.MutationFunction<DeleteSpreadsheetMutation, DeleteSpreadsheetMutationVariables>;

export function useDeleteSpreadsheetMutation(baseOptions?: Apollo.MutationHookOptions<DeleteSpreadsheetMutation, DeleteSpreadsheetMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteSpreadsheetMutation, DeleteSpreadsheetMutationVariables>(DeleteSpreadsheetDocument, options);
      }
export type DeleteSpreadsheetMutationHookResult = ReturnType<typeof useDeleteSpreadsheetMutation>;
export type DeleteSpreadsheetMutationResult = Apollo.MutationResult<DeleteSpreadsheetMutation>;
export type DeleteSpreadsheetMutationOptions = Apollo.BaseMutationOptions<DeleteSpreadsheetMutation, DeleteSpreadsheetMutationVariables>;

// --- Preview Spreadsheet Data ---
export const PreviewSpreadsheetDataDocument = gql`
    mutation PreviewSpreadsheetData($data: PreviewSpreadsheetDataInput!) {
  previewSpreadsheetData(data: $data)
}
    `;
export type PreviewSpreadsheetDataMutationFn = Apollo.MutationFunction<PreviewSpreadsheetDataMutation, PreviewSpreadsheetDataMutationVariables>;

export function usePreviewSpreadsheetDataMutation(baseOptions?: Apollo.MutationHookOptions<PreviewSpreadsheetDataMutation, PreviewSpreadsheetDataMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<PreviewSpreadsheetDataMutation, PreviewSpreadsheetDataMutationVariables>(PreviewSpreadsheetDataDocument, options);
      }
export type PreviewSpreadsheetDataMutationHookResult = ReturnType<typeof usePreviewSpreadsheetDataMutation>;
export type PreviewSpreadsheetDataMutationResult = Apollo.MutationResult<PreviewSpreadsheetDataMutation>;
export type PreviewSpreadsheetDataMutationOptions = Apollo.BaseMutationOptions<PreviewSpreadsheetDataMutation, PreviewSpreadsheetDataMutationVariables>;

// --- Spreadsheet History ---
export type SpreadsheetHistoryQueryVariables = Types.Exact<{
  where: Types.SpreadsheetHistoryWhereInput;
}>;

export type SpreadsheetHistoryQuery = { __typename?: 'Query', spreadsheetHistory: Array<{ __typename?: 'SpreadsheetHistoryEntry', id: number, spreadsheetId: number, version: number, changeType: string, sourceSql?: string | null, columnsMetadata?: string | null, changeSummary?: string | null, createdAt: string }> };

export const SpreadsheetHistoryDocument = gql`
    query SpreadsheetHistory($where: SpreadsheetHistoryWhereInput!) {
  spreadsheetHistory(where: $where) {
    id
    spreadsheetId
    version
    changeType
    sourceSql
    columnsMetadata
    changeSummary
    createdAt
  }
}
    `;

export function useSpreadsheetHistoryQuery(baseOptions: Apollo.QueryHookOptions<SpreadsheetHistoryQuery, SpreadsheetHistoryQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<SpreadsheetHistoryQuery, SpreadsheetHistoryQueryVariables>(SpreadsheetHistoryDocument, options);
      }
export function useSpreadsheetHistoryLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<SpreadsheetHistoryQuery, SpreadsheetHistoryQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<SpreadsheetHistoryQuery, SpreadsheetHistoryQueryVariables>(SpreadsheetHistoryDocument, options);
        }
export type SpreadsheetHistoryQueryHookResult = ReturnType<typeof useSpreadsheetHistoryQuery>;
export type SpreadsheetHistoryLazyQueryHookResult = ReturnType<typeof useSpreadsheetHistoryLazyQuery>;
export type SpreadsheetHistoryQueryResult = Apollo.QueryResult<SpreadsheetHistoryQuery, SpreadsheetHistoryQueryVariables>;

// --- Save Spreadsheet With History ---
export type SaveSpreadsheetWithHistoryMutationVariables = Types.Exact<{
  data: Types.SaveSpreadsheetWithHistoryInput;
}>;

export type SaveSpreadsheetWithHistoryMutation = { __typename?: 'Mutation', saveSpreadsheetWithHistory: { __typename?: 'Spreadsheet', id: number, name: string, sourceSql?: string | null, columnsMetadata?: string | null, updatedAt?: string | null } };

export const SaveSpreadsheetWithHistoryDocument = gql`
    mutation SaveSpreadsheetWithHistory($data: SaveSpreadsheetWithHistoryInput!) {
  saveSpreadsheetWithHistory(data: $data) {
    id
    name
    sourceSql
    columnsMetadata
    updatedAt
  }
}
    `;
export type SaveSpreadsheetWithHistoryMutationFn = Apollo.MutationFunction<SaveSpreadsheetWithHistoryMutation, SaveSpreadsheetWithHistoryMutationVariables>;

export function useSaveSpreadsheetWithHistoryMutation(baseOptions?: Apollo.MutationHookOptions<SaveSpreadsheetWithHistoryMutation, SaveSpreadsheetWithHistoryMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<SaveSpreadsheetWithHistoryMutation, SaveSpreadsheetWithHistoryMutationVariables>(SaveSpreadsheetWithHistoryDocument, options);
      }
export type SaveSpreadsheetWithHistoryMutationHookResult = ReturnType<typeof useSaveSpreadsheetWithHistoryMutation>;
export type SaveSpreadsheetWithHistoryMutationResult = Apollo.MutationResult<SaveSpreadsheetWithHistoryMutation>;
export type SaveSpreadsheetWithHistoryMutationOptions = Apollo.BaseMutationOptions<SaveSpreadsheetWithHistoryMutation, SaveSpreadsheetWithHistoryMutationVariables>;

// --- Restore Spreadsheet Version ---
export type RestoreSpreadsheetVersionMutationVariables = Types.Exact<{
  data: Types.RestoreSpreadsheetVersionInput;
}>;

export type RestoreSpreadsheetVersionMutation = { __typename?: 'Mutation', restoreSpreadsheetVersion: { __typename?: 'Spreadsheet', id: number, name: string, sourceSql?: string | null, columnsMetadata?: string | null, updatedAt?: string | null } };

export const RestoreSpreadsheetVersionDocument = gql`
    mutation RestoreSpreadsheetVersion($data: RestoreSpreadsheetVersionInput!) {
  restoreSpreadsheetVersion(data: $data) {
    id
    name
    sourceSql
    columnsMetadata
    updatedAt
  }
}
    `;
export type RestoreSpreadsheetVersionMutationFn = Apollo.MutationFunction<RestoreSpreadsheetVersionMutation, RestoreSpreadsheetVersionMutationVariables>;

export function useRestoreSpreadsheetVersionMutation(baseOptions?: Apollo.MutationHookOptions<RestoreSpreadsheetVersionMutation, RestoreSpreadsheetVersionMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<RestoreSpreadsheetVersionMutation, RestoreSpreadsheetVersionMutationVariables>(RestoreSpreadsheetVersionDocument, options);
      }
export type RestoreSpreadsheetVersionMutationHookResult = ReturnType<typeof useRestoreSpreadsheetVersionMutation>;
export type RestoreSpreadsheetVersionMutationResult = Apollo.MutationResult<RestoreSpreadsheetVersionMutation>;
export type RestoreSpreadsheetVersionMutationOptions = Apollo.BaseMutationOptions<RestoreSpreadsheetVersionMutation, RestoreSpreadsheetVersionMutationVariables>;

// --- Duplicate Spreadsheet ---
export type DuplicateSpreadsheetMutationVariables = Types.Exact<{
  data: Types.DuplicateSpreadsheetInput;
}>;

export type DuplicateSpreadsheetMutation = { __typename?: 'Mutation', duplicateSpreadsheet: { __typename?: 'Spreadsheet', id: number, projectId: number, name: string, folderId?: number | null, sortOrder: number, sourceSql?: string | null } };

export const DuplicateSpreadsheetDocument = gql`
    mutation DuplicateSpreadsheet($data: DuplicateSpreadsheetInput!) {
  duplicateSpreadsheet(data: $data) {
    id
    projectId
    name
    folderId
    sortOrder
    sourceSql
  }
}
    `;
export type DuplicateSpreadsheetMutationFn = Apollo.MutationFunction<DuplicateSpreadsheetMutation, DuplicateSpreadsheetMutationVariables>;

export function useDuplicateSpreadsheetMutation(baseOptions?: Apollo.MutationHookOptions<DuplicateSpreadsheetMutation, DuplicateSpreadsheetMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DuplicateSpreadsheetMutation, DuplicateSpreadsheetMutationVariables>(DuplicateSpreadsheetDocument, options);
      }
export type DuplicateSpreadsheetMutationHookResult = ReturnType<typeof useDuplicateSpreadsheetMutation>;
export type DuplicateSpreadsheetMutationResult = Apollo.MutationResult<DuplicateSpreadsheetMutation>;
export type DuplicateSpreadsheetMutationOptions = Apollo.BaseMutationOptions<DuplicateSpreadsheetMutation, DuplicateSpreadsheetMutationVariables>;
