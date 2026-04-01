import Link from 'next/link';
import { useRouter } from 'next/router';
import styled from 'styled-components';
import LockOutlined from '@ant-design/icons/LockOutlined';
import SettingOutlined from '@ant-design/icons/SettingOutlined';
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
  [Path.DataSecurityRowLevel]: MENU_KEY.ROW_LEVEL_SECURITY,
  [Path.DataSecuritySessionProperty]: MENU_KEY.SESSION_PROPERTY,
};

const linkStyle = { color: 'inherit', transition: 'none' };

export default function DataSecurity() {
  const router = useRouter();
  const { currentProjectId } = useProject();
  const bp = (path: Path) => buildPath(path, currentProjectId);

  const menuItems = [
    {
      label: (
        <Link style={linkStyle} href={bp(Path.DataSecurityRowLevel)}>
          Row-level security
        </Link>
      ),
      icon: <LockOutlined />,
      key: MENU_KEY.ROW_LEVEL_SECURITY,
      className: 'pl-4',
    },
    {
      label: (
        <Link style={linkStyle} href={bp(Path.DataSecuritySessionProperty)}>
          Session property
        </Link>
      ),
      icon: <SettingOutlined />,
      key: MENU_KEY.SESSION_PROPERTY,
      className: 'pl-4',
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
