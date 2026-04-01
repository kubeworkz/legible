import { useRouter } from 'next/router';
import styled from 'styled-components';
import BlockOutlined from '@ant-design/icons/BlockOutlined';
import AppstoreOutlined from '@ant-design/icons/AppstoreOutlined';
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
  [Path.BlueprintRegistry]: MENU_KEY.BLUEPRINT_REGISTRY,
  [Path.Blueprints]: MENU_KEY.BLUEPRINTS,
};

export default function Blueprints() {
  const router = useRouter();
  const { currentProjectId } = useProject();
  const bp = (path: Path) => buildPath(path, currentProjectId);

  const menuItems = [
    {
      label: 'All Blueprints',
      key: MENU_KEY.BLUEPRINTS,
      icon: <BlockOutlined />,
      onClick: () => router.push(bp(Path.Blueprints)),
    },
    {
      label: 'Template Gallery',
      key: MENU_KEY.BLUEPRINT_REGISTRY,
      icon: <AppstoreOutlined />,
      onClick: () => router.push(bp(Path.BlueprintRegistry)),
    },
  ];

  const selectedKeys = Object.entries(MENU_KEY_MAP)
    .filter(([path]) => router.pathname.startsWith(path))
    .map(([, key]) => key);

  return (
    <Layout>
      <SidebarMenu
        items={menuItems}
        selectedKeys={selectedKeys}
        defaultOpenKeys={[]}
      />
    </Layout>
  );
}
