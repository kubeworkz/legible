import { gql } from '@apollo/client';

export const SPREADSHEETS = gql`
  query Spreadsheets($folderId: Int) {
    spreadsheets(folderId: $folderId) {
      id
      projectId
      name
      description
      folderId
      sortOrder
      sourceSql
      createdAt
      updatedAt
    }
  }
`;

export const SPREADSHEET = gql`
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
      createdAt
      updatedAt
    }
  }
`;

export const CREATE_SPREADSHEET = gql`
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

export const UPDATE_SPREADSHEET = gql`
  mutation UpdateSpreadsheet(
    $where: SpreadsheetWhereInput!
    $data: UpdateSpreadsheetInput!
  ) {
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

export const DELETE_SPREADSHEET = gql`
  mutation DeleteSpreadsheet($where: SpreadsheetWhereInput!) {
    deleteSpreadsheet(where: $where)
  }
`;

export const PREVIEW_SPREADSHEET_DATA = gql`
  mutation PreviewSpreadsheetData($data: PreviewSpreadsheetDataInput!) {
    previewSpreadsheetData(data: $data)
  }
`;

export const SPREADSHEET_HISTORY = gql`
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

export const SAVE_SPREADSHEET_WITH_HISTORY = gql`
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

export const RESTORE_SPREADSHEET_VERSION = gql`
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

export const DUPLICATE_SPREADSHEET = gql`
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
