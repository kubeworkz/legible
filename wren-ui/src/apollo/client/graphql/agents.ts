import { gql } from '@apollo/client';

const AGENT = gql`
  fragment AgentFields on AgentType {
    id
    projectId
    name
    sandboxName
    status
    providerName
    policyYaml
    image
    metadata
    blueprintId
    inferenceProfile
    createdAt
    updatedAt
  }
`;

const AGENT_AUDIT_LOG = gql`
  fragment AgentAuditLogFields on AgentAuditLogEntry {
    id
    agentId
    action
    detail
    createdAt
  }
`;

export const LIST_AGENTS = gql`
  query Agents {
    agents {
      ...AgentFields
    }
  }
  ${AGENT}
`;

export const GET_AGENT = gql`
  query Agent($where: AgentWhereInput!) {
    agent(where: $where) {
      ...AgentFields
    }
  }
  ${AGENT}
`;

export const GET_AGENT_LOGS = gql`
  query AgentLogs($where: AgentWhereInput!, $limit: Int) {
    agentLogs(where: $where, limit: $limit) {
      ...AgentAuditLogFields
    }
  }
  ${AGENT_AUDIT_LOG}
`;

export const ALL_AGENT_LOGS = gql`
  query AllAgentLogs($limit: Int) {
    allAgentLogs(limit: $limit) {
      ...AgentAuditLogFields
    }
  }
  ${AGENT_AUDIT_LOG}
`;

export const CREATE_AGENT = gql`
  mutation CreateAgent($data: CreateAgentInput!) {
    createAgent(data: $data) {
      ...AgentFields
    }
  }
  ${AGENT}
`;

export const UPDATE_AGENT = gql`
  mutation UpdateAgent($where: AgentWhereInput!, $data: UpdateAgentInput!) {
    updateAgent(where: $where, data: $data) {
      ...AgentFields
    }
  }
  ${AGENT}
`;

export const DELETE_AGENT = gql`
  mutation DeleteAgent($where: AgentWhereInput!) {
    deleteAgent(where: $where)
  }
`;
