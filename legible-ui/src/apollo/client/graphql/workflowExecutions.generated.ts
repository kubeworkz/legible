/**
 * Hand-written generated hooks for workflow execution GraphQL operations.
 * These will be replaced by codegen output when `npm run codegen` is run.
 */
import * as Apollo from '@apollo/client';
import {
  LIST_WORKFLOW_EXECUTIONS,
  GET_WORKFLOW_EXECUTION,
  GET_WORKFLOW_EXECUTION_STEPS,
  GET_NODE_TYPE_DEFINITIONS,
  EXECUTE_WORKFLOW,
  CANCEL_WORKFLOW_EXECUTION,
} from './workflowExecutions';

// --- Fragment types ---

export interface WorkflowExecutionFieldsFragment {
  id: number;
  workflowId: number;
  projectId: number;
  workflowVersion: number | null;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  input: any | null;
  output: any | null;
  error: string | null;
  durationMs: number | null;
  createdBy: number | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

export interface WorkflowExecutionStepFieldsFragment {
  id: number;
  executionId: number;
  nodeId: string;
  nodeType: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  input: any | null;
  output: any | null;
  error: string | null;
  durationMs: number | null;
  retryCount: number | null;
  startedAt: string | null;
  completedAt: string | null;
}

export interface PortDefinitionFragment {
  name: string;
  type: string;
  required: boolean | null;
}

export interface ConfigFieldOptionFragment {
  label: string;
  value: string;
}

export interface ConfigFieldFragment {
  name: string;
  type: string;
  label: string;
  required: boolean | null;
  defaultValue: any | null;
  options: ConfigFieldOptionFragment[] | null;
}

export interface NodeTypeDefinitionFieldsFragment {
  type: string;
  label: string;
  description: string;
  category: string;
  color: string;
  icon: string;
  inputs: PortDefinitionFragment[];
  outputs: PortDefinitionFragment[];
  configFields: ConfigFieldFragment[];
  maxInstances: number | null;
}

// --- Query types ---

export interface WorkflowExecutionsQuery {
  workflowExecutions: WorkflowExecutionFieldsFragment[];
}

export interface WorkflowExecutionsQueryVariables {
  workflowId: number;
}

export interface WorkflowExecutionQuery {
  workflowExecution: WorkflowExecutionFieldsFragment;
}

export interface WorkflowExecutionQueryVariables {
  where: { id: number };
}

export interface WorkflowExecutionStepsQuery {
  workflowExecutionSteps: WorkflowExecutionStepFieldsFragment[];
}

export interface WorkflowExecutionStepsQueryVariables {
  executionId: number;
}

export interface NodeTypeDefinitionsQuery {
  nodeTypeDefinitions: NodeTypeDefinitionFieldsFragment[];
}

// --- Mutation types ---

export interface ExecuteWorkflowMutation {
  executeWorkflow: WorkflowExecutionFieldsFragment;
}

export interface ExecuteWorkflowMutationVariables {
  data: { workflowId: number; input?: any };
}

export interface CancelWorkflowExecutionMutation {
  cancelWorkflowExecution: WorkflowExecutionFieldsFragment;
}

export interface CancelWorkflowExecutionMutationVariables {
  where: { id: number };
}

// --- Hooks ---

export function useWorkflowExecutionsQuery(
  options: Apollo.QueryHookOptions<
    WorkflowExecutionsQuery,
    WorkflowExecutionsQueryVariables
  >,
) {
  return Apollo.useQuery<
    WorkflowExecutionsQuery,
    WorkflowExecutionsQueryVariables
  >(LIST_WORKFLOW_EXECUTIONS, options);
}

export function useWorkflowExecutionQuery(
  options: Apollo.QueryHookOptions<
    WorkflowExecutionQuery,
    WorkflowExecutionQueryVariables
  >,
) {
  return Apollo.useQuery<
    WorkflowExecutionQuery,
    WorkflowExecutionQueryVariables
  >(GET_WORKFLOW_EXECUTION, options);
}

export function useWorkflowExecutionStepsQuery(
  options: Apollo.QueryHookOptions<
    WorkflowExecutionStepsQuery,
    WorkflowExecutionStepsQueryVariables
  >,
) {
  return Apollo.useQuery<
    WorkflowExecutionStepsQuery,
    WorkflowExecutionStepsQueryVariables
  >(GET_WORKFLOW_EXECUTION_STEPS, options);
}

export function useNodeTypeDefinitionsQuery(
  options?: Apollo.QueryHookOptions<NodeTypeDefinitionsQuery, {}>,
) {
  return Apollo.useQuery<NodeTypeDefinitionsQuery, {}>(
    GET_NODE_TYPE_DEFINITIONS,
    options,
  );
}

export function useExecuteWorkflowMutation(
  options?: Apollo.MutationHookOptions<
    ExecuteWorkflowMutation,
    ExecuteWorkflowMutationVariables
  >,
) {
  return Apollo.useMutation<
    ExecuteWorkflowMutation,
    ExecuteWorkflowMutationVariables
  >(EXECUTE_WORKFLOW, options);
}

export function useCancelWorkflowExecutionMutation(
  options?: Apollo.MutationHookOptions<
    CancelWorkflowExecutionMutation,
    CancelWorkflowExecutionMutationVariables
  >,
) {
  return Apollo.useMutation<
    CancelWorkflowExecutionMutation,
    CancelWorkflowExecutionMutationVariables
  >(CANCEL_WORKFLOW_EXECUTION, options);
}
