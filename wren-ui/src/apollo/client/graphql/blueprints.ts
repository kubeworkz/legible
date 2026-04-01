import { gql } from '@apollo/client';

const BLUEPRINT_FIELDS = gql`
  fragment BlueprintFields on BlueprintType {
    id
    projectId
    name
    version
    description
    blueprintYaml
    sandboxImage
    defaultAgentType
    inferenceProfiles
    policyYaml
    isBuiltin
    createdAt
    updatedAt
  }
`;

export const LIST_BLUEPRINTS = gql`
  query Blueprints {
    blueprints {
      ...BlueprintFields
    }
  }
  ${BLUEPRINT_FIELDS}
`;

export const GET_BLUEPRINT = gql`
  query Blueprint($where: BlueprintWhereInput!) {
    blueprint(where: $where) {
      ...BlueprintFields
    }
  }
  ${BLUEPRINT_FIELDS}
`;

export const GET_BLUEPRINT_BY_NAME = gql`
  query BlueprintByName($where: BlueprintWhereByNameInput!) {
    blueprintByName(where: $where) {
      ...BlueprintFields
    }
  }
  ${BLUEPRINT_FIELDS}
`;

export const CREATE_BLUEPRINT = gql`
  mutation CreateBlueprint($data: CreateBlueprintInput!) {
    createBlueprint(data: $data) {
      ...BlueprintFields
    }
  }
  ${BLUEPRINT_FIELDS}
`;

export const UPDATE_BLUEPRINT = gql`
  mutation UpdateBlueprint(
    $where: BlueprintWhereInput!
    $data: UpdateBlueprintInput!
  ) {
    updateBlueprint(where: $where, data: $data) {
      ...BlueprintFields
    }
  }
  ${BLUEPRINT_FIELDS}
`;

export const DELETE_BLUEPRINT = gql`
  mutation DeleteBlueprint($where: BlueprintWhereInput!) {
    deleteBlueprint(where: $where)
  }
`;
