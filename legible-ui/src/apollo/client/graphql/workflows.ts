import { gql } from '@apollo/client';

const WORKFLOW = gql`
  fragment WorkflowFields on WorkflowType {
    id
    projectId
    name
    description
    graph
    variables
    status
    currentVersion
    createdAt
    updatedAt
  }
`;

const WORKFLOW_VERSION = gql`
  fragment WorkflowVersionFields on WorkflowVersionType {
    id
    workflowId
    version
    graph
    createdAt
  }
`;

export const LIST_WORKFLOWS = gql`
  query Workflows {
    workflows {
      ...WorkflowFields
    }
  }
  ${WORKFLOW}
`;

export const GET_WORKFLOW = gql`
  query Workflow($where: WorkflowWhereInput!) {
    workflow(where: $where) {
      ...WorkflowFields
    }
  }
  ${WORKFLOW}
`;

export const LIST_WORKFLOW_VERSIONS = gql`
  query WorkflowVersions($workflowId: Int!) {
    workflowVersions(workflowId: $workflowId) {
      ...WorkflowVersionFields
    }
  }
  ${WORKFLOW_VERSION}
`;

export const CREATE_WORKFLOW = gql`
  mutation CreateWorkflow($data: CreateWorkflowInput!) {
    createWorkflow(data: $data) {
      ...WorkflowFields
    }
  }
  ${WORKFLOW}
`;

export const UPDATE_WORKFLOW = gql`
  mutation UpdateWorkflow(
    $where: WorkflowWhereInput!
    $data: UpdateWorkflowInput!
  ) {
    updateWorkflow(where: $where, data: $data) {
      ...WorkflowFields
    }
  }
  ${WORKFLOW}
`;

export const DELETE_WORKFLOW = gql`
  mutation DeleteWorkflow($where: WorkflowWhereInput!) {
    deleteWorkflow(where: $where)
  }
`;

export const PUBLISH_WORKFLOW = gql`
  mutation PublishWorkflow($where: WorkflowWhereInput!) {
    publishWorkflow(where: $where) {
      ...WorkflowFields
    }
  }
  ${WORKFLOW}
`;

export const ARCHIVE_WORKFLOW = gql`
  mutation ArchiveWorkflow($where: WorkflowWhereInput!) {
    archiveWorkflow(where: $where) {
      ...WorkflowFields
    }
  }
  ${WORKFLOW}
`;
