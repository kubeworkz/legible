import { gql } from '@apollo/client';

export const GET_PROJECT_PERMISSION_OVERRIDES = gql`
  query GetProjectPermissionOverrides {
    projectPermissionOverrides {
      projectId
      viewerModelingAccess
      viewerKnowledgeAccess
    }
  }
`;

export const UPDATE_PROJECT_PERMISSION_OVERRIDES = gql`
  mutation UpdateProjectPermissionOverrides(
    $data: UpdateProjectPermissionOverridesInput!
  ) {
    updateProjectPermissionOverrides(data: $data) {
      projectId
      viewerModelingAccess
      viewerKnowledgeAccess
    }
  }
`;
