/**
 * Hand-written generated hooks for toolDefinitions GraphQL operations.
 * These will be replaced by codegen output when `npm run codegen` is run.
 */
import * as Apollo from '@apollo/client';
import {
  LIST_TOOL_DEFINITIONS,
  GET_TOOL_DEFINITION,
  LIST_TOOL_DEFINITIONS_BY_SOURCE,
  CREATE_TOOL_DEFINITION,
  UPDATE_TOOL_DEFINITION,
  DELETE_TOOL_DEFINITION,
  SYNC_MCP_TOOLS,
} from './toolDefinitions';

// --- Fragment types ---

export interface ToolDefinitionFieldsFragment {
  id: number;
  projectId: number;
  name: string;
  description: string | null;
  source: string;
  mcpServerName: string | null;
  method: string | null;
  endpoint: string | null;
  inputSchema: any | null;
  outputSchema: any | null;
  headers: any | null;
  authConfig: any | null;
  enabled: boolean;
  tags: string[] | null;
  lastSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// --- Query types ---

export interface ToolDefinitionsQuery {
  toolDefinitions: ToolDefinitionFieldsFragment[];
}

export interface ToolDefinitionQuery {
  toolDefinition: ToolDefinitionFieldsFragment;
}

export interface ToolDefinitionQueryVariables {
  where: { id: number };
}

export interface ToolDefinitionsBySourceQuery {
  toolDefinitionsBySource: ToolDefinitionFieldsFragment[];
}

export interface ToolDefinitionsBySourceQueryVariables {
  source: string;
}

// --- Mutation types ---

export interface CreateToolDefinitionMutationVariables {
  data: {
    name: string;
    description?: string;
    source: string;
    mcpServerName?: string;
    method?: string;
    endpoint?: string;
    inputSchema?: any;
    outputSchema?: any;
    headers?: any;
    authConfig?: any;
    tags?: string[];
  };
}

export interface CreateToolDefinitionMutation {
  createToolDefinition: ToolDefinitionFieldsFragment;
}

export interface UpdateToolDefinitionMutationVariables {
  where: { id: number };
  data: {
    name?: string;
    description?: string;
    method?: string;
    endpoint?: string;
    inputSchema?: any;
    outputSchema?: any;
    headers?: any;
    authConfig?: any;
    enabled?: boolean;
    tags?: string[];
  };
}

export interface UpdateToolDefinitionMutation {
  updateToolDefinition: ToolDefinitionFieldsFragment;
}

export interface DeleteToolDefinitionMutationVariables {
  where: { id: number };
}

export interface DeleteToolDefinitionMutation {
  deleteToolDefinition: boolean;
}

export interface SyncMcpToolsMutationVariables {
  serverName: string;
}

export interface SyncMcpToolsMutation {
  syncMcpTools: {
    created: number;
    updated: number;
    removed: number;
  };
}

// --- Hooks ---

export function useToolDefinitionsQuery(
  options?: Apollo.QueryHookOptions<
    ToolDefinitionsQuery,
    Record<string, never>
  >,
) {
  return Apollo.useQuery<ToolDefinitionsQuery, Record<string, never>>(
    LIST_TOOL_DEFINITIONS,
    options,
  );
}

export function useToolDefinitionQuery(
  options?: Apollo.QueryHookOptions<
    ToolDefinitionQuery,
    ToolDefinitionQueryVariables
  >,
) {
  return Apollo.useQuery<ToolDefinitionQuery, ToolDefinitionQueryVariables>(
    GET_TOOL_DEFINITION,
    options,
  );
}

export function useToolDefinitionsBySourceQuery(
  options?: Apollo.QueryHookOptions<
    ToolDefinitionsBySourceQuery,
    ToolDefinitionsBySourceQueryVariables
  >,
) {
  return Apollo.useQuery<
    ToolDefinitionsBySourceQuery,
    ToolDefinitionsBySourceQueryVariables
  >(LIST_TOOL_DEFINITIONS_BY_SOURCE, options);
}

export function useCreateToolDefinitionMutation(
  options?: Apollo.MutationHookOptions<
    CreateToolDefinitionMutation,
    CreateToolDefinitionMutationVariables
  >,
) {
  return Apollo.useMutation<
    CreateToolDefinitionMutation,
    CreateToolDefinitionMutationVariables
  >(CREATE_TOOL_DEFINITION, options);
}

export function useUpdateToolDefinitionMutation(
  options?: Apollo.MutationHookOptions<
    UpdateToolDefinitionMutation,
    UpdateToolDefinitionMutationVariables
  >,
) {
  return Apollo.useMutation<
    UpdateToolDefinitionMutation,
    UpdateToolDefinitionMutationVariables
  >(UPDATE_TOOL_DEFINITION, options);
}

export function useDeleteToolDefinitionMutation(
  options?: Apollo.MutationHookOptions<
    DeleteToolDefinitionMutation,
    DeleteToolDefinitionMutationVariables
  >,
) {
  return Apollo.useMutation<
    DeleteToolDefinitionMutation,
    DeleteToolDefinitionMutationVariables
  >(DELETE_TOOL_DEFINITION, options);
}

export function useSyncMcpToolsMutation(
  options?: Apollo.MutationHookOptions<
    SyncMcpToolsMutation,
    SyncMcpToolsMutationVariables
  >,
) {
  return Apollo.useMutation<
    SyncMcpToolsMutation,
    SyncMcpToolsMutationVariables
  >(SYNC_MCP_TOOLS, options);
}
