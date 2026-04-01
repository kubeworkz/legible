import { gql } from '@apollo/client';

export const FOLDER_FIELDS = gql`
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

export const FOLDERS = gql`
  query Folders {
    folders {
      ...FolderFields
    }
  }
  ${FOLDER_FIELDS}
`;

export const FOLDER = gql`
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
  ${FOLDER_FIELDS}
`;

export const CREATE_FOLDER = gql`
  mutation CreateFolder($data: CreateFolderInput!) {
    createFolder(data: $data) {
      ...FolderFields
    }
  }
  ${FOLDER_FIELDS}
`;

export const UPDATE_FOLDER = gql`
  mutation UpdateFolder($where: FolderWhereInput!, $data: UpdateFolderInput!) {
    updateFolder(where: $where, data: $data) {
      ...FolderFields
    }
  }
  ${FOLDER_FIELDS}
`;

export const DELETE_FOLDER = gql`
  mutation DeleteFolder($where: FolderWhereInput!) {
    deleteFolder(where: $where)
  }
`;

export const ENSURE_SYSTEM_FOLDERS = gql`
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
  ${FOLDER_FIELDS}
`;

export const MOVE_DASHBOARD_TO_FOLDER = gql`
  mutation MoveDashboardToFolder($data: MoveDashboardToFolderInput!) {
    moveDashboardToFolder(data: $data)
  }
`;

export const MOVE_THREAD_TO_FOLDER = gql`
  mutation MoveThreadToFolder($data: MoveThreadToFolderInput!) {
    moveThreadToFolder(data: $data)
  }
`;

export const MOVE_SPREADSHEET_TO_FOLDER = gql`
  mutation MoveSpreadsheetToFolder($data: MoveSpreadsheetToFolderInput!) {
    moveSpreadsheetToFolder(data: $data)
  }
`;

export const REORDER_FOLDERS = gql`
  mutation ReorderFolders($data: ReorderFoldersInput!) {
    reorderFolders(data: $data) {
      ...FolderFields
    }
  }
  ${FOLDER_FIELDS}
`;
