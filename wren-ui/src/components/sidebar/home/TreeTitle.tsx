import { useState } from 'react';
import styled from 'styled-components';
import { Dropdown, Menu } from 'antd';
import EditOutlined from '@ant-design/icons/EditOutlined';
import MoreOutlined from '@ant-design/icons/MoreOutlined';
import FolderOutlined from '@ant-design/icons/FolderOutlined';
import LabelTitle from '@/components/sidebar/LabelTitle';
import TreeTitleInput from '@/components/sidebar/home/TreeTitleInput';
import {
  DeleteThreadModal,
  DeleteDashboardModal,
} from '@/components/modals/DeleteModal';

const MENU_ITEM_KEYS = {
  RENAME: 'rename',
  DELETE: 'delete',
  MOVE_TO: 'move-to',
};

const StyledMenu = styled(Menu)`
  a:hover {
    color: white;
  }
`;

const deleteModalMap = {
  thread: DeleteThreadModal,
  dashboard: DeleteDashboardModal,
};

export interface MoveToFolderOption {
  id: number;
  name: string;
}

interface TreeTitleProps {
  id: string;
  title: string;
  deleteModalType?: 'thread' | 'dashboard';
  onDelete?: (id: string) => void;
  onRename?: (id: string, newName: string) => void;
  moveToFolderOptions?: MoveToFolderOption[];
  onMoveToFolder?: (itemId: string, folderId: number) => void;
}

export default function TreeTitle(props: TreeTitleProps) {
  const {
    id,
    onDelete,
    onRename,
    deleteModalType = 'thread',
    moveToFolderOptions,
    onMoveToFolder,
  } = props;
  const [title, setTitle] = useState(props.title);
  const [isEditing, setIsEditing] = useState(false);

  const onCancelChange = () => {
    setIsEditing(false);
    setTitle(props.title);
  };

  const onChangeTitle = (newThreadTitle: string) => {
    setIsEditing(false);
    setTitle(newThreadTitle);
    onRename && onRename(id, newThreadTitle);
  };

  const onDeleteData = (id: string) => {
    onDelete && onDelete(id);
  };

  return isEditing ? (
    <TreeTitleInput
      title={title}
      onCancelChange={onCancelChange}
      onSetTitle={setTitle}
      onRename={onChangeTitle}
    />
  ) : (
    <LabelTitle
      title={title}
      appendIcon={
        <Dropdown
          trigger={['click']}
          overlayStyle={{ userSelect: 'none', minWidth: 150 }}
          overlay={
            <StyledMenu
              items={[
                {
                  label: (
                    <>
                      <EditOutlined className="mr-2" />
                      Rename
                    </>
                  ),
                  key: MENU_ITEM_KEYS.RENAME,
                  onClick: ({ domEvent }) => {
                    domEvent.stopPropagation();
                    setIsEditing(true);
                  },
                },
                ...(moveToFolderOptions && moveToFolderOptions.length > 0
                  ? [
                      {
                        label: (
                          <>
                            <FolderOutlined className="mr-2" />
                            Move to
                          </>
                        ),
                        key: MENU_ITEM_KEYS.MOVE_TO,
                        children: moveToFolderOptions.map((folder) => ({
                          label: folder.name,
                          key: `move-to-${folder.id}`,
                          onClick: ({ domEvent }: any) => {
                            domEvent.stopPropagation();
                            onMoveToFolder && onMoveToFolder(id, folder.id);
                          },
                        })),
                      },
                    ]
                  : []),
                {
                  label: (() => {
                    const DeleteModal = deleteModalMap[deleteModalType];
                    return (
                      <DeleteModal onConfirm={() => onDeleteData(id)} />
                    );
                  })(),
                  key: MENU_ITEM_KEYS.DELETE,
                  onClick: ({ domEvent }) => {
                    domEvent.stopPropagation();
                  },
                },
              ]}
            />
          }
        >
          <MoreOutlined onClick={(event) => event.stopPropagation()} />
        </Dropdown>
      }
    />
  );
}
