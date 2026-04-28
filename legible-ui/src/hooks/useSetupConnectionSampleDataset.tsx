import { useRouter } from 'next/router';
import { useCallback } from 'react';
import { Path, buildPath } from '@/utils/enum';
import { ONBOARDING_STATUS } from '@/apollo/client/graphql/onboarding';
import { LIST_PROJECTS } from '@/apollo/client/graphql/project';
import { useStartSampleDatasetMutation } from '@/apollo/client/graphql/dataSource.generated';
import { SampleDatasetName } from '@/apollo/client/graphql/__types__';
import useProject from '@/hooks/useProject';

export default function useSetupConnectionSampleDataset() {
  const router = useRouter();
  const { setCurrentProjectId } = useProject();

  const [startSampleDatasetMutation, { loading, error }] =
    useStartSampleDatasetMutation({
      onError: (error) => console.error(error),
      onCompleted: (data) => {
        // Switch to the newly created project — update React state so the
        // HeaderBar and all consumers of useProject() reflect the new project
        // immediately without requiring a hard refresh.
        const projectId = data?.startSampleDataset?.projectId;
        if (projectId) {
          setCurrentProjectId(projectId);
        }
        router.push(buildPath(Path.Modeling, projectId || 0));
      },
      refetchQueries: [{ query: ONBOARDING_STATUS }, { query: LIST_PROJECTS }],
      awaitRefetchQueries: true,
    });

  const saveSampleDataset = useCallback(
    async (template: SampleDatasetName) => {
      await startSampleDatasetMutation({
        variables: { data: { name: template } },
      });
    },
    [startSampleDatasetMutation],
  );

  return {
    loading,
    error,
    saveSampleDataset,
  };
}
