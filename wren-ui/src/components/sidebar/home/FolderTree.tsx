import { useState, useEffect } from 'react';
import styled from 'styled-components';
import { DataNode } from 'antd/lib/tree';
import { useRouter } from 'next/router';
import PlusOutlined from '@ant-design/icons/PlusOutlined';
import FolderOutlined from '@ant-design/icons/FolderOutlined';
import FolderOpenOutlined from '@ant-design/icons/FolderOpenOutlined';
import TeamOutlined from '@ant-design/icons/TeamOutlined';
import UserOutlined from '@ant-design/icons/UserOutlined';
import SidebarTree, {
  sidebarCommonStyle,
} from '@/components/sidebar/SidebarTree';
import {
  GroupActionButton,
} from '@/components/sidebar/utils';
import TreeTitle, { MoveToFolderOption } from './TreeTitle';
import type { FolderGroup, SidebarItem, FolderItem } from '@/hooks/useHomeSidebar';

const StyledSidebarTree = styled(SidebarTree)`
  ${sidebarCommonStyle}

  .adm-treeNode {
    &.adm-treeNode__folder-item {
      padding: 0px 16px 0px 4px !important;

      .ant-tree-title {
        flex-grow: 1;
        display: inline-flex;
        align-items: center;
        span:first-child,
        .adm-treeTitle__title {
          flex-grow: 1;
        }
      }
    }
  }

  .adm-treeNode--folder-header {
    .ant-tree-title {
      font-weight: 600;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--gray-7);
      display: flex;
      align-items: center;
      gap: 6px;
    }
  }

  .adm-treeNode--folder-subtitle {
    .ant-tree-title {
      font-size: 11px;
      color: var(--gray-6);
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      padding: 2px 0;
    }
  }
`;

const FolderHeaderTitle = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 4px;

  .folder-name {
    display: flex;
    align-items: center;
    gap: 6px;
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .folder-actions {
    display: flex;
    align-items: center;
    flex-shrink: 0;
  }
`;

interface Props {
  folderGroups: FolderGroup[];
  selectedKeys: React.Key[];
  onSelect: (selectKeys: React.Key[], info: any) => void;
  onRename: (id: string, newName: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onDashboardCreate: () => Promise<void>;
  onFolderCreate?: (name: string) => Promise<void>;
  onMoveToFolder?: (itemId: string, folderId: number) => void;
}

function getFolderIcon(type: string) {
  switch (type) {
    case 'public':
      return <TeamOutlined style={{ fontSize: 12 }} />;
    case 'personal':
      return <UserOutlined style={{ fontSize: 12 }} />;
    default:
      return <FolderOutlined style={{ fontSize: 12 }} />;
  }
}

function buildItemNodes(
  items: SidebarItem[],
  prefix: string,
  onRename: (id: string, newName: string) => Promise<void>,
  onDelete: (id: string) => Promise<void>,
  deleteModalType?: 'dashboard' | undefined,
  moveToFolderOptions?: MoveToFolderOption[],
  onMoveToFolder?: (itemId: string, folderId: number) => void,
): DataNode[] {
  return items.map((item) => {
    const nodeKey = `${prefix}-${item.id}`;
    return {
      className: 'adm-treeNode adm-treeNode__folder-item',
      id: nodeKey,
      isLeaf: true,
      key: nodeKey,
      title: (
        <TreeTitle
          id={nodeKey}
          title={item.name}
          onRename={onRename}
          onDelete={onDelete}
          deleteModalType={deleteModalType}
          moveToFolderOptions={moveToFolderOptions}
          onMoveToFolder={onMoveToFolder}
        />
      ),
    };
  });
}

export default function FolderTree(props: Props) {
  const {
    folderGroups = [],
    selectedKeys,
    onSelect,
    onRename,
    onDelete,
    onDashboardCreate,
    onFolderCreate,
    onMoveToFolder,
  } = props;

  const [tree, setTree] = useState<DataNode[]>([]);

  useEffect(() => {
    const treeData: DataNode[] = [];

    // Build a list of all folders for "Move to" options
    const allFolders: MoveToFolderOption[] = folderGroups.map((g) => ({
      id: g.folder.id,
      name: g.folder.name,
    }));

    for (const group of folderGroups) {
      const { folder, dashboards, threads } = group;
      const folderKey = `folder-${folder.id}`;
      const children: DataNode[] = [];

      // Exclude the current folder from move options
      const moveOptions = allFolders.filter((f) => f.id !== folder.id);

      // Dashboards sub-section
      if (dashboards.length > 0) {
        children.push({
          title: 'Dashboards',
          key: `${folderKey}-dashboards-label`,
          selectable: false,
          isLeaf: true,
          className: 'adm-treeNode adm-treeNode--folder-subtitle adm-treeNode--selectNone',
        });
        children.push(
          ...buildItemNodes(
            dashboards,
            'dashboard',
            onRename,
            onDelete,
            'dashboard',
            moveOptions,
            onMoveToFolder,
          ),
        );
      }

      // Threads sub-section
      if (threads.length > 0) {
        children.push({
          title: 'Threads',
          key: `${folderKey}-threads-label`,
          selectable: false,
          isLeaf: true,
          className: 'adm-treeNode adm-treeNode--folder-subtitle adm-treeNode--selectNone',
        });
        children.push(
          ...buildItemNodes(
            threads,
            'thread',
            onRename,
            onDelete,
            undefined,
            moveOptions,
            onMoveToFolder,
          ),
        );
      }

      // Empty state
      if (children.length === 0) {
        children.push({
          title: 'No items',
          key: `${folderKey}-empty`,
          selectable: false,
          isLeaf: true,
          className: 'adm-treeNode adm-treeNode--empty adm-treeNode--selectNode',
        });
      }

      treeData.push({
        className: 'adm-treeNode--folder-header',
        key: folderKey,
        selectable: false,
        title: (
          <FolderHeaderTitle>
            <span className="folder-name">
              {getFolderIcon(folder.type)}
              {folder.name}
            </span>
            {folder.type === 'public' && (
              <span className="folder-actions">
                <GroupActionButton
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={async (e) => {
                    e.stopPropagation();
                    await onDashboardCreate();
                  }}
                >
                  New
                </GroupActionButton>
              </span>
            )}
          </FolderHeaderTitle>
        ),
        children,
      });
    }

    // "New Folder" button at the bottom
    if (onFolderCreate) {
      treeData.push({
        key: 'new-folder-btn',
        selectable: false,
        isLeaf: true,
        className: 'adm-treeNode adm-treeNode--selectNone',
        title: (
          <GroupActionButton
            size="small"
            icon={<FolderOutlined />}
            onClick={async () => {
              await onFolderCreate('New Folder');
            }}
            style={{ padding: '4px 0', marginTop: 4 }}
          >
            New Folder
          </GroupActionButton>
        ),
      });
    }

    setTree(treeData);
  }, [folderGroups]);

  return (
    <StyledSidebarTree
      treeData={tree}
      selectedKeys={selectedKeys}
      onSelect={onSelect}
      defaultExpandAll
    />
  );
}
