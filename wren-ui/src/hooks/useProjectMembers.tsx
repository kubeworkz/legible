import { useCallback } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import {
  LIST_PROJECT_MEMBERS,
  ADD_PROJECT_MEMBER,
  UPDATE_PROJECT_MEMBER_ROLE,
  REMOVE_PROJECT_MEMBER,
} from '@/apollo/client/graphql/projectMembers';

export type ProjectRole = 'OWNER' | 'CONTRIBUTOR' | 'VIEWER';

export interface ProjectMemberInfo {
  id: number;
  projectId: number;
  userId: number;
  role: ProjectRole;
  grantedBy: number | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: number;
    email: string;
    displayName?: string;
    avatarUrl?: string;
  } | null;
}

export default function useProjectMembers() {
  const {
    data,
    loading,
    refetch: refetchQuery,
  } = useQuery(LIST_PROJECT_MEMBERS, {
    fetchPolicy: 'cache-and-network',
  });

  const [addMemberMutation] = useMutation(ADD_PROJECT_MEMBER, {
    refetchQueries: [{ query: LIST_PROJECT_MEMBERS }],
  });

  const [updateRoleMutation] = useMutation(UPDATE_PROJECT_MEMBER_ROLE, {
    refetchQueries: [{ query: LIST_PROJECT_MEMBERS }],
  });

  const [removeMemberMutation] = useMutation(REMOVE_PROJECT_MEMBER, {
    refetchQueries: [{ query: LIST_PROJECT_MEMBERS }],
  });

  const members: ProjectMemberInfo[] = data?.projectMembers ?? [];

  const refetchMembers = useCallback(async () => {
    await refetchQuery();
  }, [refetchQuery]);

  const addMember = useCallback(
    async (userId: number, role: ProjectRole) => {
      const result = await addMemberMutation({
        variables: { data: { userId, role } },
      });
      return result.data?.addProjectMember;
    },
    [addMemberMutation],
  );

  const updateMemberRole = useCallback(
    async (userId: number, role: ProjectRole) => {
      const result = await updateRoleMutation({
        variables: { data: { userId, role } },
      });
      return result.data?.updateProjectMemberRole;
    },
    [updateRoleMutation],
  );

  const removeMember = useCallback(
    async (userId: number) => {
      await removeMemberMutation({ variables: { userId } });
    },
    [removeMemberMutation],
  );

  return {
    members,
    loading,
    refetchMembers,
    addMember,
    updateMemberRole,
    removeMember,
  };
}
