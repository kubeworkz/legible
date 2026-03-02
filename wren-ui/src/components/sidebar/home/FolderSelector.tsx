import { useMemo } from 'react';
import styled from 'styled-components';
import { Dropdown, Menu } from 'antd';
import FolderOutlined from '@ant-design/icons/FolderOutlined';
import TeamOutlined from '@ant-design/icons/TeamOutlined';
import UserOutlined from '@ant-design/icons/UserOutlined';
import DownOutlined from '@ant-design/icons/DownOutlined';
import EditOutlined from '@ant-design/icons/EditOutlined';
import MoreOutlined from '@ant-design/icons/MoreOutlined';
import PlusOutlined from '@ant-design/icons/PlusOutlined';
import { DeleteFolderModal } from '@/components/modals/DeleteModal';
import type { FolderItem } from '@/hooks/useHomeSidebar';

const SelectorBar = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--gray-4);
`;

const TriggerButton = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
  padding: 6px 10px;
  border-radius: 4px;
  cursor: pointer;
  user-select: none;
  transition: background-color 0.15s;
  font-size: 13px;
  font-weight: 500;
  color: var(--gray-9);

  &:hover {
    background-color: var(--gray-3);
  }

  .folder-icon {
    flex-shrink: 0;
    font-size: 14px;
    color: var(--gray-7);
  }

  .folder-name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .chevron {
    flex-shrink: 0;
    font-size: 10px;
    color: var(--gray-6);
    transition: transform 0.2s;
  }
`;

const StyledMenu = styled(Menu)`
  max-height: 320px;
  overflow-y: auto;

  .ant-dropdown-menu-item {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    padding: 6px 12px;
  }

  .folder-menu-item {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
    min-width: 0;
  }

  .folder-menu-icon {
    flex-shrink: 0;
    font-size: 13px;
    color: var(--gray-7);
  }

  .folder-menu-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .new-folder-item {
    border-top: 1px solid var(--gray-4);
    color: var(--geekblue-6);
    font-weight: 500;
  }
`;

const KebabButton = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 4px;
  cursor: pointer;
  color: var(--gray-7);
  flex-shrink: 0;
  transition: background-color 0.15s;

  &:hover {
    background-color: var(--gray-3);
  }
`;

function getFolderIcon(type: string) {
  switch (type) {
    case 'public':
      return <TeamOutlined className="folder-icon" />;
    case 'personal':
      return <UserOutlined className="folder-icon" />;
    default:
      return <FolderOutlined className="folder-icon" />;
  }
}

function getFolderMenuIcon(type: string) {
  switch (type) {
    case 'public':
      return <TeamOutlined className="folder-menu-icon" />;
    case 'personal':
      return <UserOutlined className="folder-menu-icon" />;
    default:
      return <FolderOutlined className="folder-menu-icon" />;
  }
}

interface Props {
  folders: FolderItem[];
  selectedFolderId: number;
  onSelectFolder: (folderId: number) => void;
  onCreateFolder?: () => void;
  onRenameFolder?: (id: number, name: string) => void;
  onDeleteFolder?: (id: number) => Promise<void>;
}

export default function FolderSelector(props: Props) {
  const {
    folders,
    selectedFolderId,
    onSelectFolder,
    onCreateFolder,
    onRenameFolder,
    onDeleteFolder,
  } = props;

  const selectedFolder = useMemo(
    () => folders.find((f) => f.id === selectedFolderId) || folders[0],
    [folders, selectedFolderId],
  );

  const isCustomFolder = selectedFolder?.type === 'custom';

  const menuItems = useMemo(() => {
    const items: any[] = folders.map((folder) => ({
      key: `folder-${folder.id}`,
      label: (
        <span className="folder-menu-item">
          {getFolderMenuIcon(folder.type)}
          <span className="folder-menu-name">{folder.name}</span>
        </span>
      ),
      onClick: () => onSelectFolder(folder.id),
    }));

    if (onCreateFolder) {
      items.push({
        key: 'new-folder',
        className: 'new-folder-item',
        label: (
          <span className="folder-menu-item">
            <PlusOutlined className="folder-menu-icon" style={{ color: 'var(--geekblue-6)' }} />
            <span className="folder-menu-name">New folder</span>
          </span>
        ),
        onClick: onCreateFolder,
      });
    }

    return items;
  }, [folders, onCreateFolder, onSelectFolder]);

  const folderActionMenu = useMemo(() => {
    if (!isCustomFolder || !selectedFolder) return null;
    return (
      <Menu
        items={[
          {
            label: (
              <>
                <EditOutlined className="mr-2" />
                Rename
              </>
            ),
            key: 'rename-folder',
            onClick: () => {
              // We pass the current name — the parent will open a modal
              onRenameFolder?.(selectedFolder.id, selectedFolder.name);
            },
          },
          {
            label: (
              <DeleteFolderModal
                onConfirm={() => onDeleteFolder?.(selectedFolder.id)}
              />
            ),
            key: 'delete-folder',
          },
        ]}
      />
    );
  }, [isCustomFolder, selectedFolder, onRenameFolder, onDeleteFolder]);

  if (!selectedFolder) return null;

  return (
    <SelectorBar>
      <Dropdown
        trigger={['click']}
        overlay={<StyledMenu items={menuItems} />}
        overlayStyle={{ minWidth: 180 }}
      >
        <TriggerButton>
          {getFolderIcon(selectedFolder.type)}
          <span className="folder-name">{selectedFolder.name}</span>
          <DownOutlined className="chevron" />
        </TriggerButton>
      </Dropdown>

      {isCustomFolder && folderActionMenu && (
        <Dropdown
          trigger={['click']}
          overlay={folderActionMenu}
          overlayStyle={{ minWidth: 150 }}
        >
          <KebabButton>
            <MoreOutlined />
          </KebabButton>
        </Dropdown>
      )}
    </SelectorBar>
  );
}
