import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useOnboardingStatusQuery } from '@/apollo/client/graphql/onboarding.generated';
import { OnboardingStatus } from '@/apollo/client/graphql/__types__';
import { Path, buildPath } from '@/utils/enum';
import useProject from '@/hooks/useProject';
import useOrganization from '@/hooks/useOrganization';
import useAuth from '@/hooks/useAuth';

const redirectRoute = {
  [OnboardingStatus.DATASOURCE_SAVED]: Path.OnboardingModels,
  [OnboardingStatus.NOT_STARTED]: Path.OnboardingConnection,
  [OnboardingStatus.ONBOARDING_FINISHED]: Path.Home,
  [OnboardingStatus.WITH_SAMPLE_DATASET]: Path.Home,
};

export const useWithOnboarding = () => {
  const router = useRouter();
  const { loading: authLoading, isAuthenticated } = useAuth();
  const { currentProjectId, loading: projectsLoading, projects } = useProject();
  const { organizations, loading: orgsLoading } = useOrganization();

  // Wait for projects to load and validate the currentProjectId before
  // querying onboarding status. This prevents stale project IDs (e.g. from
  // localStorage of a deleted project) from being used in the X-Project-Id header.
  // We also verify the ID exists in the loaded projects list so the query stays
  // skipped until the useProject hook has corrected a stale ID.
  const projectsReady = !projectsLoading && projects.length > 0 && !!currentProjectId && projects.some((p) => p.id === currentProjectId);

  // If the user has no organizations (e.g. after deleting the last one),
  // redirect to login to avoid an infinite loading spinner.
  // Wait for auth to settle first — when auth is pending the org query is
  // skipped, so orgsLoading=false and organizations=[] doesn't mean "no orgs".
  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    if (!orgsLoading && organizations.length === 0) {
      router.replace('/login');
    }
  }, [authLoading, isAuthenticated, orgsLoading, organizations, router]);

  const { data, loading, error: onboardingError } = useOnboardingStatusQuery({
    skip: !projectsReady,
    fetchPolicy: 'network-only',
  });

  const onboardingStatus = data?.onboardingStatus?.status;

  // If the onboarding status query fails but we have a valid project,
  // redirect to home anyway instead of staying on the loading spinner forever.
  useEffect(() => {
    if (!projectsReady || !onboardingError) return;
    if (router.pathname === '/' && currentProjectId) {
      router.push(buildPath(Path.Home, currentProjectId));
    }
  }, [projectsReady, onboardingError, currentProjectId, router.pathname]);

  useEffect(() => {
    if (!projectsReady) return;
    if (onboardingStatus) {
      const newPath = redirectRoute[onboardingStatus];
      const pathname = router.pathname;
      const isOnSetupPage = pathname.startsWith(Path.Onboarding);
      const isIndexPage = pathname === '/';
      const projectId = currentProjectId;

      // --- Onboarding NOT completed ---
      if (newPath && newPath !== Path.Home) {
        if (isIndexPage) {
          router.push(buildPath(newPath, projectId));
          return;
        }
        if (isOnSetupPage) {
          if (newPath === pathname) {
            return;
          }
          return;
        }
        // Pages that require data models — redirect to setup when incomplete.
        const requiresOnboarding =
          pathname.startsWith(Path.Modeling) ||
          pathname.startsWith(Path.Knowledge) ||
          pathname.startsWith(Path.DataSecurity);
        if (requiresOnboarding) {
          router.push(buildPath(newPath, projectId));
        }
        return;
      }

      // --- Onboarding IS completed ---
      if (isIndexPage) {
        router.push(buildPath(newPath, projectId));
        return;
      }
      if (
        pathname === Path.OnboardingRelationships &&
        onboardingStatus === OnboardingStatus.WITH_SAMPLE_DATASET
      ) {
        router.push(buildPath(newPath, projectId));
        return;
      }
      if (
        [Path.OnboardingConnection, Path.OnboardingModels].includes(
          pathname as Path,
        )
      ) {
        router.push(buildPath(newPath, projectId));
        return;
      }
    }
  }, [onboardingStatus, router.pathname, currentProjectId, projectsReady]);

  return {
    loading,
    onboardingStatus,
  };
};

export default function useOnboardingStatus() {
  const { data, loading, error, refetch } = useOnboardingStatusQuery();

  return {
    loading,
    error,
    refetch,
    onboardingStatus: data?.onboardingStatus?.status,
  };
}
