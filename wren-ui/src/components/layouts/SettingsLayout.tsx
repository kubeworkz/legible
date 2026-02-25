import { useMemo } from 'react';
import { useRouter } from 'next/router';
import { Layout, Button, Typography } from 'antd';
import styled, { css } from 'styled-components';
import SimpleLayout from '@/components/layouts/SimpleLayout';
import { Path, buildPath } from '@/utils/enum';
import useProject from '@/hooks/useProject';
import SettingOutlined from '@ant-design/icons/SettingOutlined';
import ArrowLeftOutlined from '@ant-design/icons/ArrowLeftOutlined';
import InfoCircleOutlined from '@ant-design/icons/InfoCircleOutlined';
import DatabaseOutlined from '@ant-design/icons/DatabaseOutlined';
import ExclamationCircleOutlined from '@ant-design/icons/ExclamationCircleOutlined';
import TeamOutlined from '@ant-design/icons/TeamOutlined';
import UsergroupAddOutlined from '@ant-design/icons/UsergroupAddOutlined';

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
  display: flex;
  align-items: center;
  padding: 8px 12px;
  margin-bottom: 2px;
  height: auto;
  color: var(--gray-8) !important;

  ${(props) =>
    props.$active &&
    css`
      color: var(--geekblue-6) !important;
      background-color: var(--gray-4) !important;
    `}
`;

const StyledBackButton = styled(Button)`
  display: flex;
  align-items: center;
  padding: 8px 12px;
  height: auto;
  color: var(--gray-7) !important;
`;

interface MenuItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  path: Path;
}

const projectMenuItems: MenuItem[] = [
  {
    key: 'general',
    label: 'General',
    icon: <InfoCircleOutlined />,
    path: Path.SettingsGeneral,
  },
  {
    key: 'data-connection',
    label: 'Data connection',
    icon: <DatabaseOutlined />,
    path: Path.SettingsDataConnection,
  },
  {
    key: 'danger-zone',
    label: 'Danger zone',
    icon: <ExclamationCircleOutlined />,
    path: Path.SettingsDangerZone,
  },
];

const orgMenuItems: MenuItem[] = [
  {
    key: 'organization',
    label: 'Organization',
    icon: <TeamOutlined />,
    path: Path.SettingsOrganization,
  },
  {
    key: 'members',
    label: 'Members',
    icon: <UsergroupAddOutlined />,
    path: Path.SettingsMembers,
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
  const bp = (path: Path) => buildPath(path, currentProjectId);

  const activeKey = useMemo(() => {
    const allItems = [...projectMenuItems, ...orgMenuItems];
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
            {projectMenuItems.map((item) => (
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
            {orgMenuItems.map((item) => (
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
