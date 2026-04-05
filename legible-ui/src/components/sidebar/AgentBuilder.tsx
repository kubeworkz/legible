import { useRouter } from 'next/router';
import styled from 'styled-components';
import BuildOutlined from '@ant-design/icons/BuildOutlined';
import FileTextOutlined from '@ant-design/icons/FileTextOutlined';
import ApiOutlined from '@ant-design/icons/ApiOutlined';
import ApartmentOutlined from '@ant-design/icons/ApartmentOutlined';
import HistoryOutlined from '@ant-design/icons/HistoryOutlined';
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

// Longest-first so sub-pages match before the parent
const MENU_KEY_MAP_ENTRIES: Array<[string, string]> = (
  [
    [Path.AgentBuilderPromptTemplates, MENU_KEY.AGENT_BUILDER_PROMPT_TEMPLATES],
    [Path.AgentBuilderToolRegistry, MENU_KEY.AGENT_BUILDER_TOOL_REGISTRY],
    [Path.AgentBuilderExecutionHistory, MENU_KEY.AGENT_BUILDER_EXECUTION_HISTORY],
    [Path.AgentBuilderWorkflows, MENU_KEY.AGENT_BUILDER_WORKFLOWS],
    [Path.AgentBuilder, MENU_KEY.AGENT_BUILDER],
  ] as Array<[string, string]>
).sort((a, b) => b[0].length - a[0].length);

function getSelectedKey(pathname: string): string | undefined {
  const match = MENU_KEY_MAP_ENTRIES.find(([path]) =>
    pathname.startsWith(path),
  );
  return match?.[1];
}

export default function AgentBuilderSidebar() {
  const router = useRouter();
  const { currentProjectId } = useProject();
  const bp = (path: Path) => buildPath(path, currentProjectId);

  const menuItems = [
    {
      label: 'Overview',
      icon: <BuildOutlined />,
      key: MENU_KEY.AGENT_BUILDER,
      className: 'pl-4',
      onClick: () => router.push(bp(Path.AgentBuilder)),
    },
    {
      label: 'Prompt Templates',
      icon: <FileTextOutlined />,
      key: MENU_KEY.AGENT_BUILDER_PROMPT_TEMPLATES,
      className: 'pl-4',
      onClick: () => router.push(bp(Path.AgentBuilderPromptTemplates)),
    },
    {
      label: 'Tool Registry',
      icon: <ApiOutlined />,
      key: MENU_KEY.AGENT_BUILDER_TOOL_REGISTRY,
      className: 'pl-4',
      onClick: () => router.push(bp(Path.AgentBuilderToolRegistry)),
    },
    {
      label: 'Workflows',
      icon: <ApartmentOutlined />,
      key: MENU_KEY.AGENT_BUILDER_WORKFLOWS,
      className: 'pl-4',
      onClick: () => router.push(bp(Path.AgentBuilderWorkflows)),
    },
    {
      label: 'Execution History',
      icon: <HistoryOutlined />,
      key: MENU_KEY.AGENT_BUILDER_EXECUTION_HISTORY,
      className: 'pl-4',
      onClick: () => router.push(bp(Path.AgentBuilderExecutionHistory)),
    },
  ];

  const selectedKey = getSelectedKey(router.pathname);

  return (
    <Layout>
      <SidebarMenu
        items={menuItems}
        selectedKeys={selectedKey ? [selectedKey] : []}
      />
    </Layout>
  );
}
