import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { Path, buildPath } from '@/utils/enum';
import useProjectRole from '@/hooks/useProjectRole';
import useProject from '@/hooks/useProject';

/**
 * Redirects users to Home if they navigate to a section they lack permission for.
 * Should be called once in the main layout component.
 */
export default function useRouteGuard() {
  const router = useRouter();
  const { currentProjectId } = useProject();
  const { canAccessModeling, canAccessKnowledge, canAdmin, loading } =
    useProjectRole();
  const { pathname } = router;

  useEffect(() => {
    if (loading) return;

    const shouldRedirect =
      (!canAccessModeling && pathname.startsWith(Path.Modeling)) ||
      (!canAccessKnowledge && pathname.startsWith(Path.Knowledge)) ||
      (!canAdmin && pathname.startsWith(Path.DataSecurity));

    if (shouldRedirect) {
      router.replace(buildPath(Path.Home, currentProjectId));
    }
  }, [
    pathname,
    canAccessModeling,
    canAccessKnowledge,
    canAdmin,
    loading,
    currentProjectId,
    router,
  ]);
}
