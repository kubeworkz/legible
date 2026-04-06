/**
 * Hand-written generated hooks for agentChat GraphQL operations.
 * These will be replaced by codegen output when `npm run codegen` is run.
 */
import * as Apollo from '@apollo/client';
import {
  LIST_CHAT_SESSIONS,
  GET_CHAT_SESSION,
  LIST_CHAT_MESSAGES,
  CREATE_CHAT_SESSION,
  SEND_CHAT_MESSAGE,
  DELETE_CHAT_SESSION,
} from './agentChat';

// --- Fragment types ---

export interface ReasoningStepFragment {
  type: string;
  content: string | null;
  toolName: string | null;
  toolInput: string | null;
  toolOutput: string | null;
  durationMs: number | null;
  timestamp: string | null;
}

export interface ChatMessageMetadataFragment {
  model: string | null;
  usage: any | null;
  finishReason: string | null;
  durationMs: number | null;
}

export interface AgentChatSessionFieldsFragment {
  id: number;
  projectId: number;
  agentDefinitionId: number;
  title: string;
  status: 'active' | 'archived';
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AgentChatMessageFieldsFragment {
  id: number;
  sessionId: number;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string | null;
  toolCallId: string | null;
  toolName: string | null;
  toolInput: string | null;
  toolOutput: string | null;
  reasoningSteps: ReasoningStepFragment[] | null;
  metadata: ChatMessageMetadataFragment | null;
  status: 'pending' | 'streaming' | 'completed' | 'error';
  error: string | null;
  createdAt: string;
}

// --- Query types ---

export interface AgentChatSessionsQuery {
  agentChatSessions: AgentChatSessionFieldsFragment[];
}

export interface AgentChatSessionsQueryVariables {
  agentDefinitionId: number;
}

export interface AgentChatSessionQuery {
  agentChatSession: AgentChatSessionFieldsFragment;
}

export interface AgentChatSessionQueryVariables {
  sessionId: number;
}

export interface AgentChatMessagesQuery {
  agentChatMessages: AgentChatMessageFieldsFragment[];
}

export interface AgentChatMessagesQueryVariables {
  sessionId: number;
}

// --- Mutation types ---

export interface CreateChatSessionMutation {
  createChatSession: AgentChatSessionFieldsFragment;
}

export interface CreateChatSessionMutationVariables {
  agentDefinitionId: number;
}

export interface SendChatMessageMutation {
  sendChatMessage: AgentChatMessageFieldsFragment[];
}

export interface SendChatMessageMutationVariables {
  sessionId: number;
  content: string;
}

export interface DeleteChatSessionMutation {
  deleteChatSession: boolean;
}

export interface DeleteChatSessionMutationVariables {
  sessionId: number;
}

// --- Query hooks ---

export function useAgentChatSessionsQuery(
  baseOptions: Apollo.QueryHookOptions<
    AgentChatSessionsQuery,
    AgentChatSessionsQueryVariables
  >,
) {
  return Apollo.useQuery<
    AgentChatSessionsQuery,
    AgentChatSessionsQueryVariables
  >(LIST_CHAT_SESSIONS, baseOptions);
}

export function useAgentChatSessionQuery(
  baseOptions: Apollo.QueryHookOptions<
    AgentChatSessionQuery,
    AgentChatSessionQueryVariables
  >,
) {
  return Apollo.useQuery<
    AgentChatSessionQuery,
    AgentChatSessionQueryVariables
  >(GET_CHAT_SESSION, baseOptions);
}

export function useAgentChatMessagesQuery(
  baseOptions: Apollo.QueryHookOptions<
    AgentChatMessagesQuery,
    AgentChatMessagesQueryVariables
  >,
) {
  return Apollo.useQuery<
    AgentChatMessagesQuery,
    AgentChatMessagesQueryVariables
  >(LIST_CHAT_MESSAGES, baseOptions);
}

// --- Mutation hooks ---

export function useCreateChatSessionMutation(
  baseOptions?: Apollo.MutationHookOptions<
    CreateChatSessionMutation,
    CreateChatSessionMutationVariables
  >,
) {
  return Apollo.useMutation<
    CreateChatSessionMutation,
    CreateChatSessionMutationVariables
  >(CREATE_CHAT_SESSION, baseOptions);
}

export function useSendChatMessageMutation(
  baseOptions?: Apollo.MutationHookOptions<
    SendChatMessageMutation,
    SendChatMessageMutationVariables
  >,
) {
  return Apollo.useMutation<
    SendChatMessageMutation,
    SendChatMessageMutationVariables
  >(SEND_CHAT_MESSAGE, baseOptions);
}

export function useDeleteChatSessionMutation(
  baseOptions?: Apollo.MutationHookOptions<
    DeleteChatSessionMutation,
    DeleteChatSessionMutationVariables
  >,
) {
  return Apollo.useMutation<
    DeleteChatSessionMutation,
    DeleteChatSessionMutationVariables
  >(DELETE_CHAT_SESSION, baseOptions);
}
