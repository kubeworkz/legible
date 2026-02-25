import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useQuery, useMutation } from '@apollo/client';
import {
  LIST_ORGANIZATIONS,
  GET_ORGANIZATION,
  ORGANIZATION_MEMBERS,
  CREATE_ORGANIZATION,
  UPDATE_ORGANIZATION,
  DELETE_ORGANIZATION,
  INVITE_MEMBER,
  UPDATE_MEMBER_ROLE,
  REMOVE_MEMBER,
} from '@/apollo/client/graphql/auth';
import useAuth from '@/hooks/useAuth';

const ORG_STORAGE_KEY = 'wren-current-org-id';

// ── localStorage helpers ────────────────────────────────────────

export function getStoredOrgId(): number | undefined {
  if (typeof window === 'undefined') return undefined;
  const stored = localStorage.getItem(ORG_STORAGE_KEY);
  if (stored) {
    const parsed = Number(stored);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function setStoredOrgId(id: number | undefined) {
  if (typeof window === 'undefined') return;
  if (id !== undefined) {
    localStorage.setItem(ORG_STORAGE_KEY, String(id));
  } else {
    localStorage.removeItem(ORG_STORAGE_KEY);
  }
}

// ── Types ───────────────────────────────────────────────────────

export type MemberRole = 'OWNER' | 'ADMIN' | 'MEMBER';

export interface OrganizationInfo {
  id: number;
  displayName: string;
  slug: string;
  logoUrl?: string;
  currentUserRole?: MemberRole;
  createdAt: string;
  updatedAt: string;
}

export interface MemberInfo {
  id: number;
  organizationId: number;
  userId: number;
  role: MemberRole;
  user: {
    id: number;
    email: string;
    displayName?: string;
    avatarUrl?: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface OrganizationContextValue {
  /** All organizations the user belongs to */
  organizations: OrganizationInfo[];
  /** Currently selected organization */
  currentOrganization: OrganizationInfo | null;
  /** Currently selected organization ID */
  currentOrgId: number | undefined;
  /** Switch to a different organization */
  setCurrentOrgId: (id: number) => void;
  /** Whether orgs are still loading */
  loading: boolean;
  /** Members of the current organization */
  members: MemberInfo[];
  /** Whether members are loading */
  membersLoading: boolean;
  /** Current user's role in the current org */
  currentUserRole: MemberRole | undefined;
  /** Whether current user is owner or admin */
  isAdmin: boolean;
  /** Refetch organizations */
  refetchOrganizations: () => Promise<void>;
  /** Refetch members */
  refetchMembers: () => Promise<void>;
  /** Create a new organization */
  createOrganization: (data: {
    displayName: string;
    slug: string;
    logoUrl?: string;
  }) => Promise<OrganizationInfo>;
  /** Update current organization */
  updateOrganization: (data: {
    displayName?: string;
    slug?: string;
    logoUrl?: string;
  }) => Promise<OrganizationInfo>;
  /** Delete current organization */
  deleteOrganization: () => Promise<void>;
  /** Invite a member to the current org */
  inviteMember: (email: string, role?: MemberRole) => Promise<void>;
  /** Update a member's role */
  updateMemberRole: (memberId: number, role: MemberRole) => Promise<void>;
  /** Remove a member from the current org */
  removeMember: (memberId: number) => Promise<void>;
}

// ── Context ─────────────────────────────────────────────────────

const OrganizationContext = createContext<OrganizationContextValue>(
  {} as OrganizationContextValue,
);

export function OrganizationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated } = useAuth();
  const [currentOrgId, setCurrentOrgIdState] = useState<number | undefined>(
    () => getStoredOrgId(),
  );

  // ── Fetch organizations ─────────────────────────────────────

  const {
    data: orgsData,
    loading: orgsLoading,
    refetch: refetchOrgs,
  } = useQuery(LIST_ORGANIZATIONS, {
    skip: !isAuthenticated,
    fetchPolicy: 'cache-and-network',
  });

  const organizations: OrganizationInfo[] = useMemo(
    () => orgsData?.listOrganizations ?? [],
    [orgsData],
  );

  // Auto-select first org if none selected or current is invalid
  useEffect(() => {
    if (orgsLoading || organizations.length === 0) return;
    const valid = organizations.some((o) => o.id === currentOrgId);
    if (!valid) {
      const firstId = organizations[0].id;
      setCurrentOrgIdState(firstId);
      setStoredOrgId(firstId);
    }
  }, [organizations, orgsLoading, currentOrgId]);

  const currentOrganization = useMemo(
    () => organizations.find((o) => o.id === currentOrgId) ?? null,
    [organizations, currentOrgId],
  );

  const currentUserRole = currentOrganization?.currentUserRole;
  const isAdmin =
    currentUserRole === 'OWNER' || currentUserRole === 'ADMIN';

  // ── Fetch members ───────────────────────────────────────────

  const {
    data: membersData,
    loading: membersLoading,
    refetch: refetchMembersQuery,
  } = useQuery(ORGANIZATION_MEMBERS, {
    skip: !currentOrgId || !isAuthenticated,
    variables: { organizationId: currentOrgId },
    fetchPolicy: 'cache-and-network',
  });

  const members: MemberInfo[] = useMemo(
    () => membersData?.organizationMembers ?? [],
    [membersData],
  );

  // ── Mutations ───────────────────────────────────────────────

  const [createOrgMutation] = useMutation(CREATE_ORGANIZATION);
  const [updateOrgMutation] = useMutation(UPDATE_ORGANIZATION);
  const [deleteOrgMutation] = useMutation(DELETE_ORGANIZATION);
  const [inviteMemberMutation] = useMutation(INVITE_MEMBER);
  const [updateRoleMutation] = useMutation(UPDATE_MEMBER_ROLE);
  const [removeMemberMutation] = useMutation(REMOVE_MEMBER);

  // ── Callbacks ───────────────────────────────────────────────

  const setCurrentOrgId = useCallback((id: number) => {
    setCurrentOrgIdState(id);
    setStoredOrgId(id);
  }, []);

  const refetchOrganizations = useCallback(async () => {
    await refetchOrgs();
  }, [refetchOrgs]);

  const refetchMembers = useCallback(async () => {
    if (currentOrgId) {
      await refetchMembersQuery({ organizationId: currentOrgId });
    }
  }, [currentOrgId, refetchMembersQuery]);

  const handleCreateOrganization = useCallback(
    async (data: { displayName: string; slug: string; logoUrl?: string }) => {
      const { data: result } = await createOrgMutation({
        variables: { data },
      });
      await refetchOrgs();
      const newOrg = result.createOrganization;
      setCurrentOrgIdState(newOrg.id);
      setStoredOrgId(newOrg.id);
      return newOrg;
    },
    [createOrgMutation, refetchOrgs],
  );

  const handleUpdateOrganization = useCallback(
    async (data: { displayName?: string; slug?: string; logoUrl?: string }) => {
      if (!currentOrgId) throw new Error('No organization selected');
      const { data: result } = await updateOrgMutation({
        variables: { organizationId: currentOrgId, data },
      });
      await refetchOrgs();
      return result.updateOrganization;
    },
    [currentOrgId, updateOrgMutation, refetchOrgs],
  );

  const handleDeleteOrganization = useCallback(async () => {
    if (!currentOrgId) throw new Error('No organization selected');
    await deleteOrgMutation({ variables: { organizationId: currentOrgId } });
    const remaining = organizations.filter((o) => o.id !== currentOrgId);
    if (remaining.length > 0) {
      setCurrentOrgIdState(remaining[0].id);
      setStoredOrgId(remaining[0].id);
    } else {
      setCurrentOrgIdState(undefined);
      setStoredOrgId(undefined);
    }
    await refetchOrgs();
  }, [currentOrgId, organizations, deleteOrgMutation, refetchOrgs]);

  const handleInviteMember = useCallback(
    async (email: string, role: MemberRole = 'MEMBER') => {
      if (!currentOrgId) throw new Error('No organization selected');
      await inviteMemberMutation({
        variables: { data: { organizationId: currentOrgId, email, role } },
      });
    },
    [currentOrgId, inviteMemberMutation],
  );

  const handleUpdateMemberRole = useCallback(
    async (memberId: number, role: MemberRole) => {
      await updateRoleMutation({
        variables: { data: { memberId, role } },
      });
      await refetchMembersQuery({ organizationId: currentOrgId });
    },
    [updateRoleMutation, refetchMembersQuery, currentOrgId],
  );

  const handleRemoveMember = useCallback(
    async (memberId: number) => {
      await removeMemberMutation({ variables: { memberId } });
      await refetchMembersQuery({ organizationId: currentOrgId });
    },
    [removeMemberMutation, refetchMembersQuery, currentOrgId],
  );

  // ── Value ───────────────────────────────────────────────────

  const value = useMemo<OrganizationContextValue>(
    () => ({
      organizations,
      currentOrganization,
      currentOrgId,
      setCurrentOrgId,
      loading: orgsLoading,
      members,
      membersLoading,
      currentUserRole,
      isAdmin,
      refetchOrganizations,
      refetchMembers,
      createOrganization: handleCreateOrganization,
      updateOrganization: handleUpdateOrganization,
      deleteOrganization: handleDeleteOrganization,
      inviteMember: handleInviteMember,
      updateMemberRole: handleUpdateMemberRole,
      removeMember: handleRemoveMember,
    }),
    [
      organizations,
      currentOrganization,
      currentOrgId,
      setCurrentOrgId,
      orgsLoading,
      members,
      membersLoading,
      currentUserRole,
      isAdmin,
      refetchOrganizations,
      refetchMembers,
      handleCreateOrganization,
      handleUpdateOrganization,
      handleDeleteOrganization,
      handleInviteMember,
      handleUpdateMemberRole,
      handleRemoveMember,
    ],
  );

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
}

export default function useOrganization(): OrganizationContextValue {
  return useContext(OrganizationContext);
}
