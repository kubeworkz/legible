import { useMemo } from 'react';
import { useRouter } from 'next/router';
import { Path, buildPath } from '@/utils/enum';
import useProject from '@/hooks/useProject';
import {
  useDeleteThreadMutation,
  useThreadsQuery,
  useUpdateThreadMutation,
} from '@/apollo/client/graphql/home.generated';
import {
  useDashboardsQuery,
  useCreateDashboardMutation,
  useUpdateDashboardMutation,
  useDeleteDashboardMutation,
} from '@/apollo/client/graphql/dashboard.generated';

export default function useHomeSidebar() {
  const router = useRouter();
  const { currentProjectId } = useProject();

  // --- Threads ---
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

  // --- Dashboards ---
  const { data: dashboardsData, refetch: refetchDashboards } =
    useDashboardsQuery({
      fetchPolicy: 'cache-and-network',
    });
  const [createDashboard] = useCreateDashboardMutation({
    onError: (error) => console.error(error),
  });
  const [updateDashboard] = useUpdateDashboardMutation({
    onError: (error) => console.error(error),
  });
  const [deleteDashboardMutation] = useDeleteDashboardMutation({
    onError: (error) => console.error(error),
  });

  const dashboards = useMemo(
    () =>
      (dashboardsData?.dashboards || []).map((d) => ({
        id: d.id.toString(),
        name: d.name,
      })),
    [dashboardsData],
  );

  const onDashboardSelect = (selectKeys: string[]) => {
    const dashboardId = selectKeys[0];
    router.push(
      buildPath(Path.HomeDashboardDetail, currentProjectId).replace(
        '[dashboardId]',
        dashboardId,
      ),
    );
  };

  const onDashboardRename = async (id: string, newName: string) => {
    await updateDashboard({
      variables: { where: { id: Number(id) }, data: { name: newName } },
    });
    refetchDashboards();
  };

  const onDashboardDelete = async (id: string) => {
    await deleteDashboardMutation({
      variables: { where: { id: Number(id) } },
    });
    await refetchDashboards();
    // Navigate to the first remaining dashboard or home
    const remaining = dashboards.filter((d) => d.id !== id);
    if (remaining.length > 0) {
      router.push(
        buildPath(Path.HomeDashboardDetail, currentProjectId).replace(
          '[dashboardId]',
          remaining[0].id,
        ),
      );
    } else {
      router.push(buildPath(Path.Home, currentProjectId));
    }
  };

  const onDashboardCreate = async () => {
    const result = await createDashboard({
      variables: { data: { name: 'Untitled Dashboard' } },
    });
    await refetchDashboards();
    const newId = result.data?.createDashboard?.id;
    if (newId) {
      router.push(
        buildPath(Path.HomeDashboardDetail, currentProjectId).replace(
          '[dashboardId]',
          String(newId),
        ),
      );
    }
  };

  return {
    data: { threads, dashboards },
    onSelect,
    onRename,
    onDelete,
    onDashboardSelect,
    onDashboardRename,
    onDashboardDelete,
    onDashboardCreate,
    refetch,
    refetchDashboards,
  };
}
