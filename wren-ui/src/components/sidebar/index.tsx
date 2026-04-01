import { useRouter } from 'next/router';
import { Button } from 'antd';
import styled from 'styled-components';
import { Path, buildPath } from '@/utils/enum';
import { DiscordIcon, GithubIcon } from '@/utils/icons';
import BookOutlined from '@ant-design/icons/BookOutlined';
import SettingOutlined from '@ant-design/icons/SettingOutlined';
import { DOC_LINKS } from '@/utils/docLinks';
import Home, { Props as HomeSidebarProps } from './Home';
import Modeling, { Props as ModelingSidebarProps } from './Modeling';
import Knowledge from './Knowledge';
import Agents from './Agents';
import Blueprints from './Blueprints';
import Gateways from './Gateways';
import AgentHubSidebar from './AgentHub';
import APIManagement from './APIManagement';
import DataSecurity from './DataSecurity';
import LearningSection from '@/components/learning';
import ProjectSwitcher from './ProjectSwitcher';
import useProject from '@/hooks/useProject';
import useProjectRole from '@/hooks/useProjectRole';

const Layout = styled.div`
  position: relative;
  height: 100%;
  background-color: var(--gray-2);
  color: var(--gray-8);
  padding-bottom: 12px;
  overflow-x: hidden;
`;

const Content = styled.div`
  flex-grow: 1;
  overflow-y: auto;
`;

const StyledButton = styled(Button)`
  &&& {
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: flex-start;
    padding-left: 16px;
    padding-right: 16px;
    color: var(--gray-8);
    border-radius: 0;
  }

  &&&:hover,
  &&&:focus {
    background-color: var(--gray-4);
    color: var(--gray-8);
  }
`;

type Props = (ModelingSidebarProps | HomeSidebarProps) & {
  onCollapse?: () => void;
};

const DynamicSidebar = (
  props: Props & {
    pathname: string;
    canAccessModeling: boolean;
    canAccessKnowledge: boolean;
    canAdmin: boolean;
  },
) => {
  const { pathname, canAccessModeling, canAccessKnowledge, canAdmin, ...restProps } = props;

  const getContent = () => {
    if (pathname.startsWith(Path.Home)) {
      return <Home {...(restProps as HomeSidebarProps)} />;
    }

    if (pathname.startsWith(Path.Modeling)) {
      return canAccessModeling ? (
        <Modeling {...(restProps as ModelingSidebarProps)} />
      ) : null;
    }

    if (pathname.startsWith(Path.Knowledge)) {
      return canAccessKnowledge ? <Knowledge /> : null;
    }

    if (pathname.startsWith(Path.Agents)) {
      return <Agents />;
    }

    if (pathname.startsWith(Path.AgentHub)) {
      return <AgentHubSidebar />;
    }

    if (pathname.startsWith(Path.Blueprints)) {
      return <Blueprints />;
    }

    if (pathname.startsWith(Path.Gateways)) {
      return <Gateways />;
    }

    if (pathname.startsWith(Path.APIManagement)) {
      return <APIManagement />;
    }

    if (pathname.startsWith(Path.DataSecurity)) {
      return canAdmin ? <DataSecurity /> : null;
    }

    return null;
  };

  return <Content>{getContent()}</Content>;
};

export default function Sidebar(props: Props) {
  const router = useRouter();
  const { currentProjectId } = useProject();
  const { canAccessModeling, canAccessKnowledge, canAdmin } = useProjectRole();
  const { onCollapse, ...sidebarProps } = props;

  const onSettingsClick = () => {
    router.push(buildPath(Path.SettingsGeneral, currentProjectId));
  };

  return (
    <Layout className="d-flex flex-column">
      <ProjectSwitcher onCollapse={onCollapse} />
      <DynamicSidebar
        {...sidebarProps}
        pathname={router.pathname}
        canAccessModeling={canAccessModeling}
        canAccessKnowledge={canAccessKnowledge}
        canAdmin={canAdmin}
      />
      <LearningSection />
      <div className="border-t border-gray-4 pt-2">
        <StyledButton type="text" block onClick={onSettingsClick}>
          <SettingOutlined className="text-md" />
          Settings
        </StyledButton>
        <StyledButton type="text" block>
          <a
            className="d-flex align-center"
            href={DOC_LINKS.quickstart}
            target="_blank"
            rel="noopener noreferrer"
          >
            <BookOutlined className="mr-2" style={{ fontSize: 16 }} /> Documentation
          </a>
        </StyledButton>
        <StyledButton type="text" block>
          <a
            className="d-flex align-center"
            href="https://discord.com/invite/twQwNmsAG8"
            target="_blank"
            rel="noopener noreferrer"
            data-ph-capture="true"
            data-ph-capture-attribute-name="cta_go_to_discord"
          >
            <DiscordIcon className="mr-2" style={{ width: 16 }} /> Discord
          </a>
        </StyledButton>
        <StyledButton type="text" block>
          <a
            className="d-flex align-center"
            href="https://github.com/kubeworkz/legible"
            target="_blank"
            rel="noopener noreferrer"
            data-ph-capture="true"
            data-ph-capture-attribute-name="cta_go_to_github"
          >
            <GithubIcon className="mr-2" style={{ width: 16 }} /> GitHub
          </a>
        </StyledButton>
      </div>
    </Layout>
  );
}
