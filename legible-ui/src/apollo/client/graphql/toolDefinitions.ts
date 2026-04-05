import { gql } from '@apollo/client';

const TOOL_DEFINITION = gql`
  fragment ToolDefinitionFields on ToolDefinitionType {
    id
    projectId
    name
    description
    source
    mcpServerName
    method
    endpoint
    inputSchema
    outputSchema
    headers
    authConfig
    enabled
    tags
    lastSyncedAt
    createdAt
    updatedAt
  }
`;

export const LIST_TOOL_DEFINITIONS = gql`
  query ToolDefinitions {
    toolDefinitions {
      ...ToolDefinitionFields
    }
  }
  ${TOOL_DEFINITION}
`;

export const GET_TOOL_DEFINITION = gql`
  query ToolDefinition($where: ToolDefinitionWhereInput!) {
    toolDefinition(where: $where) {
      ...ToolDefinitionFields
    }
  }
  ${TOOL_DEFINITION}
`;

export const LIST_TOOL_DEFINITIONS_BY_SOURCE = gql`
  query ToolDefinitionsBySource($source: String!) {
    toolDefinitionsBySource(source: $source) {
      ...ToolDefinitionFields
    }
  }
  ${TOOL_DEFINITION}
`;

export const CREATE_TOOL_DEFINITION = gql`
  mutation CreateToolDefinition($data: CreateToolDefinitionInput!) {
    createToolDefinition(data: $data) {
      ...ToolDefinitionFields
    }
  }
  ${TOOL_DEFINITION}
`;

export const UPDATE_TOOL_DEFINITION = gql`
  mutation UpdateToolDefinition(
    $where: ToolDefinitionWhereInput!
    $data: UpdateToolDefinitionInput!
  ) {
    updateToolDefinition(where: $where, data: $data) {
      ...ToolDefinitionFields
    }
  }
  ${TOOL_DEFINITION}
`;

export const DELETE_TOOL_DEFINITION = gql`
  mutation DeleteToolDefinition($where: ToolDefinitionWhereInput!) {
    deleteToolDefinition(where: $where)
  }
`;

export const SYNC_MCP_TOOLS = gql`
  mutation SyncMcpTools($serverName: String!) {
    syncMcpTools(serverName: $serverName) {
      created
      updated
      removed
    }
  }
`;
