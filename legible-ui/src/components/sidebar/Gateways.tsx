import { useRouter } from 'next/router';
import styled from 'styled-components';
import CloudServerOutlined from '@ant-design/icons/CloudServerOutlined';
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
  [Path.Gateways]: MENU_KEY.GATEWAYS,
};

export default function Gateways() {
  const router = useRouter();
  const { currentProjectId } = useProject();
  const bp = (path: Path) => buildPath(path, currentProjectId);

  const menuItems = [
    {
      label: 'Gateway Monitor',
      icon: <CloudServerOutlined />,
      key: MENU_KEY.GATEWAYS,
      className: 'pl-4',
      onClick: () => router.push(bp(Path.Gateways)),
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
