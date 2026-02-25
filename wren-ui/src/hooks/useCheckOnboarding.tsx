import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useOnboardingStatusQuery } from '@/apollo/client/graphql/onboarding.generated';
import { OnboardingStatus } from '@/apollo/client/graphql/__types__';
import { Path, buildPath } from '@/utils/enum';
import useProject, { getStoredProjectId } from '@/hooks/useProject';

const redirectRoute = {
  [OnboardingStatus.DATASOURCE_SAVED]: Path.OnboardingModels,
  [OnboardingStatus.NOT_STARTED]: Path.OnboardingConnection,
  [OnboardingStatus.ONBOARDING_FINISHED]: Path.Modeling,
  [OnboardingStatus.WITH_SAMPLE_DATASET]: Path.Modeling,
};

export const useWithOnboarding = () => {
  const router = useRouter();
  const { data, loading } = useOnboardingStatusQuery();
  const { currentProjectId } = useProject();

  const onboardingStatus = data?.onboardingStatus?.status;

  useEffect(() => {
    if (onboardingStatus) {
      const newPath = redirectRoute[onboardingStatus];
      const pathname = router.pathname;
      const isOnSetupPage = pathname.startsWith(Path.Onboarding);
      const isIndexPage = pathname === '/';
      const projectId =
        (router.query.projectId as string) ||
        currentProjectId ||
        getStoredProjectId() ||
        0;

      // --- Onboarding NOT completed ---
      if (newPath && newPath !== Path.Modeling) {
        // In multi-project, only redirect to onboarding from:
        //   1. The index page (/)
        //   2. Other setup pages (allow navigating within the setup flow)
        // Do NOT redirect users who are on app pages like /home, /modeling, etc.
        if (isIndexPage) {
          router.push(buildPath(newPath, projectId));
          return;
        }

        // Allow navigating between setup steps
        if (isOnSetupPage) {
          // don't redirect if already on the target page
          if (newPath === pathname) {
            return;
          }
          // allow going back to previous steps within setup
          return;
        }

        // On app pages (/home, /modeling, etc.) — don't redirect.
        // The user can use the project switcher to navigate or set up the project.
        return;
      }

      // --- Onboarding IS completed ---

      // redirect to the modeling page when entering the Index page
      if (isIndexPage) {
        router.push(buildPath(newPath, projectId));
        return;
      }

      // redirect to modeling page since user using sample dataset
      if (
        pathname === Path.OnboardingRelationships &&
        onboardingStatus === OnboardingStatus.WITH_SAMPLE_DATASET
      ) {
        router.push(buildPath(newPath, projectId));
        return;
      }

      // redirect to modeling page when entering the connection page or select models page
      if (
        [Path.OnboardingConnection, Path.OnboardingModels].includes(
          pathname as Path,
        )
      ) {
        router.push(buildPath(newPath, projectId));
        return;
      }
    }
  }, [onboardingStatus, router.pathname, currentProjectId]);

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
