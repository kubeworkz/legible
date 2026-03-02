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
