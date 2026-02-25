import { useEffect } from 'react';
import { useRouter } from 'next/router';
import useProject from '@/hooks/useProject';
import PageLoading from '@/components/PageLoading';

/**
 * Redirects old-style routes (e.g. /home, /modeling) to the new
 * /projects/[projectId]/... URLs. Used as a catch-all page component
 * at each legacy route prefix.
 */
export default function LegacyRedirect() {
  const router = useRouter();
  const { currentProjectId } = useProject();

  useEffect(() => {
    if (currentProjectId && router.isReady) {
      const newPath = `/projects/${currentProjectId}${router.asPath}`;
      router.replace(newPath);
    }
  }, [currentProjectId, router.isReady, router.asPath]);

  return <PageLoading visible />;
}
