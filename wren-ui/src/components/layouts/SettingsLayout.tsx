import { useMemo } from 'react';
import { useRouter } from 'next/router';
import { Layout, Button, Typography } from 'antd';
import styled, { css } from 'styled-components';
import SimpleLayout from '@/components/layouts/SimpleLayout';
import { Path, buildPath } from '@/utils/enum';
import useProject from '@/hooks/useProject';
import useProjectRole from '@/hooks/useProjectRole';
import useOrganization from '@/hooks/useOrganization';
import SettingOutlined from '@ant-design/icons/SettingOutlined';
import ArrowLeftOutlined from '@ant-design/icons/ArrowLeftOutlined';
import InfoCircleOutlined from '@ant-design/icons/InfoCircleOutlined';
import DatabaseOutlined from '@ant-design/icons/DatabaseOutlined';
import ExclamationCircleOutlined from '@ant-design/icons/ExclamationCircleOutlined';
import SafetyOutlined from '@ant-design/icons/SafetyOutlined';
import TeamOutlined from '@ant-design/icons/TeamOutlined';
import UsergroupAddOutlined from '@ant-design/icons/UsergroupAddOutlined';
import KeyOutlined from '@ant-design/icons/KeyOutlined';
import UserOutlined from '@ant-design/icons/UserOutlined';
import FileSearchOutlined from '@ant-design/icons/FileSearchOutlined';
import ApiOutlined from '@ant-design/icons/ApiOutlined';
import DollarOutlined from '@ant-design/icons/DollarOutlined';

const { Sider, Content } = Layout;

const basicStyle = css`
  height: calc(100vh - 48px);
  overflow: auto;
`;

const StyledSider = styled(Sider)`
  ${basicStyle}
  background-color: var(--gray-2) !important;

  .ant-layout-sider-children {
    display: flex;
    flex-direction: column;
    height: 100%;
  }
`;

const StyledContentLayout = styled(Layout)`
  position: relative;
  ${basicStyle}
  background-color: var(--gray-1);
`;

const StyledMenuButton = styled(Button)<{ $active?: boolean }>`
  &&& {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    padding: 8px 12px;
    margin-bottom: 2px;
    height: auto;
    color: var(--gray-8);
  }

  ${(props) =>
    props.$active &&
    css`
      &&& {
        color: var(--geekblue-6);
        background-color: var(--gray-4);
      }
    `}
`;

const StyledBackButton = styled(Button)`
  &&& {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    padding: 8px 12px;
    height: auto;
    color: var(--gray-7);
  }
`;

interface MenuItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  path: Path;
  /** When set, item is only shown if the predicate returns true */
  visible?: (ctx: { canAdmin: boolean; isOrgAdmin: boolean }) => boolean;
}

const projectMenuItems: MenuItem[] = [
  {
    key: 'general',
    label: 'General',
    icon: <InfoCircleOutlined />,
    path: Path.SettingsGeneral,
  },
  {
    key: 'access-control',
    label: 'Access control',
    icon: <SafetyOutlined />,
    path: Path.SettingsAccessControl,
    visible: ({ canAdmin }) => canAdmin,
  },
  {
    key: 'data-connection',
    label: 'Data connection',
    icon: <DatabaseOutlined />,
    path: Path.SettingsDataConnection,
  },
  {
    key: 'byok',
    label: 'BYOK',
    icon: <ApiOutlined />,
    path: Path.SettingsByok,
    visible: ({ canAdmin }) => canAdmin,
  },
  {
    key: 'project-api-keys',
    label: 'API Keys',
    icon: <KeyOutlined />,
    path: Path.SettingsProjectApiKeys,
    visible: ({ canAdmin }) => canAdmin,
  },
  {
    key: 'danger-zone',
    label: 'Danger zone',
    icon: <ExclamationCircleOutlined />,
    path: Path.SettingsDangerZone,
    visible: ({ canAdmin }) => canAdmin,
  },
];

const orgMenuItems: MenuItem[] = [
  {
    key: 'organization',
    label: 'General',
    icon: <TeamOutlined />,
    path: Path.SettingsOrganization,
  },
  {
    key: 'members',
    label: 'Members',
    icon: <UsergroupAddOutlined />,
    path: Path.SettingsMembers,
    visible: ({ isOrgAdmin }) => isOrgAdmin,
  },
  {
    key: 'api-keys',
    label: 'API Keys',
    icon: <KeyOutlined />,
    path: Path.SettingsApiKeys,
    visible: ({ isOrgAdmin }) => isOrgAdmin,
  },
  {
    key: 'audit-log',
    label: 'Audit activity',
    icon: <FileSearchOutlined />,
    path: Path.SettingsAuditLog,
    visible: ({ isOrgAdmin }) => isOrgAdmin,
  },
  {
    key: 'subscriptions',
    label: 'Subscriptions',
    icon: <DollarOutlined />,
    path: Path.SettingsSubscriptions,
    visible: ({ isOrgAdmin }) => isOrgAdmin,
  },
  {
    key: 'org-danger-zone',
    label: 'Danger zone',
    icon: <ExclamationCircleOutlined />,
    path: Path.SettingsOrgDangerZone,
    visible: ({ isOrgAdmin }) => isOrgAdmin,
  },
];

const userMenuItems: MenuItem[] = [
  {
    key: 'user-profile',
    label: 'Profile',
    icon: <UserOutlined />,
    path: Path.SettingsUserProfile,
  },
  {
    key: 'user-danger-zone',
    label: 'Danger zone',
    icon: <ExclamationCircleOutlined />,
    path: Path.SettingsUserDangerZone,
  },
];

interface Props {
  children: React.ReactNode;
  loading?: boolean;
}

export default function SettingsLayout(props: Props) {
  const { children, loading } = props;
  const router = useRouter();
  const { currentProjectId } = useProject();
  const { canAdmin } = useProjectRole();
  const { isAdmin: isOrgAdmin } = useOrganization();
  const bp = (path: Path) => buildPath(path, currentProjectId);

  const visCtx = { canAdmin, isOrgAdmin };
  const filterVisible = (items: MenuItem[]) =>
    items.filter((item) => !item.visible || item.visible(visCtx));

  const activeKey = useMemo(() => {
    const allItems = [...projectMenuItems, ...orgMenuItems, ...userMenuItems];
    const item = allItems.find((item) => item.path === router.pathname);
    return item?.key || 'general';
  }, [router.pathname]);

  const onMenuClick = (path: Path) => {
    router.push(bp(path));
  };

  const onBack = () => {
    router.push(bp(Path.Home));
  };

  return (
    <SimpleLayout loading={loading}>
      <Layout className="adm-layout">
        <StyledSider width={280} className="border-r border-gray-4">
          <div className="py-3 px-4">
            <div className="d-flex align-center gray-9 text-bold mb-3">
              <SettingOutlined className="mr-2 text-md" />
              <span className="text-medium">Settings</span>
            </div>
            <StyledBackButton
              type="text"
              block
              onClick={onBack}
              icon={<ArrowLeftOutlined />}
            >
              Back to app
            </StyledBackButton>
          </div>

          <div className="px-3 flex-grow-1">
            <Typography.Text
              className="d-block px-3 py-1 gray-6 text-xs"
              style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}
            >
              Project
            </Typography.Text>
            {filterVisible(projectMenuItems).map((item) => (
              <StyledMenuButton
                key={item.key}
                type="text"
                block
                $active={activeKey === item.key}
                onClick={() => onMenuClick(item.path)}
                icon={item.icon}
              >
                {item.label}
              </StyledMenuButton>
            ))}

            <Typography.Text
              className="d-block px-3 py-1 mt-3 gray-6 text-xs"
              style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}
            >
              Organization
            </Typography.Text>
            {filterVisible(orgMenuItems).map((item) => (
              <StyledMenuButton
                key={item.key}
                type="text"
                block
                $active={activeKey === item.key}
                onClick={() => onMenuClick(item.path)}
                icon={item.icon}
              >
                {item.label}
              </StyledMenuButton>
            ))}

            <Typography.Text
              className="d-block px-3 py-1 mt-3 gray-6 text-xs"
              style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}
            >
              User
            </Typography.Text>
            {filterVisible(userMenuItems).map((item) => (
              <StyledMenuButton
                key={item.key}
                type="text"
                block
                $active={activeKey === item.key}
                onClick={() => onMenuClick(item.path)}
                icon={item.icon}
              >
                {item.label}
              </StyledMenuButton>
            ))}
          </div>
        </StyledSider>
        <StyledContentLayout>
          <Content className="d-flex flex-column">
            <div className="flex-grow-1" style={{ overflowY: 'auto' }}>
              {children}
            </div>
          </Content>
        </StyledContentLayout>
      </Layout>
    </SimpleLayout>
  );
}
