import { useRouter } from 'next/router';
import styled from 'styled-components';
import RobotOutlined from '@ant-design/icons/RobotOutlined';
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
  [Path.Agents]: MENU_KEY.AGENTS,
};

export default function Agents() {
  const router = useRouter();
  const { currentProjectId } = useProject();
  const bp = (path: Path) => buildPath(path, currentProjectId);

  const menuItems = [
    {
      label: 'All Agents',
      icon: <RobotOutlined />,
      key: MENU_KEY.AGENTS,
      className: 'pl-4',
      onClick: () => router.push(bp(Path.Agents)),
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
