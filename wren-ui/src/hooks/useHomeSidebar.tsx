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
import {
  useFoldersQuery,
  useCreateFolderMutation,
  useUpdateFolderMutation,
  useDeleteFolderMutation,
  useMoveDashboardToFolderMutation,
  useMoveThreadToFolderMutation,
  useReorderFoldersMutation,
} from '@/apollo/client/graphql/folder.generated';

export interface FolderItem {
  id: number;
  name: string;
  type: string;
  visibility: string;
  sortOrder: number;
}

export interface SidebarItem {
  id: string;
  name: string;
  folderId?: number | null;
}

export interface FolderGroup {
  folder: FolderItem;
  dashboards: SidebarItem[];
  threads: SidebarItem[];
}

export default function useHomeSidebar() {
  const router = useRouter();
  const { currentProjectId } = useProject();

  // --- Folders ---
  const { data: foldersData, refetch: refetchFolders } = useFoldersQuery({
    fetchPolicy: 'cache-and-network',
  });
  const [createFolder] = useCreateFolderMutation({
    onError: (error) => console.error(error),
  });
  const [updateFolder] = useUpdateFolderMutation({
    onError: (error) => console.error(error),
  });
  const [deleteFolderMutation] = useDeleteFolderMutation({
    onError: (error) => console.error(error),
  });
  const [moveDashboardToFolder] = useMoveDashboardToFolderMutation({
    onError: (error) => console.error(error),
  });
  const [moveThreadToFolder] = useMoveThreadToFolderMutation({
    onError: (error) => console.error(error),
  });
  const [reorderFolders] = useReorderFoldersMutation({
    onError: (error) => console.error(error),
  });

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

  const threads: SidebarItem[] = useMemo(
    () =>
      (data?.threads || []).map((thread) => ({
        id: thread.id.toString(),
        name: thread.summary,
        folderId: thread.folderId,
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

  const dashboards: SidebarItem[] = useMemo(
    () =>
      (dashboardsData?.dashboards || []).map((d) => ({
        id: d.id.toString(),
        name: d.name,
        folderId: d.folderId,
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

  const onDashboardCreate = async (folderId?: number) => {
    // Assign to specified folder, or public folder as fallback
    const targetFolderId = folderId ?? folders.find((f) => f.type === 'public')?.id;
    const result = await createDashboard({
      variables: {
        data: {
          name: 'Untitled Dashboard',
          ...(targetFolderId ? { folderId: targetFolderId } : {}),
        },
      },
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

  // --- Folder operations ---
  const folders: FolderItem[] = useMemo(
    () =>
      (foldersData?.folders || []).map((f) => ({
        id: f.id,
        name: f.name,
        type: f.type,
        visibility: f.visibility,
        sortOrder: f.sortOrder,
      })),
    [foldersData],
  );

  // Group items by folder
  const folderGroups: FolderGroup[] = useMemo(() => {
    const groups: FolderGroup[] = [];

    // System folders first (public, personal), then custom by sortOrder
    const sorted = [...folders].sort((a, b) => {
      const typeOrder = { public: 0, personal: 1, custom: 2 };
      const aOrder = typeOrder[a.type] ?? 2;
      const bOrder = typeOrder[b.type] ?? 2;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return a.sortOrder - b.sortOrder;
    });

    for (const folder of sorted) {
      groups.push({
        folder,
        dashboards: dashboards.filter((d) => d.folderId === folder.id),
        threads: threads.filter((t) => t.folderId === folder.id),
      });
    }

    // Items without a folder go into the public folder or an ungrouped section
    const unassignedDashboards = dashboards.filter((d) => !d.folderId);
    const unassignedThreads = threads.filter((t) => !t.folderId);
    if (unassignedDashboards.length > 0 || unassignedThreads.length > 0) {
      const publicGroup = groups.find((g) => g.folder.type === 'public');
      if (publicGroup) {
        publicGroup.dashboards.push(...unassignedDashboards);
        publicGroup.threads.push(...unassignedThreads);
      } else {
        groups.push({
          folder: {
            id: 0,
            name: 'All Items',
            type: 'public',
            visibility: 'shared',
            sortOrder: 0,
          },
          dashboards: unassignedDashboards,
          threads: unassignedThreads,
        });
      }
    }

    return groups;
  }, [folders, dashboards, threads]);

  const onFolderCreate = async (name: string) => {
    await createFolder({
      variables: { data: { name } },
    });
    refetchFolders();
  };

  const onFolderRename = async (id: number, name: string) => {
    await updateFolder({
      variables: { where: { id }, data: { name } },
    });
    refetchFolders();
  };

  const onUpdateFolderVisibility = async (id: number, visibility: string) => {
    await updateFolder({
      variables: { where: { id }, data: { visibility: visibility as any } },
    });
    refetchFolders();
  };

  const onFolderDelete = async (id: number) => {
    await deleteFolderMutation({
      variables: { where: { id } },
    });
    refetchFolders();
    refetchDashboards();
    refetch();
  };

  const onMoveDashboardToFolder = async (
    dashboardId: number,
    folderId: number | null,
  ) => {
    await moveDashboardToFolder({
      variables: { data: { dashboardId, folderId } },
    });
    refetchDashboards();
  };

  const onMoveThreadToFolder = async (
    threadId: number,
    folderId: number | null,
  ) => {
    await moveThreadToFolder({
      variables: { data: { threadId, folderId } },
    });
    refetch();
  };

  const onReorderFolders = async (
    orders: Array<{ id: number; sortOrder: number }>,
  ) => {
    await reorderFolders({
      variables: { data: { orders } },
    });
    refetchFolders();
  };

  return {
    data: { threads, dashboards, folders, folderGroups },
    onSelect,
    onRename,
    onDelete,
    onDashboardSelect,
    onDashboardRename,
    onDashboardDelete,
    onDashboardCreate,
    onFolderCreate,
    onFolderRename,
    onFolderDelete,
    onUpdateFolderVisibility,
    onMoveDashboardToFolder,
    onMoveThreadToFolder,
    onReorderFolders,
    refetch,
    refetchDashboards,
    refetchFolders,
  };
}
