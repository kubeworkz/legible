import { gql } from '@apollo/client';

const REGISTRY_ENTRY_FIELDS = gql`
  fragment RegistryEntryFields on BlueprintRegistryEntryType {
    id
    name
    version
    description
    supportedConnectors
    category
    tags
    sandboxImage
    defaultAgentType
    blueprintYaml
    policyYaml
    inferenceProfiles
    isOfficial
    installCount
    createdAt
    updatedAt
  }
`;

export const LIST_REGISTRY = gql`
  query BlueprintRegistry {
    blueprintRegistry {
      ...RegistryEntryFields
    }
  }
  ${REGISTRY_ENTRY_FIELDS}
`;

export const GET_REGISTRY_ENTRY = gql`
  query BlueprintRegistryEntry($where: BlueprintWhereInput!) {
    blueprintRegistryEntry(where: $where) {
      ...RegistryEntryFields
    }
  }
  ${REGISTRY_ENTRY_FIELDS}
`;

export const SEARCH_REGISTRY_BY_CONNECTOR = gql`
  query BlueprintRegistryByConnector($connectorType: String!) {
    blueprintRegistryByConnector(connectorType: $connectorType) {
      ...RegistryEntryFields
    }
  }
  ${REGISTRY_ENTRY_FIELDS}
`;

export const SEARCH_REGISTRY_BY_CATEGORY = gql`
  query BlueprintRegistryByCategory($category: String!) {
    blueprintRegistryByCategory(category: $category) {
      ...RegistryEntryFields
    }
  }
  ${REGISTRY_ENTRY_FIELDS}
`;

export const RECOMMEND_BLUEPRINT = gql`
  query RecommendedBlueprint($connectorType: String!) {
    recommendedBlueprint(connectorType: $connectorType) {
      ...RegistryEntryFields
    }
  }
  ${REGISTRY_ENTRY_FIELDS}
`;

export const INSTALL_REGISTRY_ENTRY = gql`
  mutation InstallRegistryEntry($registryEntryId: Int!) {
    installRegistryEntry(registryEntryId: $registryEntryId) {
      blueprintId
    }
  }
`;

export const CREATE_REGISTRY_ENTRY = gql`
  mutation CreateRegistryEntry($data: CreateRegistryEntryInput!) {
    createRegistryEntry(data: $data) {
      ...RegistryEntryFields
    }
  }
  ${REGISTRY_ENTRY_FIELDS}
`;

export const DELETE_REGISTRY_ENTRY = gql`
  mutation DeleteRegistryEntry($where: BlueprintWhereInput!) {
    deleteRegistryEntry(where: $where)
  }
`;

// Auto-Provision

export const GET_AUTO_PROVISION_CONFIG = gql`
  query AutoProvisionConfig {
    autoProvisionConfig {
      id
      projectId
      enabled
      connectorType
      blueprintId
      blueprintRegistryName
      inferenceProfile
      agentNameTemplate
      createdAt
      updatedAt
    }
  }
`;

export const GET_RECOMMENDED_BLUEPRINT_FOR_CONNECTOR = gql`
  query RecommendedBlueprintForConnector($connectorType: String!) {
    recommendedBlueprintForConnector(connectorType: $connectorType) {
      connectorType
      blueprintName
    }
  }
`;

export const SET_AUTO_PROVISION_CONFIG = gql`
  mutation SetAutoProvisionConfig($data: SetAutoProvisionConfigInput!) {
    setAutoProvisionConfig(data: $data) {
      id
      projectId
      enabled
      connectorType
      blueprintId
      inferenceProfile
      agentNameTemplate
    }
  }
`;

export const PROVISION_AGENT = gql`
  mutation ProvisionAgent($connectorType: String!) {
    provisionAgent(connectorType: $connectorType) {
      agentId
      agentName
      blueprintName
      connectorType
    }
  }
`;
