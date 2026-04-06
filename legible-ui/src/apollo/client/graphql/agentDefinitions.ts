import { gql } from '@apollo/client';

const AGENT_DEFINITION = gql`
  fragment AgentDefinitionFields on AgentDefinitionType {
    id
    projectId
    name
    description
    workflowId
    systemPrompt
    toolIds
    memoryConfig {
      maxMessages
      maxTokens
      strategy
      ragEnabled
      ragMaxResults
    }
    model
    temperature
    maxTokens
    status
    currentVersion
    deployConfig
    deployedAt
    tags
    icon
    createdBy
    createdAt
    updatedAt
  }
`;

const AGENT_DEFINITION_VERSION = gql`
  fragment AgentDefinitionVersionFields on AgentDefinitionVersionType {
    id
    agentDefinitionId
    version
    workflowId
    systemPrompt
    toolIds
    memoryConfig {
      maxMessages
      maxTokens
      strategy
      ragEnabled
      ragMaxResults
    }
    model
    temperature
    maxTokens
    deployConfig
    changeNote
    createdBy
    createdAt
  }
`;

export const LIST_AGENT_DEFINITIONS = gql`
  query AgentDefinitions {
    agentDefinitions {
      ...AgentDefinitionFields
    }
  }
  ${AGENT_DEFINITION}
`;

export const GET_AGENT_DEFINITION = gql`
  query AgentDefinition($where: AgentDefinitionWhereInput!) {
    agentDefinition(where: $where) {
      ...AgentDefinitionFields
    }
  }
  ${AGENT_DEFINITION}
`;

export const LIST_AGENT_DEFINITION_VERSIONS = gql`
  query AgentDefinitionVersions($agentDefinitionId: Int!) {
    agentDefinitionVersions(agentDefinitionId: $agentDefinitionId) {
      ...AgentDefinitionVersionFields
    }
  }
  ${AGENT_DEFINITION_VERSION}
`;

export const CREATE_AGENT_DEFINITION = gql`
  mutation CreateAgentDefinition($data: CreateAgentDefinitionInput!) {
    createAgentDefinition(data: $data) {
      ...AgentDefinitionFields
    }
  }
  ${AGENT_DEFINITION}
`;

export const UPDATE_AGENT_DEFINITION = gql`
  mutation UpdateAgentDefinition(
    $where: AgentDefinitionWhereInput!
    $data: UpdateAgentDefinitionInput!
  ) {
    updateAgentDefinition(where: $where, data: $data) {
      ...AgentDefinitionFields
    }
  }
  ${AGENT_DEFINITION}
`;

export const DELETE_AGENT_DEFINITION = gql`
  mutation DeleteAgentDefinition($where: AgentDefinitionWhereInput!) {
    deleteAgentDefinition(where: $where)
  }
`;

export const PUBLISH_AGENT_DEFINITION = gql`
  mutation PublishAgentDefinition(
    $where: AgentDefinitionWhereInput!
    $changeNote: String
  ) {
    publishAgentDefinition(where: $where, changeNote: $changeNote) {
      ...AgentDefinitionFields
    }
  }
  ${AGENT_DEFINITION}
`;

export const DEPLOY_AGENT_DEFINITION = gql`
  mutation DeployAgentDefinition($where: AgentDefinitionWhereInput!) {
    deployAgentDefinition(where: $where) {
      ...AgentDefinitionFields
    }
  }
  ${AGENT_DEFINITION}
`;

export const ARCHIVE_AGENT_DEFINITION = gql`
  mutation ArchiveAgentDefinition($where: AgentDefinitionWhereInput!) {
    archiveAgentDefinition(where: $where) {
      ...AgentDefinitionFields
    }
  }
  ${AGENT_DEFINITION}
`;
