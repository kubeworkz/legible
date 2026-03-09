import { gql } from '@apollo/client';

export const PROJECT_LLM_CONFIG = gql`
  query ProjectLlmConfig {
    projectLlmConfig {
      hasApiKey
      provider
      maskedApiKey
    }
  }
`;

export const SET_PROJECT_LLM_KEY = gql`
  mutation SetProjectLlmKey($data: SetProjectLlmKeyInput!) {
    setProjectLlmKey(data: $data) {
      hasApiKey
      provider
      maskedApiKey
    }
  }
`;

export const CLEAR_PROJECT_LLM_KEY = gql`
  mutation ClearProjectLlmKey {
    clearProjectLlmKey {
      hasApiKey
      provider
      maskedApiKey
    }
  }
`;
