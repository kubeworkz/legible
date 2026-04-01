/**
 * Hand-written generated hooks for agents GraphQL operations.
 * These will be replaced by codegen output when `npm run codegen` is run.
 */
import * as Apollo from '@apollo/client';
import {
  LIST_AGENTS,
  GET_AGENT,
  GET_AGENT_LOGS,
  CREATE_AGENT,
  UPDATE_AGENT,
  DELETE_AGENT,
} from './agents';

// --- Fragment types ---

export interface AgentFieldsFragment {
  id: number;
  projectId: number;
  name: string;
  sandboxName: string;
  status: 'CREATING' | 'RUNNING' | 'STOPPED' | 'FAILED';
  providerName: string | null;
  policyYaml: string | null;
  image: string | null;
  metadata: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
}

export interface AgentAuditLogFieldsFragment {
  id: number;
  agentId: number;
  action: string;
  detail: string | null;
  createdAt: string;
}

// --- Query types ---

export interface AgentsQuery {
  agents: AgentFieldsFragment[];
}

export interface AgentQuery {
  agent: AgentFieldsFragment;
}

export interface AgentQueryVariables {
  where: { id: number };
}

export interface AgentLogsQuery {
  agentLogs: AgentAuditLogFieldsFragment[];
}

export interface AgentLogsQueryVariables {
  where: { id: number };
  limit?: number;
}

// --- Mutation types ---

export interface CreateAgentMutationVariables {
  data: {
    name: string;
    sandboxName: string;
    providerName?: string;
    policyYaml?: string;
    image?: string;
    metadata?: Record<string, any>;
  };
}

export interface CreateAgentMutation {
  createAgent: AgentFieldsFragment;
}

export interface UpdateAgentMutationVariables {
  where: { id: number };
  data: {
    status?: string;
    policyYaml?: string;
    metadata?: Record<string, any>;
  };
}

export interface UpdateAgentMutation {
  updateAgent: AgentFieldsFragment;
}

export interface DeleteAgentMutationVariables {
  where: { id: number };
}

export interface DeleteAgentMutation {
  deleteAgent: boolean;
}

// --- Query hooks ---

export function useAgentsQuery(
  options?: Apollo.QueryHookOptions<AgentsQuery>,
) {
  return Apollo.useQuery<AgentsQuery>(LIST_AGENTS, options);
}

export function useAgentsLazyQuery(
  options?: Apollo.LazyQueryHookOptions<AgentsQuery>,
) {
  return Apollo.useLazyQuery<AgentsQuery>(LIST_AGENTS, options);
}

export function useAgentQuery(
  options: Apollo.QueryHookOptions<AgentQuery, AgentQueryVariables>,
) {
  return Apollo.useQuery<AgentQuery, AgentQueryVariables>(GET_AGENT, options);
}

export function useAgentLogsQuery(
  options: Apollo.QueryHookOptions<AgentLogsQuery, AgentLogsQueryVariables>,
) {
  return Apollo.useQuery<AgentLogsQuery, AgentLogsQueryVariables>(
    GET_AGENT_LOGS,
    options,
  );
}

// --- Mutation hooks ---

export function useCreateAgentMutation(
  options?: Apollo.MutationHookOptions<
    CreateAgentMutation,
    CreateAgentMutationVariables
  >,
) {
  return Apollo.useMutation<
    CreateAgentMutation,
    CreateAgentMutationVariables
  >(CREATE_AGENT, options);
}

export function useUpdateAgentMutation(
  options?: Apollo.MutationHookOptions<
    UpdateAgentMutation,
    UpdateAgentMutationVariables
  >,
) {
  return Apollo.useMutation<
    UpdateAgentMutation,
    UpdateAgentMutationVariables
  >(UPDATE_AGENT, options);
}

export function useDeleteAgentMutation(
  options?: Apollo.MutationHookOptions<
    DeleteAgentMutation,
    DeleteAgentMutationVariables
  >,
) {
  return Apollo.useMutation<
    DeleteAgentMutation,
    DeleteAgentMutationVariables
  >(DELETE_AGENT, options);
}
