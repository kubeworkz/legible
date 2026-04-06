import { useRouter } from 'next/router';
import styled from 'styled-components';
import DashboardOutlined from '@ant-design/icons/DashboardOutlined';
import RobotOutlined from '@ant-design/icons/RobotOutlined';
import ThunderboltOutlined from '@ant-design/icons/ThunderboltOutlined';
import { Path, buildPath, MENU_KEY } from '@/utils/enum';
import SidebarMenu from '@/components/sidebar/SidebarMenu';
import useProject from '@/hooks/useProject';

const Layout = styled.div`
  padding: 16px 0;
  position: absolute;
  z-index: 1;
  left: 0;
  top: 0;
  width: 100%;
  background-color: var(--gray-2);
  overflow: hidden;
`;

const MENU_KEY_MAP = {
  [Path.AgentHub]: MENU_KEY.AGENT_HUB,
  [Path.Agents]: MENU_KEY.AGENTS,
  [Path.AgentBuilderAgents]: MENU_KEY.AGENT_BUILDER_AGENTS,
};

export default function AgentHubSidebar() {
  const router = useRouter();
  const { currentProjectId } = useProject();
  const bp = (path: Path) => buildPath(path, currentProjectId);

  const menuItems = [
    {
      label: 'Agent Hub',
      icon: <DashboardOutlined />,
      key: MENU_KEY.AGENT_HUB,
      className: 'pl-4',
      onClick: () => router.push(bp(Path.AgentHub)),
    },
    {
      label: 'Sandbox Agents',
      icon: <RobotOutlined />,
      key: MENU_KEY.AGENTS,
      className: 'pl-4',
      onClick: () => router.push(bp(Path.Agents)),
    },
    {
      label: 'Built Agents',
      icon: <ThunderboltOutlined />,
      key: MENU_KEY.AGENT_BUILDER_AGENTS,
      className: 'pl-4',
      onClick: () => router.push(bp(Path.AgentBuilderAgents)),
    },
  ];

  return (
    <Layout>
      <SidebarMenu
        items={menuItems}
        selectedKeys={MENU_KEY_MAP[router.pathname]}
      />
    </Layout>
  );
}
