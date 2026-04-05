/**
 * Hand-written generated hooks for workflows GraphQL operations.
 * These will be replaced by codegen output when `npm run codegen` is run.
 */
import * as Apollo from '@apollo/client';
import {
  LIST_WORKFLOWS,
  GET_WORKFLOW,
  LIST_WORKFLOW_VERSIONS,
  CREATE_WORKFLOW,
  UPDATE_WORKFLOW,
  DELETE_WORKFLOW,
  PUBLISH_WORKFLOW,
  ARCHIVE_WORKFLOW,
} from './workflows';

// --- Fragment types ---

export interface WorkflowFieldsFragment {
  id: number;
  projectId: number;
  name: string;
  description: string | null;
  graph: any | null;
  variables: any | null;
  status: 'draft' | 'published' | 'archived';
  currentVersion: number;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowVersionFieldsFragment {
  id: number;
  workflowId: number;
  version: number;
  graph: any;
  createdAt: string;
}

// --- Query types ---

export interface WorkflowsQuery {
  workflows: WorkflowFieldsFragment[];
}

export interface WorkflowQuery {
  workflow: WorkflowFieldsFragment;
}

export interface WorkflowQueryVariables {
  where: { id: number };
}

export interface WorkflowVersionsQuery {
  workflowVersions: WorkflowVersionFieldsFragment[];
}

export interface WorkflowVersionsQueryVariables {
  workflowId: number;
}

// --- Mutation types ---

export interface CreateWorkflowMutationVariables {
  data: {
    name: string;
    description?: string;
    graph?: any;
    variables?: any;
  };
}

export interface CreateWorkflowMutation {
  createWorkflow: WorkflowFieldsFragment;
}

export interface UpdateWorkflowMutationVariables {
  where: { id: number };
  data: {
    name?: string;
    description?: string;
    graph?: any;
    variables?: any;
  };
}

export interface UpdateWorkflowMutation {
  updateWorkflow: WorkflowFieldsFragment;
}

export interface DeleteWorkflowMutationVariables {
  where: { id: number };
}

export interface DeleteWorkflowMutation {
  deleteWorkflow: boolean;
}

export interface PublishWorkflowMutationVariables {
  where: { id: number };
}

export interface PublishWorkflowMutation {
  publishWorkflow: WorkflowFieldsFragment;
}

export interface ArchiveWorkflowMutationVariables {
  where: { id: number };
}

export interface ArchiveWorkflowMutation {
  archiveWorkflow: WorkflowFieldsFragment;
}

// --- Hooks ---

export function useWorkflowsQuery(
  options?: Apollo.QueryHookOptions<WorkflowsQuery, Record<string, never>>,
) {
  return Apollo.useQuery<WorkflowsQuery, Record<string, never>>(
    LIST_WORKFLOWS,
    options,
  );
}

export function useWorkflowQuery(
  options?: Apollo.QueryHookOptions<WorkflowQuery, WorkflowQueryVariables>,
) {
  return Apollo.useQuery<WorkflowQuery, WorkflowQueryVariables>(
    GET_WORKFLOW,
    options,
  );
}

export function useWorkflowVersionsQuery(
  options?: Apollo.QueryHookOptions<
    WorkflowVersionsQuery,
    WorkflowVersionsQueryVariables
  >,
) {
  return Apollo.useQuery<
    WorkflowVersionsQuery,
    WorkflowVersionsQueryVariables
  >(LIST_WORKFLOW_VERSIONS, options);
}

export function useCreateWorkflowMutation(
  options?: Apollo.MutationHookOptions<
    CreateWorkflowMutation,
    CreateWorkflowMutationVariables
  >,
) {
  return Apollo.useMutation<
    CreateWorkflowMutation,
    CreateWorkflowMutationVariables
  >(CREATE_WORKFLOW, options);
}

export function useUpdateWorkflowMutation(
  options?: Apollo.MutationHookOptions<
    UpdateWorkflowMutation,
    UpdateWorkflowMutationVariables
  >,
) {
  return Apollo.useMutation<
    UpdateWorkflowMutation,
    UpdateWorkflowMutationVariables
  >(UPDATE_WORKFLOW, options);
}

export function useDeleteWorkflowMutation(
  options?: Apollo.MutationHookOptions<
    DeleteWorkflowMutation,
    DeleteWorkflowMutationVariables
  >,
) {
  return Apollo.useMutation<
    DeleteWorkflowMutation,
    DeleteWorkflowMutationVariables
  >(DELETE_WORKFLOW, options);
}

export function usePublishWorkflowMutation(
  options?: Apollo.MutationHookOptions<
    PublishWorkflowMutation,
    PublishWorkflowMutationVariables
  >,
) {
  return Apollo.useMutation<
    PublishWorkflowMutation,
    PublishWorkflowMutationVariables
  >(PUBLISH_WORKFLOW, options);
}

export function useArchiveWorkflowMutation(
  options?: Apollo.MutationHookOptions<
    ArchiveWorkflowMutation,
    ArchiveWorkflowMutationVariables
  >,
) {
  return Apollo.useMutation<
    ArchiveWorkflowMutation,
    ArchiveWorkflowMutationVariables
  >(ARCHIVE_WORKFLOW, options);
}
