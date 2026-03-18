import Link from 'next/link';
import { DOC_LINKS } from '@/utils/docLinks';
import { useRouter } from 'next/router';
import styled from 'styled-components';
import { Path, buildPath, MENU_KEY } from '@/utils/enum';
import { OpenInNewIcon } from '@/utils/icons';
import ApiOutlined from '@ant-design/icons/ApiOutlined';
import ReadOutlined from '@ant-design/icons/ReadOutlined';
import BarChartOutlined from '@ant-design/icons/BarChartOutlined';
import DollarOutlined from '@ant-design/icons/DollarOutlined';
import DatabaseOutlined from '@ant-design/icons/DatabaseOutlined';
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
  [Path.APIManagementHistory]: MENU_KEY.API_HISTORY,
  [Path.APIManagementUsage]: MENU_KEY.API_USAGE,
  [Path.APIManagementBilling]: MENU_KEY.API_BILLING,
  [Path.APIManagementQueryUsage]: MENU_KEY.QUERY_USAGE,
};

const linkStyle = { color: 'inherit', transition: 'none' };

export default function APIManagement() {
  const router = useRouter();
  const { currentProjectId } = useProject();

  const menuItems = [
    {
      'data-guideid': 'api-history',
      label: (
        <Link
          style={linkStyle}
          href={buildPath(Path.APIManagementHistory, currentProjectId)}
        >
          API history
        </Link>
      ),
      icon: <ApiOutlined />,
      key: MENU_KEY.API_HISTORY,
      className: 'pl-4',
    },
    {
      'data-guideid': 'api-usage',
      label: (
        <Link
          style={linkStyle}
          href={buildPath(Path.APIManagementUsage, currentProjectId)}
        >
          API Usage
        </Link>
      ),
      icon: <BarChartOutlined />,
      key: MENU_KEY.API_USAGE,
      className: 'pl-4',
    },
    {
      'data-guideid': 'api-billing',
      label: (
        <Link
          style={linkStyle}
          href={buildPath(Path.APIManagementBilling, currentProjectId)}
        >
          API Billing
        </Link>
      ),
      icon: <DollarOutlined />,
      key: MENU_KEY.API_BILLING,
      className: 'pl-4',
    },
    {
      'data-guideid': 'query-usage',
      label: (
        <Link
          style={linkStyle}
          href={buildPath(Path.APIManagementQueryUsage, currentProjectId)}
        >
          Query Usage
        </Link>
      ),
      icon: <DatabaseOutlined />,
      key: MENU_KEY.QUERY_USAGE,
      className: 'pl-4',
    },
    {
      label: (
        <a
          className="gray-8 d-inline-flex align-center"
          href={DOC_LINKS.apiReference}
          target="_blank"
          rel="noopener noreferrer"
        >
          API reference
          <OpenInNewIcon className="ml-1" />
        </a>
      ),
      icon: <ReadOutlined />,
      key: MENU_KEY.API_REFERENCE,
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
