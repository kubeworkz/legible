import { gql } from '@apollo/client';

const GATEWAY = gql`
  fragment GatewayFields on GatewayType {
    id
    organizationId
    status
    endpoint
    port
    pid
    cpus
    memory
    sandboxCount
    maxSandboxes
    version
    errorMessage
    lastHealthCheck
    createdAt
    updatedAt
  }
`;

export const GET_GATEWAY = gql`
  query Gateway($where: GatewayWhereInput!) {
    gateway(where: $where) {
      ...GatewayFields
    }
  }
  ${GATEWAY}
`;

export const GET_GATEWAY_FOR_ORG = gql`
  query GatewayForOrganization($organizationId: Int!) {
    gatewayForOrganization(organizationId: $organizationId) {
      ...GatewayFields
    }
  }
  ${GATEWAY}
`;

export const LIST_RUNNING_GATEWAYS = gql`
  query RunningGateways {
    runningGateways {
      ...GatewayFields
    }
  }
  ${GATEWAY}
`;

export const CREATE_GATEWAY = gql`
  mutation CreateGateway($data: CreateGatewayInput!) {
    createGateway(data: $data) {
      ...GatewayFields
    }
  }
  ${GATEWAY}
`;

export const UPDATE_GATEWAY = gql`
  mutation UpdateGateway($where: GatewayWhereInput!, $data: UpdateGatewayInput!) {
    updateGateway(where: $where, data: $data) {
      ...GatewayFields
    }
  }
  ${GATEWAY}
`;

export const DELETE_GATEWAY = gql`
  mutation DeleteGateway($where: GatewayWhereInput!) {
    deleteGateway(where: $where)
  }
`;
