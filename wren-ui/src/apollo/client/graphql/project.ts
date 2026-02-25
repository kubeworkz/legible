import { gql } from '@apollo/client';

export const LIST_PROJECTS = gql`
  query ListProjects {
    listProjects {
      id
      type
      displayName
      language
      sampleDataset
      createdAt
      updatedAt
    }
  }
`;

export const GET_PROJECT = gql`
  query GetProject($projectId: Int!) {
    project(projectId: $projectId) {
      id
      type
      displayName
      language
      sampleDataset
      createdAt
      updatedAt
    }
  }
`;

export const CREATE_PROJECT = gql`
  mutation CreateProject($data: CreateProjectInput!) {
    createProject(data: $data) {
      id
      type
      displayName
      language
      sampleDataset
      createdAt
      updatedAt
    }
  }
`;

export const UPDATE_PROJECT = gql`
  mutation UpdateProject($projectId: Int!, $data: UpdateProjectInput!) {
    updateProject(projectId: $projectId, data: $data) {
      id
      type
      displayName
      language
      sampleDataset
      createdAt
      updatedAt
    }
  }
`;

export const DELETE_PROJECT = gql`
  mutation DeleteProject($projectId: Int!) {
    deleteProject(projectId: $projectId)
  }
`;
