import { gql } from '@apollo/client';

const AGENT_CHAT_SESSION = gql`
  fragment AgentChatSessionFields on AgentChatSessionType {
    id
    projectId
    agentDefinitionId
    title
    status
    createdBy
    createdAt
    updatedAt
  }
`;

const AGENT_CHAT_MESSAGE = gql`
  fragment AgentChatMessageFields on AgentChatMessageType {
    id
    sessionId
    role
    content
    toolCallId
    toolName
    toolInput
    toolOutput
    reasoningSteps {
      type
      content
      toolName
      toolInput
      toolOutput
      durationMs
      timestamp
    }
    metadata {
      model
      usage
      finishReason
      durationMs
    }
    status
    error
    createdAt
  }
`;

export const LIST_CHAT_SESSIONS = gql`
  query AgentChatSessions($agentDefinitionId: Int!) {
    agentChatSessions(agentDefinitionId: $agentDefinitionId) {
      ...AgentChatSessionFields
    }
  }
  ${AGENT_CHAT_SESSION}
`;

export const GET_CHAT_SESSION = gql`
  query AgentChatSession($sessionId: Int!) {
    agentChatSession(sessionId: $sessionId) {
      ...AgentChatSessionFields
    }
  }
  ${AGENT_CHAT_SESSION}
`;

export const LIST_CHAT_MESSAGES = gql`
  query AgentChatMessages($sessionId: Int!) {
    agentChatMessages(sessionId: $sessionId) {
      ...AgentChatMessageFields
    }
  }
  ${AGENT_CHAT_MESSAGE}
`;

export const CREATE_CHAT_SESSION = gql`
  mutation CreateChatSession($agentDefinitionId: Int!) {
    createChatSession(agentDefinitionId: $agentDefinitionId) {
      ...AgentChatSessionFields
    }
  }
  ${AGENT_CHAT_SESSION}
`;

export const SEND_CHAT_MESSAGE = gql`
  mutation SendChatMessage($sessionId: Int!, $content: String!) {
    sendChatMessage(sessionId: $sessionId, content: $content) {
      ...AgentChatMessageFields
    }
  }
  ${AGENT_CHAT_MESSAGE}
`;

export const DELETE_CHAT_SESSION = gql`
  mutation DeleteChatSession($sessionId: Int!) {
    deleteChatSession(sessionId: $sessionId)
  }
`;
