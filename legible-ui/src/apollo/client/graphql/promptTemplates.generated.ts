/**
 * Hand-written generated hooks for promptTemplates GraphQL operations.
 * These will be replaced by codegen output when `npm run codegen` is run.
 */
import * as Apollo from '@apollo/client';
import {
  LIST_PROMPT_TEMPLATES,
  GET_PROMPT_TEMPLATE,
  LIST_PROMPT_TEMPLATE_VERSIONS,
  CREATE_PROMPT_TEMPLATE,
  UPDATE_PROMPT_TEMPLATE,
  DELETE_PROMPT_TEMPLATE,
} from './promptTemplates';

// --- Fragment types ---

export interface PromptTemplateFieldsFragment {
  id: number;
  projectId: number;
  name: string;
  systemPrompt: string | null;
  userPrompt: string | null;
  variables: any | null;
  model: string | null;
  temperature: number | null;
  maxTokens: number | null;
  tags: string[] | null;
  currentVersion: number;
  createdAt: string;
  updatedAt: string;
}

export interface PromptTemplateVersionFieldsFragment {
  id: number;
  promptTemplateId: number;
  version: number;
  systemPrompt: string | null;
  userPrompt: string | null;
  variables: any | null;
  model: string | null;
  temperature: number | null;
  maxTokens: number | null;
  createdAt: string;
}

// --- Query types ---

export interface PromptTemplatesQuery {
  promptTemplates: PromptTemplateFieldsFragment[];
}

export interface PromptTemplateQuery {
  promptTemplate: PromptTemplateFieldsFragment;
}

export interface PromptTemplateQueryVariables {
  where: { id: number };
}

export interface PromptTemplateVersionsQuery {
  promptTemplateVersions: PromptTemplateVersionFieldsFragment[];
}

export interface PromptTemplateVersionsQueryVariables {
  promptTemplateId: number;
}

// --- Mutation types ---

export interface CreatePromptTemplateMutationVariables {
  data: {
    name: string;
    systemPrompt?: string;
    userPrompt?: string;
    variables?: any;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    tags?: string[];
  };
}

export interface CreatePromptTemplateMutation {
  createPromptTemplate: PromptTemplateFieldsFragment;
}

export interface UpdatePromptTemplateMutationVariables {
  where: { id: number };
  data: {
    name?: string;
    systemPrompt?: string;
    userPrompt?: string;
    variables?: any;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    tags?: string[];
  };
}

export interface UpdatePromptTemplateMutation {
  updatePromptTemplate: PromptTemplateFieldsFragment;
}

export interface DeletePromptTemplateMutationVariables {
  where: { id: number };
}

export interface DeletePromptTemplateMutation {
  deletePromptTemplate: boolean;
}

// --- Hooks ---

export function usePromptTemplatesQuery(
  options?: Apollo.QueryHookOptions<PromptTemplatesQuery, Record<string, never>>,
) {
  return Apollo.useQuery<PromptTemplatesQuery, Record<string, never>>(
    LIST_PROMPT_TEMPLATES,
    options,
  );
}

export function usePromptTemplateQuery(
  options?: Apollo.QueryHookOptions<
    PromptTemplateQuery,
    PromptTemplateQueryVariables
  >,
) {
  return Apollo.useQuery<PromptTemplateQuery, PromptTemplateQueryVariables>(
    GET_PROMPT_TEMPLATE,
    options,
  );
}

export function usePromptTemplateVersionsQuery(
  options?: Apollo.QueryHookOptions<
    PromptTemplateVersionsQuery,
    PromptTemplateVersionsQueryVariables
  >,
) {
  return Apollo.useQuery<
    PromptTemplateVersionsQuery,
    PromptTemplateVersionsQueryVariables
  >(LIST_PROMPT_TEMPLATE_VERSIONS, options);
}

export function useCreatePromptTemplateMutation(
  options?: Apollo.MutationHookOptions<
    CreatePromptTemplateMutation,
    CreatePromptTemplateMutationVariables
  >,
) {
  return Apollo.useMutation<
    CreatePromptTemplateMutation,
    CreatePromptTemplateMutationVariables
  >(CREATE_PROMPT_TEMPLATE, options);
}

export function useUpdatePromptTemplateMutation(
  options?: Apollo.MutationHookOptions<
    UpdatePromptTemplateMutation,
    UpdatePromptTemplateMutationVariables
  >,
) {
  return Apollo.useMutation<
    UpdatePromptTemplateMutation,
    UpdatePromptTemplateMutationVariables
  >(UPDATE_PROMPT_TEMPLATE, options);
}

export function useDeletePromptTemplateMutation(
  options?: Apollo.MutationHookOptions<
    DeletePromptTemplateMutation,
    DeletePromptTemplateMutationVariables
  >,
) {
  return Apollo.useMutation<
    DeletePromptTemplateMutation,
    DeletePromptTemplateMutationVariables
  >(DELETE_PROMPT_TEMPLATE, options);
}
