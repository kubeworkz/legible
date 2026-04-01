/**
 * Hand-written generated hooks for gateways GraphQL operations.
 * These will be replaced by codegen output when `npm run codegen` is run.
 */
import * as Apollo from '@apollo/client';
import {
  GET_GATEWAY,
  GET_GATEWAY_FOR_ORG,
  LIST_RUNNING_GATEWAYS,
  CREATE_GATEWAY,
  UPDATE_GATEWAY,
  DELETE_GATEWAY,
} from './gateways';

// --- Fragment types ---

export interface GatewayFieldsFragment {
  id: number;
  organizationId: number;
  status: string;
  endpoint: string | null;
  port: number | null;
  pid: number | null;
  cpus: string;
  memory: string;
  sandboxCount: number;
  maxSandboxes: number;
  version: string | null;
  errorMessage: string | null;
  lastHealthCheck: string | null;
  createdAt: string;
  updatedAt: string;
}

// --- Query types ---

export interface GatewayQuery {
  gateway: GatewayFieldsFragment;
}

export interface GatewayQueryVariables {
  where: { id: number };
}

export interface GatewayForOrganizationQuery {
  gatewayForOrganization: GatewayFieldsFragment | null;
}

export interface GatewayForOrganizationQueryVariables {
  organizationId: number;
}

export interface RunningGatewaysQuery {
  runningGateways: GatewayFieldsFragment[];
}

// --- Mutation types ---

export interface CreateGatewayMutationVariables {
  data: {
    organizationId: number;
    cpus?: string;
    memory?: string;
    maxSandboxes?: number;
  };
}

export interface CreateGatewayMutation {
  createGateway: GatewayFieldsFragment;
}

export interface UpdateGatewayMutationVariables {
  where: { id: number };
  data: {
    status?: string;
    endpoint?: string;
    port?: number;
    pid?: number;
    cpus?: string;
    memory?: string;
    maxSandboxes?: number;
    version?: string;
    errorMessage?: string;
    lastHealthCheck?: string;
  };
}

export interface UpdateGatewayMutation {
  updateGateway: GatewayFieldsFragment;
}

export interface DeleteGatewayMutationVariables {
  where: { id: number };
}

export interface DeleteGatewayMutation {
  deleteGateway: boolean;
}

// --- Query hooks ---

export function useGatewayQuery(
  options: Apollo.QueryHookOptions<GatewayQuery, GatewayQueryVariables>,
) {
  return Apollo.useQuery<GatewayQuery, GatewayQueryVariables>(
    GET_GATEWAY,
    options,
  );
}

export function useGatewayLazyQuery(
  options?: Apollo.LazyQueryHookOptions<GatewayQuery, GatewayQueryVariables>,
) {
  return Apollo.useLazyQuery<GatewayQuery, GatewayQueryVariables>(
    GET_GATEWAY,
    options,
  );
}

export function useGatewayForOrgQuery(
  options: Apollo.QueryHookOptions<
    GatewayForOrganizationQuery,
    GatewayForOrganizationQueryVariables
  >,
) {
  return Apollo.useQuery<
    GatewayForOrganizationQuery,
    GatewayForOrganizationQueryVariables
  >(GET_GATEWAY_FOR_ORG, options);
}

export function useGatewayForOrgLazyQuery(
  options?: Apollo.LazyQueryHookOptions<
    GatewayForOrganizationQuery,
    GatewayForOrganizationQueryVariables
  >,
) {
  return Apollo.useLazyQuery<
    GatewayForOrganizationQuery,
    GatewayForOrganizationQueryVariables
  >(GET_GATEWAY_FOR_ORG, options);
}

export function useRunningGatewaysQuery(
  options?: Apollo.QueryHookOptions<RunningGatewaysQuery>,
) {
  return Apollo.useQuery<RunningGatewaysQuery>(
    LIST_RUNNING_GATEWAYS,
    options,
  );
}

export function useRunningGatewaysLazyQuery(
  options?: Apollo.LazyQueryHookOptions<RunningGatewaysQuery>,
) {
  return Apollo.useLazyQuery<RunningGatewaysQuery>(
    LIST_RUNNING_GATEWAYS,
    options,
  );
}

// --- Mutation hooks ---

export function useCreateGatewayMutation(
  options?: Apollo.MutationHookOptions<
    CreateGatewayMutation,
    CreateGatewayMutationVariables
  >,
) {
  return Apollo.useMutation<
    CreateGatewayMutation,
    CreateGatewayMutationVariables
  >(CREATE_GATEWAY, options);
}

export function useUpdateGatewayMutation(
  options?: Apollo.MutationHookOptions<
    UpdateGatewayMutation,
    UpdateGatewayMutationVariables
  >,
) {
  return Apollo.useMutation<
    UpdateGatewayMutation,
    UpdateGatewayMutationVariables
  >(UPDATE_GATEWAY, options);
}

export function useDeleteGatewayMutation(
  options?: Apollo.MutationHookOptions<
    DeleteGatewayMutation,
    DeleteGatewayMutationVariables
  >,
) {
  return Apollo.useMutation<
    DeleteGatewayMutation,
    DeleteGatewayMutationVariables
  >(DELETE_GATEWAY, options);
}
