import { useQuery, useMutation } from '@apollo/client';
import {
  LIST_BLUEPRINTS,
  GET_BLUEPRINT,
  CREATE_BLUEPRINT,
  UPDATE_BLUEPRINT,
  DELETE_BLUEPRINT,
} from './blueprints';

export interface BlueprintData {
  id: number;
  projectId: number;
  name: string;
  version: string;
  description: string | null;
  blueprintYaml: string;
  sandboxImage: string | null;
  defaultAgentType: string | null;
  inferenceProfiles: Record<string, any> | null;
  policyYaml: string | null;
  isBuiltin: boolean;
  supportedConnectors: string[] | null;
  category: string | null;
  tags: string[] | null;
  source: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBlueprintInput {
  name: string;
  blueprintYaml: string;
  version?: string;
  description?: string;
  sandboxImage?: string;
  defaultAgentType?: string;
  inferenceProfiles?: Record<string, any>;
  policyYaml?: string;
  isBuiltin?: boolean;
  supportedConnectors?: string[];
  category?: string;
  tags?: string[];
  source?: string;
}

export interface UpdateBlueprintInput {
  version?: string;
  description?: string;
  blueprintYaml?: string;
  sandboxImage?: string;
  defaultAgentType?: string;
  inferenceProfiles?: Record<string, any>;
  policyYaml?: string;
  supportedConnectors?: string[];
  category?: string;
  tags?: string[];
}

export function useBlueprintsQuery() {
  return useQuery<{ blueprints: BlueprintData[] }>(LIST_BLUEPRINTS);
}

export function useBlueprintQuery(id: number) {
  return useQuery<{ blueprint: BlueprintData }>(GET_BLUEPRINT, {
    variables: { where: { id } },
    skip: !id,
  });
}

export function useCreateBlueprintMutation() {
  return useMutation<
    { createBlueprint: BlueprintData },
    { data: CreateBlueprintInput }
  >(CREATE_BLUEPRINT, {
    refetchQueries: [{ query: LIST_BLUEPRINTS }],
  });
}

export function useUpdateBlueprintMutation() {
  return useMutation<
    { updateBlueprint: BlueprintData },
    { where: { id: number }; data: UpdateBlueprintInput }
  >(UPDATE_BLUEPRINT, {
    refetchQueries: [{ query: LIST_BLUEPRINTS }],
  });
}

export function useDeleteBlueprintMutation() {
  return useMutation<
    { deleteBlueprint: boolean },
    { where: { id: number } }
  >(DELETE_BLUEPRINT, {
    refetchQueries: [{ query: LIST_BLUEPRINTS }],
  });
}
