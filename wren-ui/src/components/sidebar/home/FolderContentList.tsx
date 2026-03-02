import { useState, useCallback } from 'react';
import styled from 'styled-components';
import { Dropdown, Menu, Badge } from 'antd';
import PlusOutlined from '@ant-design/icons/PlusOutlined';
import EditOutlined from '@ant-design/icons/EditOutlined';
import MoreOutlined from '@ant-design/icons/MoreOutlined';
import FolderOutlined from '@ant-design/icons/FolderOutlined';
import DashboardOutlined from '@ant-design/icons/DashboardOutlined';
import MessageOutlined from '@ant-design/icons/MessageOutlined';
import TreeTitleInput from '@/components/sidebar/home/TreeTitleInput';
import { DeleteThreadModal, DeleteDashboardModal } from '@/components/modals/DeleteModal';
import type { FolderGroup, SidebarItem } from '@/hooks/useHomeSidebar';
import type { MoveToFolderOption } from './TreeTitle';

// ── Styled Components ───────────────────────────────────

const Container = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow-y: auto;
  padding: 4px 0;
`;

const Section = styled.div`
  &:not(:first-child) {
    margin-top: 4px;
  }
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 16px;
  user-select: none;

  .section-left {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--gray-7);
  }

  .section-icon {
    font-size: 12px;
    color: var(--gray-6);
  }

  .section-count {
    .ant-badge-count {
      background-color: var(--gray-5);
      color: var(--gray-8);
      font-size: 10px;
      font-weight: 600;
      min-width: 18px;
      height: 16px;
      line-height: 16px;
      border-radius: 8px;
      box-shadow: none;
      padding: 0 4px;
    }
  }

  .section-actions {
    display: flex;
    align-items: center;
  }
`;

const NewButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border: 1px solid var(--gray-5);
  border-radius: 4px;
  background: transparent;
  color: var(--gray-8);
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    background-color: var(--gray-3);
    border-color: var(--gray-6);
  }

  .anticon {
    font-size: 10px;
  }
`;

const ItemRow = styled.div<{ $selected?: boolean }>`
  display: flex;
  align-items: center;
  padding: 4px 16px 4px 20px;
  cursor: pointer;
  user-select: none;
  transition: background-color 0.1s;
  min-height: 32px;
  background-color: ${(props) =>
    props.$selected ? 'var(--geekblue-1)' : 'transparent'};

  &:hover {
    background-color: ${(props) =>
      props.$selected ? 'var(--geekblue-1)' : 'var(--gray-3)'};

    .item-actions {
      opacity: 1;
    }
  }

  .item-name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 13px;
    color: var(--gray-9);
    line-height: 24px;
  }

  .item-actions {
    flex-shrink: 0;
    opacity: 0;
    transition: opacity 0.15s;
    display: flex;
    align-items: center;
  }
`;

const KebabIcon = styled(MoreOutlined)`
  font-size: 14px;
  color: var(--gray-7);
  padding: 2px 4px;
  border-radius: 4px;
  cursor: pointer;

  &:hover {
    background-color: var(--gray-4);
  }
`;

const EmptyState = styled.div`
  padding: 12px 20px;
  font-size: 12px;
  color: var(--gray-6);
  font-style: italic;
`;

const StyledMenu = styled(Menu)`
  .ant-dropdown-menu-item {
    font-size: 13px;
    padding: 6px 12px;
  }
`;

// ── Types ──────────────────────────────────────────────

interface Props {
  folderGroup: FolderGroup | null;
  allFolders: MoveToFolderOption[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
  onRename: (id: string, newName: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onDashboardCreate: (folderId?: number) => Promise<void>;
  onMoveToFolder?: (itemId: string, folderId: number) => void;
}

// ── ContentItem ──────────────────────────────────────────

function ContentItem(props: {
  itemKey: string;
  name: string;
  selected: boolean;
  deleteModal: 'thread' | 'dashboard';
  moveToFolderOptions: MoveToFolderOption[];
  onSelect: (key: string) => void;
  onRename: (id: string, newName: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onMoveToFolder?: (itemId: string, folderId: number) => void;
}) {
  const {
    itemKey,
    name,
    selected,
    deleteModal,
    moveToFolderOptions,
    onSelect,
    onRename,
    onDelete,
    onMoveToFolder,
  } = props;

  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(name);

  const onCancelChange = () => {
    setIsEditing(false);
    setTitle(name);
  };

  const onChangeTitle = (newTitle: string) => {
    setIsEditing(false);
    setTitle(newTitle);
    onRename(itemKey, newTitle);
  };

  if (isEditing) {
    return (
      <ItemRow $selected={false} style={{ paddingLeft: 20 }}>
        <TreeTitleInput
          title={title}
          onCancelChange={onCancelChange}
          onSetTitle={setTitle}
          onRename={onChangeTitle}
        />
      </ItemRow>
    );
  }

  const DeleteModal =
    deleteModal === 'dashboard' ? DeleteDashboardModal : DeleteThreadModal;

  const menuItems: any[] = [
    {
      label: (
        <>
          <EditOutlined className="mr-2" />
          Rename
        </>
      ),
      key: 'rename',
      onClick: ({ domEvent }: any) => {
        domEvent.stopPropagation();
        setIsEditing(true);
      },
    },
    ...(moveToFolderOptions.length > 0
      ? [
          {
            label: (
              <>
                <FolderOutlined className="mr-2" />
                Move to
              </>
            ),
            key: 'move-to',
            children: moveToFolderOptions.map((folder) => ({
              label: folder.name,
              key: `move-to-${folder.id}`,
              onClick: ({ domEvent }: any) => {
                domEvent.stopPropagation();
                onMoveToFolder?.(itemKey, folder.id);
              },
            })),
          },
        ]
      : []),
    {
      label: <DeleteModal onConfirm={() => onDelete(itemKey)} />,
      key: 'delete',
      onClick: ({ domEvent }: any) => {
        domEvent.stopPropagation();
      },
    },
  ];

  return (
    <ItemRow
      $selected={selected}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(itemKey);
      }}
    >
      <span className="item-name" title={title}>
        {title}
      </span>
      <span className="item-actions">
        <Dropdown
          trigger={['click']}
          overlay={<StyledMenu items={menuItems} />}
          overlayStyle={{ minWidth: 150 }}
        >
          <KebabIcon
            onClick={(e) => {
              e.stopPropagation();
            }}
          />
        </Dropdown>
      </span>
    </ItemRow>
  );
}

// ── ContentSection ───────────────────────────────────────

function ContentSection(props: {
  icon: React.ReactNode;
  label: string;
  count: number;
  items: SidebarItem[];
  keyPrefix: string;
  deleteModal: 'thread' | 'dashboard';
  selectedKey: string | null;
  moveToFolderOptions: MoveToFolderOption[];
  onNew?: () => void;
  onSelect: (key: string) => void;
  onRename: (id: string, newName: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onMoveToFolder?: (itemId: string, folderId: number) => void;
}) {
  const {
    icon,
    label,
    count,
    items,
    keyPrefix,
    deleteModal,
    selectedKey,
    moveToFolderOptions,
    onNew,
    onSelect,
    onRename,
    onDelete,
    onMoveToFolder,
  } = props;

  return (
    <Section>
      <SectionHeader>
        <span className="section-left">
          {icon}
          {label}
          <Badge count={count} className="section-count" overflowCount={999} />
        </span>
        <span className="section-actions">
          {onNew && (
            <NewButton onClick={onNew}>
              <PlusOutlined />
              New
            </NewButton>
          )}
        </span>
      </SectionHeader>

      {items.length === 0 ? (
        <EmptyState>No {label.toLowerCase()} yet</EmptyState>
      ) : (
        items.map((item) => {
          const itemKey = `${keyPrefix}-${item.id}`;
          return (
            <ContentItem
              key={itemKey}
              itemKey={itemKey}
              name={item.name}
              selected={selectedKey === itemKey}
              deleteModal={deleteModal}
              moveToFolderOptions={moveToFolderOptions}
              onSelect={onSelect}
              onRename={onRename}
              onDelete={onDelete}
              onMoveToFolder={onMoveToFolder}
            />
          );
        })
      )}
    </Section>
  );
}

// ── Main Component ──────────────────────────────────────

export default function FolderContentList(props: Props) {
  const {
    folderGroup,
    allFolders,
    selectedKey,
    onSelect,
    onRename,
    onDelete,
    onDashboardCreate,
    onMoveToFolder,
  } = props;

  const handleNewDashboard = useCallback(() => {
    if (folderGroup) {
      onDashboardCreate(folderGroup.folder.id);
    }
  }, [folderGroup, onDashboardCreate]);

  if (!folderGroup) {
    return (
      <Container>
        <EmptyState>Select a folder to view its contents</EmptyState>
      </Container>
    );
  }

  const { folder, dashboards, threads } = folderGroup;
  const showNewButton = folder.type === 'public' || folder.type === 'custom';

  // Exclude current folder from move-to options
  const moveOptions = allFolders.filter((f) => f.id !== folder.id);

  return (
    <Container>
      <ContentSection
        icon={<DashboardOutlined className="section-icon" />}
        label="Dashboards"
        count={dashboards.length}
        items={dashboards}
        keyPrefix="dashboard"
        deleteModal="dashboard"
        selectedKey={selectedKey}
        moveToFolderOptions={moveOptions}
        onNew={showNewButton ? handleNewDashboard : undefined}
        onSelect={onSelect}
        onRename={onRename}
        onDelete={onDelete}
        onMoveToFolder={onMoveToFolder}
      />

      <ContentSection
        icon={<MessageOutlined className="section-icon" />}
        label="Threads"
        count={threads.length}
        items={threads}
        keyPrefix="thread"
        deleteModal="thread"
        selectedKey={selectedKey}
        moveToFolderOptions={moveOptions}
        onSelect={onSelect}
        onRename={onRename}
        onDelete={onDelete}
        onMoveToFolder={onMoveToFolder}
      />
    </Container>
  );
}
