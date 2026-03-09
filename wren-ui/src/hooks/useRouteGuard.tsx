import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { Path, buildPath } from '@/utils/enum';
import useProjectRole from '@/hooks/useProjectRole';
import useProject from '@/hooks/useProject';
import useOrganization from '@/hooks/useOrganization';

/**
 * Redirects users to Home if they navigate to a section they lack permission for.
 * Should be called once in the main layout component.
 */
export default function useRouteGuard() {
  const router = useRouter();
  const { currentProjectId } = useProject();
  const { canAccessModeling, canAccessKnowledge, canAdmin, loading } =
    useProjectRole();
  const { isAdmin: isOrgAdmin } = useOrganization();
  const { pathname } = router;

  useEffect(() => {
    if (loading) return;

    const shouldRedirect =
      (!canAccessModeling && pathname.startsWith(Path.Modeling)) ||
      (!canAccessKnowledge && pathname.startsWith(Path.Knowledge)) ||
      (!canAdmin && pathname.startsWith(Path.DataSecurity)) ||
      // Org-admin-only settings pages
      (!isOrgAdmin && pathname.startsWith(Path.SettingsAuditLog)) ||
      (!isOrgAdmin && pathname.startsWith(Path.SettingsMembers)) ||
      (!isOrgAdmin && pathname.startsWith(Path.SettingsApiKeys)) ||
      (!isOrgAdmin && pathname.startsWith(Path.SettingsOrgDangerZone)) ||
      // Project-admin-only settings pages
      (!canAdmin && pathname.startsWith(Path.SettingsAccessControl)) ||
      (!canAdmin && pathname.startsWith(Path.SettingsDangerZone)) ||
      (!canAdmin && pathname.startsWith(Path.SettingsProjectApiKeys)) ||
      (!canAdmin && pathname.startsWith(Path.SettingsByok));

    if (shouldRedirect) {
      router.replace(buildPath(Path.Home, currentProjectId));
    }
  }, [
    pathname,
    canAccessModeling,
    canAccessKnowledge,
    canAdmin,
    isOrgAdmin,
    loading,
    currentProjectId,
    router,
  ]);
}
