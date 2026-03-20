import { useMemo } from 'react';
import { useRouter } from 'next/router';
import { Layout, Button, Typography, Spin } from 'antd';
import styled, { css } from 'styled-components';
import SimpleLayout from '@/components/layouts/SimpleLayout';
import ArrowLeftOutlined from '@ant-design/icons/ArrowLeftOutlined';
import DashboardOutlined from '@ant-design/icons/DashboardOutlined';
import BankOutlined from '@ant-design/icons/BankOutlined';
import TeamOutlined from '@ant-design/icons/TeamOutlined';
import CrownOutlined from '@ant-design/icons/CrownOutlined';

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
  href: string;
}

const menuItems: MenuItem[] = [
  {
    key: 'overview',
    label: 'Overview',
    icon: <DashboardOutlined />,
    href: '/superadmin',
  },
  {
    key: 'organizations',
    label: 'Organizations',
    icon: <BankOutlined />,
    href: '/superadmin/organizations',
  },
  {
    key: 'users',
    label: 'Users',
    icon: <TeamOutlined />,
    href: '/superadmin/users',
  },
];

interface Props {
  children: React.ReactNode;
  loading?: boolean;
}

export default function SuperadminLayout(props: Props) {
  const { children, loading } = props;
  const router = useRouter();

  const activeKey = useMemo(() => {
    const path = router.pathname;
    if (path === '/superadmin') return 'overview';
    if (path.startsWith('/superadmin/organizations')) return 'organizations';
    if (path.startsWith('/superadmin/users')) return 'users';
    return 'overview';
  }, [router.pathname]);

  const onBack = () => {
    router.push('/');
  };

  if (loading) {
    return (
      <SimpleLayout>
        <div
          className="d-flex align-center justify-center"
          style={{ height: 'calc(100vh - 48px)' }}
        >
          <Spin />
        </div>
      </SimpleLayout>
    );
  }

  return (
    <SimpleLayout>
      <Layout className="adm-layout">
        <StyledSider width={280} className="border-r border-gray-4">
          <div className="py-3 px-4">
            <div className="d-flex align-center gray-9 text-bold mb-3">
              <CrownOutlined className="mr-2 text-md" />
              <span className="text-medium">Superadmin</span>
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
              Platform
            </Typography.Text>
            {menuItems.map((item) => (
              <StyledMenuButton
                key={item.key}
                type="text"
                block
                $active={activeKey === item.key}
                onClick={() => router.push(item.href)}
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
