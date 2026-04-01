import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useWithOnboarding } from '@/hooks/useCheckOnboarding';
import PageLoading from '@/components/PageLoading';

/**
 * /projects/[projectId] — redirects to the appropriate page
 * based on onboarding status (home or setup).
 * This prevents 404s when navigating to /projects/7 or /projects/home.
 */
export default function ProjectIndex() {
  const router = useRouter();
  const { projectId } = router.query;

  // If projectId is not a valid number (e.g. /projects/home), redirect to /
  useEffect(() => {
    if (router.isReady && projectId && isNaN(Number(projectId))) {
      router.replace('/');
    }
  }, [router.isReady, projectId, router]);

  useWithOnboarding();

  return <PageLoading visible />;
}
