import { gql } from '@apollo/client';

const WORKFLOW_EXECUTION = gql`
  fragment WorkflowExecutionFields on WorkflowExecutionType {
    id
    workflowId
    projectId
    workflowVersion
    status
    input
    output
    error
    durationMs
    createdBy
    createdAt
    startedAt
    completedAt
  }
`;

const WORKFLOW_EXECUTION_STEP = gql`
  fragment WorkflowExecutionStepFields on WorkflowExecutionStepType {
    id
    executionId
    nodeId
    nodeType
    status
    input
    output
    error
    durationMs
    retryCount
    startedAt
    completedAt
  }
`;

const NODE_TYPE_DEFINITION = gql`
  fragment NodeTypeDefinitionFields on NodeTypeDefinitionType {
    type
    label
    description
    category
    color
    icon
    inputs {
      name
      type
      required
    }
    outputs {
      name
      type
      required
    }
    configFields {
      name
      type
      label
      required
      defaultValue
      options {
        label
        value
      }
    }
    maxInstances
  }
`;

export const LIST_WORKFLOW_EXECUTIONS = gql`
  query WorkflowExecutions($workflowId: Int!) {
    workflowExecutions(workflowId: $workflowId) {
      ...WorkflowExecutionFields
    }
  }
  ${WORKFLOW_EXECUTION}
`;

export const GET_WORKFLOW_EXECUTION = gql`
  query WorkflowExecution($where: WorkflowExecutionWhereInput!) {
    workflowExecution(where: $where) {
      ...WorkflowExecutionFields
    }
  }
  ${WORKFLOW_EXECUTION}
`;

export const GET_WORKFLOW_EXECUTION_STEPS = gql`
  query WorkflowExecutionSteps($executionId: Int!) {
    workflowExecutionSteps(executionId: $executionId) {
      ...WorkflowExecutionStepFields
    }
  }
  ${WORKFLOW_EXECUTION_STEP}
`;

export const GET_NODE_TYPE_DEFINITIONS = gql`
  query NodeTypeDefinitions {
    nodeTypeDefinitions {
      ...NodeTypeDefinitionFields
    }
  }
  ${NODE_TYPE_DEFINITION}
`;

export const EXECUTE_WORKFLOW = gql`
  mutation ExecuteWorkflow($data: ExecuteWorkflowInput!) {
    executeWorkflow(data: $data) {
      ...WorkflowExecutionFields
    }
  }
  ${WORKFLOW_EXECUTION}
`;

export const CANCEL_WORKFLOW_EXECUTION = gql`
  mutation CancelWorkflowExecution($where: WorkflowExecutionWhereInput!) {
    cancelWorkflowExecution(where: $where) {
      ...WorkflowExecutionFields
    }
  }
  ${WORKFLOW_EXECUTION}
`;
