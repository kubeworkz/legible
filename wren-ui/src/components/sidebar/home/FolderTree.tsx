import { useState, useEffect, useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { DataNode } from 'antd/lib/tree';
import { Dropdown, Menu } from 'antd';
import PlusOutlined from '@ant-design/icons/PlusOutlined';
import FolderOutlined from '@ant-design/icons/FolderOutlined';
import TeamOutlined from '@ant-design/icons/TeamOutlined';
import UserOutlined from '@ant-design/icons/UserOutlined';
import EditOutlined from '@ant-design/icons/EditOutlined';
import MoreOutlined from '@ant-design/icons/MoreOutlined';
import HolderOutlined from '@ant-design/icons/HolderOutlined';
import SidebarTree, {
  sidebarCommonStyle,
} from '@/components/sidebar/SidebarTree';
import {
  GroupActionButton,
} from '@/components/sidebar/utils';
import TreeTitle, { MoveToFolderOption } from './TreeTitle';
import FolderModal from '@/components/modals/FolderModal';
import { DeleteFolderModal } from '@/components/modals/DeleteModal';
import useModalAction from '@/hooks/useModalAction';
import type { FolderGroup, SidebarItem, FolderItem } from '@/hooks/useHomeSidebar';

const StyledSidebarTree = styled(SidebarTree)`
  ${sidebarCommonStyle}

  /* Drag-drop indicator styles */
  .ant-tree-treenode.drag-over {
    > .ant-tree-node-content-wrapper {
      background-color: var(--geekblue-1) !important;
      outline: 1px dashed var(--geekblue-4);
      border-radius: 4px;
    }
  }
  .ant-tree-treenode.drag-over-gap-top > .ant-tree-node-content-wrapper {
    border-top: 2px solid var(--geekblue-4);
  }
  .ant-tree-treenode.drag-over-gap-bottom > .ant-tree-node-content-wrapper {
    border-bottom: 2px solid var(--geekblue-4);
  }
  /* Hide the drag icon — we rely on cursor instead */
  .ant-tree-draggable-icon {
    display: none !important;
  }

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
  onFolderRename?: (id: number, name: string) => Promise<void>;
  onFolderDelete?: (id: number) => Promise<void>;
  onMoveToFolder?: (itemId: string, folderId: number) => void;
  onReorderFolders?: (orders: Array<{ id: number; sortOrder: number }>) => Promise<void>;
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
    onFolderRename,
    onFolderDelete,
    onMoveToFolder,
    onReorderFolders,
  } = props;

  const [tree, setTree] = useState<DataNode[]>([]);
  const folderModal = useModalAction();

  const handleFolderModalSubmit = useCallback(
    async (values: { name: string }) => {
      const defaultValue = folderModal.state.defaultValue as any;
      if (defaultValue?.id) {
        // Edit mode — rename existing folder
        await onFolderRename?.(defaultValue.id, values.name);
      } else {
        // Create mode
        await onFolderCreate?.(values.name);
      }
    },
    [folderModal.state.defaultValue, onFolderRename, onFolderCreate],
  );

  // ── Drag-and-drop helpers ──────────────────────────────────

  // Determine if a tree node is draggable
  const draggable = useCallback(
    (node: any) => {
      const key = String(node.key);
      // Custom folder headers can be reordered
      if (key.startsWith('folder-')) {
        const folderId = Number(key.replace('folder-', ''));
        const group = folderGroups.find((g) => g.folder.id === folderId);
        if (group && group.folder.type === 'custom') return true;
        return false;
      }
      // Thread/dashboard items can be dragged between folders
      if (key.startsWith('thread-') || key.startsWith('dashboard-')) return true;
      return false;
    },
    [folderGroups],
  );

  // Determine where drops are allowed
  const allowDrop = useCallback(
    ({ dragNode, dropNode, dropPosition }: any) => {
      const dragKey = String(dragNode.key);
      const dropKey = String(dropNode.key);

      // Dragging a folder — can only drop between other top-level folder headers
      if (dragKey.startsWith('folder-')) {
        if (!dropKey.startsWith('folder-')) return false;
        // Only allow gap drops (between nodes), not drop-onto
        // dropPosition: -1 = before, 1 = after, 0 = inside
        if (dropPosition === 0) return false;
        return true;
      }

      // Dragging an item — can drop onto a folder header (to move into that folder)
      if (dragKey.startsWith('thread-') || dragKey.startsWith('dashboard-')) {
        // Can drop onto a folder header
        if (dropKey.startsWith('folder-') && dropPosition === 0) return true;
        // Don't allow dropping onto other items, subtitles, or in gaps
        return false;
      }

      return false;
    },
    [],
  );

  // Handle the drop event
  const onDrop = useCallback(
    (info: any) => {
      const dragKey = String(info.dragNode.key);
      const dropKey = String(info.node.key);
      const dropPos = info.dropPosition;

      // Case 1: Reorder a custom folder
      if (dragKey.startsWith('folder-') && dropKey.startsWith('folder-')) {
        const dragFolderId = Number(dragKey.replace('folder-', ''));

        // Get the current ordered list of folder IDs from the tree
        const folderIds = folderGroups.map((g) => g.folder.id);

        // Remove dragged folder from its current position
        const filtered = folderIds.filter((id) => id !== dragFolderId);

        // Find the index of the drop target
        const dropFolderId = Number(dropKey.replace('folder-', ''));
        const dropIndex = filtered.indexOf(dropFolderId);

        // Insert at the right position
        // info.dropPosition is the visible position; Ant Tree provides dropToGap
        // and the actual computed index via info.dropPosition
        // For gap drops: dropPosition < dropIndex means before, >= means after
        if (dropPos <= dropIndex) {
          // Insert before drop target
          filtered.splice(dropIndex, 0, dragFolderId);
        } else {
          // Insert after drop target
          filtered.splice(dropIndex + 1, 0, dragFolderId);
        }

        // Build new sort orders
        const orders = filtered.map((id, idx) => ({ id, sortOrder: idx }));
        onReorderFolders?.(orders);
        return;
      }

      // Case 2: Move an item (thread/dashboard) to a folder
      if (
        (dragKey.startsWith('thread-') || dragKey.startsWith('dashboard-')) &&
        dropKey.startsWith('folder-')
      ) {
        const folderId = Number(dropKey.replace('folder-', ''));
        onMoveToFolder?.(dragKey, folderId);
        return;
      }
    },
    [folderGroups, onReorderFolders, onMoveToFolder],
  );

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

      // Build folder header with context menu for custom folders
      const isCustomFolder = folder.type === 'custom';

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
            <span className="folder-actions">
              {folder.type === 'public' && (
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
              )}
              {isCustomFolder && (
                <Dropdown
                  trigger={['click']}
                  overlayStyle={{ userSelect: 'none', minWidth: 150 }}
                  overlay={
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
                          onClick: ({ domEvent }) => {
                            domEvent.stopPropagation();
                            folderModal.openModal({
                              id: folder.id,
                              name: folder.name,
                            });
                          },
                        },
                        {
                          label: (
                            <DeleteFolderModal
                              onConfirm={() => onFolderDelete?.(folder.id)}
                            />
                          ),
                          key: 'delete-folder',
                          onClick: ({ domEvent }) => {
                            domEvent.stopPropagation();
                          },
                        },
                      ]}
                    />
                  }
                >
                  <MoreOutlined
                    onClick={(e) => e.stopPropagation()}
                    style={{ cursor: 'pointer', padding: '0 4px' }}
                  />
                </Dropdown>
              )}
            </span>
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
            onClick={() => folderModal.openModal()}
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
    <>
      <StyledSidebarTree
        treeData={tree}
        selectedKeys={selectedKeys}
        onSelect={onSelect}
        defaultExpandAll
        draggable={{ icon: false, nodeDraggable: draggable }}
        allowDrop={allowDrop}
        onDrop={onDrop}
      />
      <FolderModal
        {...folderModal.state}
        onSubmit={handleFolderModalSubmit}
        onClose={folderModal.closeModal}
      />
    </>
  );
}
