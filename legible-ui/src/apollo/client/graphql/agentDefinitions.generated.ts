/**
 * Hand-written generated hooks for agentDefinitions GraphQL operations.
 * These will be replaced by codegen output when `npm run codegen` is run.
 */
import * as Apollo from '@apollo/client';
import {
  LIST_AGENT_DEFINITIONS,
  GET_AGENT_DEFINITION,
  LIST_AGENT_DEFINITION_VERSIONS,
  CREATE_AGENT_DEFINITION,
  UPDATE_AGENT_DEFINITION,
  DELETE_AGENT_DEFINITION,
  PUBLISH_AGENT_DEFINITION,
  DEPLOY_AGENT_DEFINITION,
  ARCHIVE_AGENT_DEFINITION,
} from './agentDefinitions';

// --- Fragment types ---

export interface AgentDefinitionFieldsFragment {
  id: number;
  projectId: number;
  name: string;
  description: string | null;
  workflowId: number | null;
  systemPrompt: string | null;
  toolIds: number[] | null;
  memoryConfig: any | null;
  model: string | null;
  temperature: number | null;
  maxTokens: number | null;
  status: 'draft' | 'published' | 'deployed' | 'archived';
  currentVersion: number;
  deployConfig: any | null;
  deployedAt: string | null;
  tags: string[] | null;
  icon: string | null;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface AgentDefinitionVersionFieldsFragment {
  id: number;
  agentDefinitionId: number;
  version: number;
  workflowId: number | null;
  systemPrompt: string | null;
  toolIds: number[] | null;
  memoryConfig: any | null;
  model: string | null;
  temperature: number | null;
  maxTokens: number | null;
  deployConfig: any | null;
  changeNote: string | null;
  createdBy: number | null;
  createdAt: string;
}

// --- Query types ---

export interface AgentDefinitionsQuery {
  agentDefinitions: AgentDefinitionFieldsFragment[];
}

export interface AgentDefinitionQuery {
  agentDefinition: AgentDefinitionFieldsFragment;
}

export interface AgentDefinitionQueryVariables {
  where: { id: number };
}

export interface AgentDefinitionVersionsQuery {
  agentDefinitionVersions: AgentDefinitionVersionFieldsFragment[];
}

export interface AgentDefinitionVersionsQueryVariables {
  agentDefinitionId: number;
}

// --- Mutation types ---

export interface CreateAgentDefinitionInput {
  name: string;
  description?: string;
  workflowId?: number;
  systemPrompt?: string;
  toolIds?: number[];
  memoryConfig?: any;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  deployConfig?: any;
  tags?: string[];
  icon?: string;
}

export interface CreateAgentDefinitionMutationVariables {
  data: CreateAgentDefinitionInput;
}

export interface CreateAgentDefinitionMutation {
  createAgentDefinition: AgentDefinitionFieldsFragment;
}

export interface UpdateAgentDefinitionInput {
  name?: string;
  description?: string;
  workflowId?: number;
  systemPrompt?: string;
  toolIds?: number[];
  memoryConfig?: any;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  deployConfig?: any;
  tags?: string[];
  icon?: string;
}

export interface UpdateAgentDefinitionMutationVariables {
  where: { id: number };
  data: UpdateAgentDefinitionInput;
}

export interface UpdateAgentDefinitionMutation {
  updateAgentDefinition: AgentDefinitionFieldsFragment;
}

export interface DeleteAgentDefinitionMutationVariables {
  where: { id: number };
}

export interface DeleteAgentDefinitionMutation {
  deleteAgentDefinition: boolean;
}

export interface PublishAgentDefinitionMutationVariables {
  where: { id: number };
  changeNote?: string;
}

export interface PublishAgentDefinitionMutation {
  publishAgentDefinition: AgentDefinitionFieldsFragment;
}

export interface DeployAgentDefinitionMutationVariables {
  where: { id: number };
}

export interface DeployAgentDefinitionMutation {
  deployAgentDefinition: AgentDefinitionFieldsFragment;
}

export interface ArchiveAgentDefinitionMutationVariables {
  where: { id: number };
}

export interface ArchiveAgentDefinitionMutation {
  archiveAgentDefinition: AgentDefinitionFieldsFragment;
}

// --- Query hooks ---

export function useAgentDefinitionsQuery(
  baseOptions?: Apollo.QueryHookOptions<AgentDefinitionsQuery>,
) {
  return Apollo.useQuery<AgentDefinitionsQuery>(
    LIST_AGENT_DEFINITIONS,
    baseOptions,
  );
}

export function useAgentDefinitionQuery(
  baseOptions: Apollo.QueryHookOptions<
    AgentDefinitionQuery,
    AgentDefinitionQueryVariables
  >,
) {
  return Apollo.useQuery<AgentDefinitionQuery, AgentDefinitionQueryVariables>(
    GET_AGENT_DEFINITION,
    baseOptions,
  );
}

export function useAgentDefinitionVersionsQuery(
  baseOptions: Apollo.QueryHookOptions<
    AgentDefinitionVersionsQuery,
    AgentDefinitionVersionsQueryVariables
  >,
) {
  return Apollo.useQuery<
    AgentDefinitionVersionsQuery,
    AgentDefinitionVersionsQueryVariables
  >(LIST_AGENT_DEFINITION_VERSIONS, baseOptions);
}

// --- Mutation hooks ---

export function useCreateAgentDefinitionMutation(
  baseOptions?: Apollo.MutationHookOptions<
    CreateAgentDefinitionMutation,
    CreateAgentDefinitionMutationVariables
  >,
) {
  return Apollo.useMutation<
    CreateAgentDefinitionMutation,
    CreateAgentDefinitionMutationVariables
  >(CREATE_AGENT_DEFINITION, baseOptions);
}

export function useUpdateAgentDefinitionMutation(
  baseOptions?: Apollo.MutationHookOptions<
    UpdateAgentDefinitionMutation,
    UpdateAgentDefinitionMutationVariables
  >,
) {
  return Apollo.useMutation<
    UpdateAgentDefinitionMutation,
    UpdateAgentDefinitionMutationVariables
  >(UPDATE_AGENT_DEFINITION, baseOptions);
}

export function useDeleteAgentDefinitionMutation(
  baseOptions?: Apollo.MutationHookOptions<
    DeleteAgentDefinitionMutation,
    DeleteAgentDefinitionMutationVariables
  >,
) {
  return Apollo.useMutation<
    DeleteAgentDefinitionMutation,
    DeleteAgentDefinitionMutationVariables
  >(DELETE_AGENT_DEFINITION, baseOptions);
}

export function usePublishAgentDefinitionMutation(
  baseOptions?: Apollo.MutationHookOptions<
    PublishAgentDefinitionMutation,
    PublishAgentDefinitionMutationVariables
  >,
) {
  return Apollo.useMutation<
    PublishAgentDefinitionMutation,
    PublishAgentDefinitionMutationVariables
  >(PUBLISH_AGENT_DEFINITION, baseOptions);
}

export function useDeployAgentDefinitionMutation(
  baseOptions?: Apollo.MutationHookOptions<
    DeployAgentDefinitionMutation,
    DeployAgentDefinitionMutationVariables
  >,
) {
  return Apollo.useMutation<
    DeployAgentDefinitionMutation,
    DeployAgentDefinitionMutationVariables
  >(DEPLOY_AGENT_DEFINITION, baseOptions);
}

export function useArchiveAgentDefinitionMutation(
  baseOptions?: Apollo.MutationHookOptions<
    ArchiveAgentDefinitionMutation,
    ArchiveAgentDefinitionMutationVariables
  >,
) {
  return Apollo.useMutation<
    ArchiveAgentDefinitionMutation,
    ArchiveAgentDefinitionMutationVariables
  >(ARCHIVE_AGENT_DEFINITION, baseOptions);
}
