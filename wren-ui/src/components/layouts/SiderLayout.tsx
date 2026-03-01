import { useState } from 'react';
import { Layout, Button, Tooltip } from 'antd';
import styled, { css } from 'styled-components';
import MenuUnfoldOutlined from '@ant-design/icons/MenuUnfoldOutlined';
import SimpleLayout from '@/components/layouts/SimpleLayout';
import Sidebar from '@/components/sidebar';

const { Sider } = Layout;

const basicStyle = css`
  height: calc(100vh - 48px);
  overflow: auto;
`;

const StyledContentLayout = styled(Layout)<{ color?: string }>`
  position: relative;
  ${basicStyle}
  ${(props) => props.color && `background-color: var(--${props.color});`}
`;

const StyledSider = styled(Sider)`
  ${basicStyle}

  &.ant-layout-sider-collapsed {
    min-width: 0 !important;
    max-width: 0 !important;
    width: 0 !important;
    flex: 0 0 0 !important;
    overflow: hidden;
  }
`;

const ExpandButton = styled(Button)`
  position: fixed;
  left: 8px;
  bottom: 60px;
  z-index: 10;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--gray-2) !important;
  border: 1px solid var(--gray-5) !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  color: var(--gray-7) !important;
  &:hover {
    color: var(--gray-9) !important;
    border-color: var(--gray-6) !important;
  }
`;

type Props = React.ComponentProps<typeof SimpleLayout> & {
  sidebar?: React.ComponentProps<typeof Sidebar>;
  color?: string;
};

export default function SiderLayout(props: Props) {
  const { sidebar, loading, color } = props;
  const [collapsed, setCollapsed] = useState(false);

  return (
    <SimpleLayout loading={loading}>
      <Layout className="adm-layout">
        <StyledSider width={280} collapsed={collapsed} collapsedWidth={0}>
          <Sidebar {...sidebar} onCollapse={() => setCollapsed(true)} />
        </StyledSider>
        <StyledContentLayout color={color}>
          {collapsed && (
            <Tooltip title="Expand sidebar" placement="right">
              <ExpandButton
                type="text"
                icon={<MenuUnfoldOutlined />}
                onClick={() => setCollapsed(false)}
              />
            </Tooltip>
          )}
          {props.children}
        </StyledContentLayout>
      </Layout>
    </SimpleLayout>
  );
}
