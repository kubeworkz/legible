import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useParams } from 'next/navigation';
import { Path, buildPath } from '@/utils/enum';
import { useSidebarTreeState } from './SidebarTree';
import FolderTree from './home/FolderTree';
import useProject from '@/hooks/useProject';
import type { FolderGroup, SidebarItem } from '@/hooks/useHomeSidebar';

export interface Props {
  data: {
    threads: SidebarItem[];
    dashboards: SidebarItem[];
    folders: any[];
    folderGroups: FolderGroup[];
  };
  onSelect: (selectKeys) => void;
  onDelete: (id: string) => Promise<void>;
  onRename: (id: string, newName: string) => Promise<void>;
  onDashboardSelect: (selectKeys: string[]) => void;
  onDashboardRename: (id: string, newName: string) => Promise<void>;
  onDashboardDelete: (id: string) => Promise<void>;
  onDashboardCreate: () => Promise<void>;
  onFolderCreate?: (name: string) => Promise<void>;
  onMoveDashboardToFolder?: (dashboardId: number, folderId: number | null) => Promise<void>;
  onMoveThreadToFolder?: (threadId: number, folderId: number | null) => Promise<void>;
}

export default function Home(props: Props) {
  const {
    data,
    onSelect,
    onRename,
    onDelete,
    onDashboardSelect,
    onDashboardRename,
    onDashboardDelete,
    onDashboardCreate,
    onFolderCreate,
    onMoveDashboardToFolder,
    onMoveThreadToFolder,
  } = props;
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { currentProjectId } = useProject();
  const { folderGroups } = data;
  const bp = (path: Path) => buildPath(path, currentProjectId);

  const { treeSelectedKeys, setTreeSelectedKeys } = useSidebarTreeState();

  // Determine selected key from URL
  useEffect(() => {
    const dashboardId = router.query?.dashboardId as string;
    if (dashboardId) {
      setTreeSelectedKeys([`dashboard-${dashboardId}`]);
    } else if (params?.id) {
      setTreeSelectedKeys([`thread-${params.id}`]);
    }
  }, [params?.id, router.query?.dashboardId]);

  const onDeleteThread = async (threadId: string) => {
    try {
      await onDelete(threadId);
      if (params?.id == threadId) {
        router.push(bp(Path.Home));
      }
    } catch (error) {
      console.error(error);
    }
  };

  const onUnifiedSelect = (selectedKeys: React.Key[], _info: any) => {
    if (selectedKeys.length === 0) return;

    setTreeSelectedKeys(selectedKeys);

    const key = String(selectedKeys[0]);
    if (key.startsWith('dashboard-')) {
      const dashboardIds = selectedKeys.map((k) =>
        String(k).replace('dashboard-', ''),
      );
      onDashboardSelect(dashboardIds as string[]);
    } else if (key.startsWith('thread-')) {
      // Thread selection — strip prefix to get raw id
      const threadKeys = selectedKeys.map((k) =>
        String(k).replace('thread-', ''),
      );
      onSelect(threadKeys);
    }
  };

  const onUnifiedRename = async (id: string, newName: string) => {
    if (id.startsWith('dashboard-')) {
      const dashboardId = id.replace('dashboard-', '');
      await onDashboardRename(dashboardId, newName);
    } else if (id.startsWith('thread-')) {
      const threadId = id.replace('thread-', '');
      await onRename(threadId, newName);
    }
  };

  const onUnifiedDelete = async (id: string) => {
    if (id.startsWith('dashboard-')) {
      const dashboardId = id.replace('dashboard-', '');
      await onDashboardDelete(dashboardId);
    } else if (id.startsWith('thread-')) {
      const threadId = id.replace('thread-', '');
      await onDeleteThread(threadId);
    }
  };

  const onMoveItemToFolder = (itemId: string, folderId: number) => {
    if (itemId.startsWith('dashboard-')) {
      const dashboardId = Number(itemId.replace('dashboard-', ''));
      onMoveDashboardToFolder?.(dashboardId, folderId);
    } else if (itemId.startsWith('thread-')) {
      const threadId = Number(itemId.replace('thread-', ''));
      onMoveThreadToFolder?.(threadId, folderId);
    }
  };

  return (
    <FolderTree
      folderGroups={folderGroups}
      selectedKeys={treeSelectedKeys}
      onSelect={onUnifiedSelect}
      onRename={onUnifiedRename}
      onDelete={onUnifiedDelete}
      onDashboardCreate={onDashboardCreate}
      onFolderCreate={onFolderCreate}
      onMoveToFolder={onMoveItemToFolder}
    />
  );
}
