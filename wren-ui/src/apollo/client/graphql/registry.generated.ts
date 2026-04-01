import { useQuery, useMutation } from '@apollo/client';
import {
  LIST_REGISTRY,
  GET_REGISTRY_ENTRY,
  SEARCH_REGISTRY_BY_CONNECTOR,
  SEARCH_REGISTRY_BY_CATEGORY,
  RECOMMEND_BLUEPRINT,
  INSTALL_REGISTRY_ENTRY,
  CREATE_REGISTRY_ENTRY,
  DELETE_REGISTRY_ENTRY,
  GET_AUTO_PROVISION_CONFIG,
  GET_RECOMMENDED_BLUEPRINT_FOR_CONNECTOR,
  SET_AUTO_PROVISION_CONFIG,
  PROVISION_AGENT,
} from './registry';

// ── Registry Entry Types ────────────────────────────────────────

export interface RegistryEntryData {
  id: number;
  name: string;
  version: string;
  description: string | null;
  supportedConnectors: string[];
  category: string;
  tags: string[] | null;
  sandboxImage: string | null;
  defaultAgentType: string;
  blueprintYaml: string;
  policyYaml: string | null;
  inferenceProfiles: Record<string, any> | null;
  isOfficial: boolean;
  installCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRegistryEntryInput {
  name: string;
  version: string;
  blueprintYaml: string;
  supportedConnectors: string[];
  category: string;
  description?: string;
  tags?: string[];
  sandboxImage?: string;
  defaultAgentType?: string;
  policyYaml?: string;
  inferenceProfiles?: Record<string, any>;
  isOfficial?: boolean;
}

// ── Auto-Provision Types ────────────────────────────────────────

export interface AutoProvisionConfigData {
  id: number;
  projectId: number;
  enabled: boolean;
  connectorType: string;
  blueprintId: number | null;
  blueprintRegistryName: string | null;
  inferenceProfile: string | null;
  agentNameTemplate: string;
  createdAt: string;
  updatedAt: string;
}

export interface SetAutoProvisionConfigInput {
  connectorType: string;
  enabled?: boolean;
  blueprintId?: number;
  blueprintRegistryName?: string;
  inferenceProfile?: string;
  agentNameTemplate?: string;
}

export interface AutoProvisionResult {
  agentId: number;
  agentName: string;
  blueprintName: string;
  connectorType: string;
}

export interface RecommendedBlueprintData {
  connectorType: string;
  blueprintName: string;
}

// ── Registry Hooks ──────────────────────────────────────────────

export function useRegistryQuery() {
  return useQuery<{ blueprintRegistry: RegistryEntryData[] }>(LIST_REGISTRY);
}

export function useRegistryEntryQuery(id: number) {
  return useQuery<{ blueprintRegistryEntry: RegistryEntryData }>(
    GET_REGISTRY_ENTRY,
    { variables: { where: { id } }, skip: !id },
  );
}

export function useRegistryByConnectorQuery(connectorType: string) {
  return useQuery<{ blueprintRegistryByConnector: RegistryEntryData[] }>(
    SEARCH_REGISTRY_BY_CONNECTOR,
    { variables: { connectorType }, skip: !connectorType },
  );
}

export function useRegistryByCategoryQuery(category: string) {
  return useQuery<{ blueprintRegistryByCategory: RegistryEntryData[] }>(
    SEARCH_REGISTRY_BY_CATEGORY,
    { variables: { category }, skip: !category },
  );
}

export function useRecommendedBlueprintQuery(connectorType: string) {
  return useQuery<{ recommendedBlueprint: RegistryEntryData | null }>(
    RECOMMEND_BLUEPRINT,
    { variables: { connectorType }, skip: !connectorType },
  );
}

export function useInstallRegistryEntryMutation() {
  return useMutation<
    { installRegistryEntry: { blueprintId: number } },
    { registryEntryId: number }
  >(INSTALL_REGISTRY_ENTRY, {
    refetchQueries: [{ query: LIST_REGISTRY }],
  });
}

export function useCreateRegistryEntryMutation() {
  return useMutation<
    { createRegistryEntry: RegistryEntryData },
    { data: CreateRegistryEntryInput }
  >(CREATE_REGISTRY_ENTRY, {
    refetchQueries: [{ query: LIST_REGISTRY }],
  });
}

export function useDeleteRegistryEntryMutation() {
  return useMutation<
    { deleteRegistryEntry: boolean },
    { where: { id: number } }
  >(DELETE_REGISTRY_ENTRY, {
    refetchQueries: [{ query: LIST_REGISTRY }],
  });
}

// ── Auto-Provision Hooks ────────────────────────────────────────

export function useAutoProvisionConfigQuery() {
  return useQuery<{ autoProvisionConfig: AutoProvisionConfigData[] }>(
    GET_AUTO_PROVISION_CONFIG,
  );
}

export function useRecommendedBlueprintForConnectorQuery(
  connectorType: string,
) {
  return useQuery<{
    recommendedBlueprintForConnector: RecommendedBlueprintData | null;
  }>(GET_RECOMMENDED_BLUEPRINT_FOR_CONNECTOR, {
    variables: { connectorType },
    skip: !connectorType,
  });
}

export function useSetAutoProvisionConfigMutation() {
  return useMutation<
    { setAutoProvisionConfig: AutoProvisionConfigData },
    { data: SetAutoProvisionConfigInput }
  >(SET_AUTO_PROVISION_CONFIG, {
    refetchQueries: [{ query: GET_AUTO_PROVISION_CONFIG }],
  });
}

export function useProvisionAgentMutation() {
  return useMutation<
    { provisionAgent: AutoProvisionResult },
    { connectorType: string }
  >(PROVISION_AGENT);
}
