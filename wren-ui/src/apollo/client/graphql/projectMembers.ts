import { gql } from '@apollo/client';

const PROJECT_MEMBER_FIELDS = gql`
  fragment ProjectMemberFields on ProjectMemberType {
    id
    projectId
    userId
    role
    grantedBy
    createdAt
    updatedAt
    user {
      id
      email
      displayName
      avatarUrl
    }
  }
`;

export const LIST_PROJECT_MEMBERS = gql`
  ${PROJECT_MEMBER_FIELDS}
  query ListProjectMembers {
    projectMembers {
      ...ProjectMemberFields
    }
  }
`;

export const ADD_PROJECT_MEMBER = gql`
  ${PROJECT_MEMBER_FIELDS}
  mutation AddProjectMember($data: AddProjectMemberInput!) {
    addProjectMember(data: $data) {
      ...ProjectMemberFields
    }
  }
`;

export const UPDATE_PROJECT_MEMBER_ROLE = gql`
  ${PROJECT_MEMBER_FIELDS}
  mutation UpdateProjectMemberRole($data: UpdateProjectMemberRoleInput!) {
    updateProjectMemberRole(data: $data) {
      ...ProjectMemberFields
    }
  }
`;

export const REMOVE_PROJECT_MEMBER = gql`
  mutation RemoveProjectMember($userId: Int!) {
    removeProjectMember(userId: $userId)
  }
`;
