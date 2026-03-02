import { useEffect, useState, useMemo, useCallback } from 'react';
import styled from 'styled-components';
import { useRouter } from 'next/router';
import { useParams } from 'next/navigation';
import { Path, buildPath } from '@/utils/enum';
import FolderSelector from './home/FolderSelector';
import FolderContentList from './home/FolderContentList';
import FolderModal from '@/components/modals/FolderModal';
import ManageAccessModal from '@/components/modals/ManageAccessModal';
import useModalAction from '@/hooks/useModalAction';
import useProject from '@/hooks/useProject';
import type { FolderGroup, SidebarItem } from '@/hooks/useHomeSidebar';
import { FolderVisibility } from '@/apollo/client/graphql/__types__';

const SidebarContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
`;

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
  onDashboardCreate: (folderId?: number) => Promise<void>;
  onFolderCreate?: (name: string) => Promise<void>;
  onFolderRename?: (id: number, name: string) => Promise<void>;
  onFolderDelete?: (id: number) => Promise<void>;
  onUpdateFolderVisibility?: (id: number, visibility: string) => Promise<void>;
  onMoveDashboardToFolder?: (dashboardId: number, folderId: number | null) => Promise<void>;
  onMoveThreadToFolder?: (threadId: number, folderId: number | null) => Promise<void>;
  onReorderFolders?: (orders: Array<{ id: number; sortOrder: number }>) => Promise<void>;
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
    onFolderRename,
    onFolderDelete,
    onUpdateFolderVisibility,
    onMoveDashboardToFolder,
    onMoveThreadToFolder,
  } = props;
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { currentProjectId } = useProject();
  const { folderGroups } = data;
  const bp = (path: Path) => buildPath(path, currentProjectId);
  const folderModal = useModalAction();

  // Manage access modal state
  const [manageAccessState, setManageAccessState] = useState<{
    visible: boolean;
    folderId: number | null;
    visibility: FolderVisibility | null;
  }>({ visible: false, folderId: null, visibility: null });

  // ── Selected folder ──────────────────────────────────
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);

  // Default to first (public) folder when folderGroups load
  useEffect(() => {
    if (folderGroups.length > 0 && selectedFolderId === null) {
      setSelectedFolderId(folderGroups[0].folder.id);
    }
    // If the selected folder was deleted, fall back to first
    if (
      selectedFolderId !== null &&
      !folderGroups.find((g) => g.folder.id === selectedFolderId)
    ) {
      setSelectedFolderId(folderGroups[0]?.folder.id ?? null);
    }
  }, [folderGroups, selectedFolderId]);

  const currentGroup = useMemo(
    () => folderGroups.find((g) => g.folder.id === selectedFolderId) || null,
    [folderGroups, selectedFolderId],
  );

  const allFolders = useMemo(
    () =>
      folderGroups.map((g) => ({
        id: g.folder.id,
        name: g.folder.name,
      })),
    [folderGroups],
  );

  const folders = useMemo(
    () => folderGroups.map((g) => g.folder),
    [folderGroups],
  );

  // ── Selected item key ────────────────────────────────
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  // Determine selected key from URL
  useEffect(() => {
    const dashboardId = router.query?.dashboardId as string;
    if (dashboardId) {
      setSelectedKey(`dashboard-${dashboardId}`);
    } else if (params?.id) {
      setSelectedKey(`thread-${params.id}`);
    }
  }, [params?.id, router.query?.dashboardId]);

  // ── Handlers ─────────────────────────────────────────

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

  const onItemSelect = useCallback(
    (key: string) => {
      setSelectedKey(key);
      if (key.startsWith('dashboard-')) {
        onDashboardSelect([key.replace('dashboard-', '')]);
      } else if (key.startsWith('thread-')) {
        onSelect([key.replace('thread-', '')]);
      }
    },
    [onDashboardSelect, onSelect],
  );

  const onUnifiedRename = useCallback(
    async (id: string, newName: string) => {
      if (id.startsWith('dashboard-')) {
        await onDashboardRename(id.replace('dashboard-', ''), newName);
      } else if (id.startsWith('thread-')) {
        await onRename(id.replace('thread-', ''), newName);
      }
    },
    [onDashboardRename, onRename],
  );

  const onUnifiedDelete = useCallback(
    async (id: string) => {
      if (id.startsWith('dashboard-')) {
        await onDashboardDelete(id.replace('dashboard-', ''));
      } else if (id.startsWith('thread-')) {
        await onDeleteThread(id.replace('thread-', ''));
      }
    },
    [onDashboardDelete, onDeleteThread],
  );

  const onMoveItemToFolder = useCallback(
    (itemId: string, folderId: number) => {
      if (itemId.startsWith('dashboard-')) {
        const dashboardId = Number(itemId.replace('dashboard-', ''));
        onMoveDashboardToFolder?.(dashboardId, folderId);
      } else if (itemId.startsWith('thread-')) {
        const threadId = Number(itemId.replace('thread-', ''));
        onMoveThreadToFolder?.(threadId, folderId);
      }
    },
    [onMoveDashboardToFolder, onMoveThreadToFolder],
  );

  // ── Folder operations for selector ───────────────────

  const handleFolderCreate = useCallback(() => {
    folderModal.openModal();
  }, [folderModal]);

  const handleFolderRenameFromSelector = useCallback(
    (_id: number, _name: string) => {
      // Open the modal in edit mode
      folderModal.openModal({ id: _id, name: _name });
    },
    [folderModal],
  );

  const handleManageAccess = useCallback(
    (folderId: number) => {
      const folder = folderGroups.find((g) => g.folder.id === folderId)?.folder;
      setManageAccessState({
        visible: true,
        folderId,
        visibility: (folder?.visibility as FolderVisibility) || FolderVisibility.shared,
      });
    },
    [folderGroups],
  );

  const handleManageAccessSubmit = useCallback(
    async (folderId: number, visibility: FolderVisibility) => {
      await onUpdateFolderVisibility?.(folderId, visibility);
    },
    [onUpdateFolderVisibility],
  );

  const closeManageAccess = useCallback(() => {
    setManageAccessState({ visible: false, folderId: null, visibility: null });
  }, []);

  const handleFolderModalSubmit = useCallback(
    async (values: { name: string }) => {
      const defaultValue = folderModal.state.defaultValue as any;
      if (defaultValue?.id) {
        await onFolderRename?.(defaultValue.id, values.name);
      } else {
        await onFolderCreate?.(values.name);
      }
    },
    [folderModal.state.defaultValue, onFolderRename, onFolderCreate],
  );

  const handleNewThread = useCallback(() => {
    router.push(bp(Path.Home));
  }, [router, bp]);

  return (
    <SidebarContainer>
      <FolderSelector
        folders={folders}
        selectedFolderId={selectedFolderId ?? 0}
        onSelectFolder={setSelectedFolderId}
        onCreateFolder={onFolderCreate ? handleFolderCreate : undefined}
        onRenameFolder={onFolderRename ? handleFolderRenameFromSelector : undefined}
        onDeleteFolder={onFolderDelete}
        onManageAccess={handleManageAccess}
      />
      <FolderContentList
        folderGroup={currentGroup}
        allFolders={allFolders}
        selectedKey={selectedKey}
        onSelect={onItemSelect}
        onRename={onUnifiedRename}
        onDelete={onUnifiedDelete}
        onDashboardCreate={onDashboardCreate}
        onThreadCreate={handleNewThread}
        onMoveToFolder={onMoveItemToFolder}
      />
      <FolderModal
        {...folderModal.state}
        onSubmit={handleFolderModalSubmit}
        onClose={folderModal.closeModal}
      />
      <ManageAccessModal
        visible={manageAccessState.visible}
        folderId={manageAccessState.folderId}
        currentVisibility={manageAccessState.visibility}
        onSubmit={handleManageAccessSubmit}
        onClose={closeManageAccess}
      />
    </SidebarContainer>
  );
}
