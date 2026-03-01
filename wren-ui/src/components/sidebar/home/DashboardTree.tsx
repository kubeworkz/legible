import { useState, useEffect } from 'react';
import styled from 'styled-components';
import { DataNode } from 'antd/lib/tree';
import { Path, buildPath } from '@/utils/enum';
import { useRouter } from 'next/router';
import PlusOutlined from '@ant-design/icons/PlusOutlined';
import SidebarTree, {
  sidebarCommonStyle,
} from '@/components/sidebar/SidebarTree';
import {
  createTreeGroupNode,
  GroupActionButton,
} from '@/components/sidebar/utils';
import TreeTitle from './TreeTitle';
import useProject from '@/hooks/useProject';

const StyledSidebarTree = styled(SidebarTree)`
  ${sidebarCommonStyle}

  .adm-treeNode {
    &.adm-treeNode__dashboard {
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
`;

export interface DashboardData {
  id: string;
  name: string;
}

interface Props {
  dashboards: DashboardData[];
  selectedKeys: React.Key[];
  onSelect: (selectKeys: React.Key[], info: any) => void;
  onRename: (id: string, newName: string) => Promise<void>;
  onDeleteDashboard: (id: string) => Promise<void>;
  onCreateDashboard: () => Promise<void>;
}

export default function DashboardTree(props: Props) {
  const router = useRouter();
  const { currentProjectId } = useProject();
  const {
    dashboards = [],
    selectedKeys,
    onSelect,
    onRename,
    onDeleteDashboard,
    onCreateDashboard,
  } = props;

  const getDashboardGroupNode = createTreeGroupNode({
    groupName: 'Dashboards',
    groupKey: 'dashboards',
    actions: [
      {
        key: 'new-dashboard',
        render: () => (
          <GroupActionButton
            size="small"
            icon={<PlusOutlined />}
            onClick={async () => {
              await onCreateDashboard();
            }}
          >
            New
          </GroupActionButton>
        ),
      },
    ],
  });

  const [tree, setTree] = useState<DataNode[]>(getDashboardGroupNode());

  useEffect(() => {
    setTree((_tree) =>
      getDashboardGroupNode({
        quotaUsage: dashboards.length,
        children: dashboards.map((dashboard) => {
          const nodeKey = `dashboard-${dashboard.id}`;

          return {
            className: 'adm-treeNode adm-treeNode__dashboard',
            id: nodeKey,
            isLeaf: true,
            key: nodeKey,
            title: (
              <TreeTitle
                id={dashboard.id}
                title={dashboard.name}
                onRename={onRename}
                onDelete={onDeleteDashboard}
                deleteModalType="dashboard"
              />
            ),
          };
        }),
      }),
    );
  }, [dashboards, router.query?.dashboardId]);

  return (
    <StyledSidebarTree
      treeData={tree}
      selectedKeys={selectedKeys}
      onSelect={onSelect}
    />
  );
}
