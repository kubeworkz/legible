import { useRouter } from 'next/router';
import { useCallback } from 'react';
import { Path } from '@/utils/enum';
import { ONBOARDING_STATUS } from '@/apollo/client/graphql/onboarding';
import { useStartSampleDatasetMutation } from '@/apollo/client/graphql/dataSource.generated';
import { SampleDatasetName } from '@/apollo/client/graphql/__types__';

export default function useSetupConnectionSampleDataset() {
  const router = useRouter();

  const [startSampleDatasetMutation, { loading, error }] =
    useStartSampleDatasetMutation({
      onError: (error) => console.error(error),
      onCompleted: (data) => {
        // Switch to the newly created project so subsequent calls use the
        // correct X-Project-Id header
        const projectId = data?.startSampleDataset?.projectId;
        if (projectId && typeof window !== 'undefined') {
          localStorage.setItem('wren-current-project-id', String(projectId));
        }
        router.push(Path.Modeling);
      },
      refetchQueries: [{ query: ONBOARDING_STATUS }],
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
