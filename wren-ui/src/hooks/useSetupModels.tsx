import { useState } from 'react';
import { Path, buildPath, SETUP } from '@/utils/enum';
import { useRouter } from 'next/router';
import useProject from '@/hooks/useProject';
import {
  useListDataSourceTablesQuery,
  useSaveTablesMutation,
} from '@/apollo/client/graphql/dataSource.generated';

export default function useSetupModels() {
  const [stepKey] = useState(SETUP.SELECT_MODELS);

  const router = useRouter();
  const { currentProjectId } = useProject();

  const { data, loading: fetching } = useListDataSourceTablesQuery({
    fetchPolicy: 'no-cache',
    onError: (error) => console.error(error),
  });

  // Handle errors via try/catch blocks rather than onError callback
  const [saveTablesMutation, { loading: submitting }] = useSaveTablesMutation();

  const submitModels = async (tables: string[]) => {
    try {
      await saveTablesMutation({
        variables: {
          data: { tables },
        },
      });
      router.push(buildPath(Path.OnboardingRelationships, currentProjectId));
    } catch (error) {
      console.error(error);
    }
  };

  const onBack = () => {
    router.push(buildPath(Path.OnboardingConnection, currentProjectId));
  };

  const onNext = (data: { selectedTables: string[] }) => {
    submitModels(data.selectedTables);
  };

  return {
    submitting,
    fetching,
    stepKey,
    onBack,
    onNext,
    tables: data?.listDataSourceTables || [],
  };
}
