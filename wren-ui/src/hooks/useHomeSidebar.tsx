import { useMemo } from 'react';
import { useRouter } from 'next/router';
import { Path, buildPath } from '@/utils/enum';
import useProject from '@/hooks/useProject';
import {
  useDeleteThreadMutation,
  useThreadsQuery,
  useUpdateThreadMutation,
} from '@/apollo/client/graphql/home.generated';

export default function useHomeSidebar() {
  const router = useRouter();
  const { currentProjectId } = useProject();
  const { data, refetch } = useThreadsQuery({
    fetchPolicy: 'cache-and-network',
  });
  const [updateThread] = useUpdateThreadMutation({
    onError: (error) => console.error(error),
  });
  const [deleteThread] = useDeleteThreadMutation({
    onError: (error) => console.error(error),
  });

  const threads = useMemo(
    () =>
      (data?.threads || []).map((thread) => ({
        id: thread.id.toString(),
        name: thread.summary,
      })),
    [data],
  );

  const onSelect = (selectKeys: string[]) => {
    router.push(`${buildPath(Path.Home, currentProjectId)}/${selectKeys[0]}`);
  };

  const onRename = async (id: string, newName: string) => {
    await updateThread({
      variables: { where: { id: Number(id) }, data: { summary: newName } },
    });
    refetch();
  };

  const onDelete = async (id) => {
    await deleteThread({ variables: { where: { id: Number(id) } } });
    refetch();
  };

  return {
    data: { threads },
    onSelect,
    onRename,
    onDelete,
    refetch,
  };
}
