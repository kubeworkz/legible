import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useOnboardingStatusQuery } from '@/apollo/client/graphql/onboarding.generated';
import { OnboardingStatus } from '@/apollo/client/graphql/__types__';
import { Path, buildPath } from '@/utils/enum';
import useProject from '@/hooks/useProject';
import useOrganization from '@/hooks/useOrganization';

const redirectRoute = {
  [OnboardingStatus.DATASOURCE_SAVED]: Path.OnboardingModels,
  [OnboardingStatus.NOT_STARTED]: Path.OnboardingConnection,
  [OnboardingStatus.ONBOARDING_FINISHED]: Path.Home,
  [OnboardingStatus.WITH_SAMPLE_DATASET]: Path.Home,
};

export const useWithOnboarding = () => {
  const router = useRouter();
  const { currentProjectId, loading: projectsLoading, projects } = useProject();
  const { organizations, loading: orgsLoading } = useOrganization();

  // If the user has no organizations (e.g. after deleting the last one),
  // redirect to login to avoid an infinite loading spinner.
  useEffect(() => {
    if (!orgsLoading && organizations.length === 0) {
      router.replace('/login');
    }
  }, [orgsLoading, organizations, router]);

  // Wait for projects to load and validate the currentProjectId before
  // querying onboarding status. This prevents stale project IDs (e.g. from
  // localStorage of a different user) from being used in the X-Project-Id header.
  const projectsReady = !projectsLoading && projects.length > 0 && !!currentProjectId;

  const { data, loading } = useOnboardingStatusQuery({
    skip: !projectsReady,
    fetchPolicy: 'network-only',
  });

  const onboardingStatus = data?.onboardingStatus?.status;

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
