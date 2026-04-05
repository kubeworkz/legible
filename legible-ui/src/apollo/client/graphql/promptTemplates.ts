import { gql } from '@apollo/client';

const PROMPT_TEMPLATE = gql`
  fragment PromptTemplateFields on PromptTemplateType {
    id
    projectId
    name
    systemPrompt
    userPrompt
    variables
    model
    temperature
    maxTokens
    tags
    currentVersion
    createdAt
    updatedAt
  }
`;

const PROMPT_TEMPLATE_VERSION = gql`
  fragment PromptTemplateVersionFields on PromptTemplateVersionType {
    id
    promptTemplateId
    version
    systemPrompt
    userPrompt
    variables
    model
    temperature
    maxTokens
    createdAt
  }
`;

export const LIST_PROMPT_TEMPLATES = gql`
  query PromptTemplates {
    promptTemplates {
      ...PromptTemplateFields
    }
  }
  ${PROMPT_TEMPLATE}
`;

export const GET_PROMPT_TEMPLATE = gql`
  query PromptTemplate($where: PromptTemplateWhereInput!) {
    promptTemplate(where: $where) {
      ...PromptTemplateFields
    }
  }
  ${PROMPT_TEMPLATE}
`;

export const LIST_PROMPT_TEMPLATE_VERSIONS = gql`
  query PromptTemplateVersions($promptTemplateId: Int!) {
    promptTemplateVersions(promptTemplateId: $promptTemplateId) {
      ...PromptTemplateVersionFields
    }
  }
  ${PROMPT_TEMPLATE_VERSION}
`;

export const CREATE_PROMPT_TEMPLATE = gql`
  mutation CreatePromptTemplate($data: CreatePromptTemplateInput!) {
    createPromptTemplate(data: $data) {
      ...PromptTemplateFields
    }
  }
  ${PROMPT_TEMPLATE}
`;

export const UPDATE_PROMPT_TEMPLATE = gql`
  mutation UpdatePromptTemplate(
    $where: PromptTemplateWhereInput!
    $data: UpdatePromptTemplateInput!
  ) {
    updatePromptTemplate(where: $where, data: $data) {
      ...PromptTemplateFields
    }
  }
  ${PROMPT_TEMPLATE}
`;

export const DELETE_PROMPT_TEMPLATE = gql`
  mutation DeletePromptTemplate($where: PromptTemplateWhereInput!) {
    deletePromptTemplate(where: $where)
  }
`;
