import { useQuery } from '@apollo/client';
import { MY_PROJECT_ROLE } from '@/apollo/client/graphql/projectMembers';

export type ProjectRoleName = 'OWNER' | 'CONTRIBUTOR' | 'VIEWER';

export interface ProjectRoleInfo {
  role: ProjectRoleName;
  canWrite: boolean;
  canAdmin: boolean;
  canAccessModeling: boolean;
  canAccessKnowledge: boolean;
}

export default function useProjectRole() {
  const { data, loading, error } = useQuery(MY_PROJECT_ROLE, {
    fetchPolicy: 'cache-and-network',
  });

  const roleData: ProjectRoleInfo | null = data?.myProjectRole ?? null;

  return {
    role: roleData?.role ?? null,
    canWrite: roleData?.canWrite ?? false,
    canAdmin: roleData?.canAdmin ?? false,
    canAccessModeling: roleData?.canAccessModeling ?? true,
    canAccessKnowledge: roleData?.canAccessKnowledge ?? true,
    loading,
    error,
  };
}
