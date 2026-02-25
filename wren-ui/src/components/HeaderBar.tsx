import { useRouter } from 'next/router';
import { Button, Dropdown, Layout, Menu, Space, Typography } from 'antd';
import styled from 'styled-components';
import UserOutlined from '@ant-design/icons/UserOutlined';
import LogoutOutlined from '@ant-design/icons/LogoutOutlined';
import SettingOutlined from '@ant-design/icons/SettingOutlined';
import SwapOutlined from '@ant-design/icons/SwapOutlined';
import TeamOutlined from '@ant-design/icons/TeamOutlined';
import CheckOutlined from '@ant-design/icons/CheckOutlined';
import LogoBar from '@/components/LogoBar';
import { Path, buildPath } from '@/utils/enum';
import Deploy from '@/components/deploy/Deploy';
import useProject from '@/hooks/useProject';
import useAuth from '@/hooks/useAuth';
import useOrganization from '@/hooks/useOrganization';

const { Header } = Layout;

const StyledButton = styled(Button)<{ $isHighlight: boolean }>`
  background: ${(props) =>
    props.$isHighlight ? 'rgba(255, 255, 255, 0.20)' : 'transparent'};
  font-weight: ${(props) => (props.$isHighlight ? '700' : 'normal')};
  border: none;
  color: var(--gray-1);

  &:hover,
  &:focus {
    background: ${(props) =>
      props.$isHighlight
        ? 'rgba(255, 255, 255, 0.20)'
        : 'rgba(255, 255, 255, 0.05)'};
    color: var(--gray-1);
  }
`;

const StyledHeader = styled(Header)`
  height: 48px;
  border-bottom: 1px solid var(--gray-5);
  background: var(--gray-10);
  padding: 10px 16px;
`;

const AvatarButton = styled(Button)`
  background: rgba(255, 255, 255, 0.15);
  border: none;
  color: var(--gray-1);
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover,
  &:focus {
    background: rgba(255, 255, 255, 0.25);
    color: var(--gray-1);
  }
`;

const OrgButton = styled(Button)`
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: var(--gray-1);
  display: flex;
  align-items: center;
  max-width: 180px;
  font-size: 12px;

  &:hover,
  &:focus {
    background: rgba(255, 255, 255, 0.2);
    color: var(--gray-1);
    border-color: rgba(255, 255, 255, 0.3);
  }

  .anticon {
    font-size: 12px;
  }
`;

export default function HeaderBar() {
  const router = useRouter();
  const { currentProjectId } = useProject();
  const { user, logout } = useAuth();
  const {
    organizations,
    currentOrganization,
    setCurrentOrgId,
  } = useOrganization();
  const { pathname } = router;
  const showNav = !pathname.startsWith(Path.Onboarding);
  const isModeling = pathname.startsWith(Path.Modeling);
  const bp = (path: Path) => buildPath(path, currentProjectId);

  return (
    <StyledHeader>
      <div
        className="d-flex justify-space-between align-center"
        style={{ marginTop: -2 }}
      >
        <Space size={[48, 0]}>
          <LogoBar />
          {showNav && (
            <Space size={[16, 0]}>
              <StyledButton
                shape="round"
                size="small"
                $isHighlight={pathname.startsWith(Path.Home)}
                onClick={() => router.push(bp(Path.Home))}
              >
                Home
              </StyledButton>
              <StyledButton
                shape="round"
                size="small"
                $isHighlight={pathname.startsWith(Path.Modeling)}
                onClick={() => router.push(bp(Path.Modeling))}
              >
                Modeling
              </StyledButton>
              <StyledButton
                shape="round"
                size="small"
                $isHighlight={pathname.startsWith(Path.Knowledge)}
                onClick={() => router.push(bp(Path.KnowledgeQuestionSQLPairs))}
              >
                Knowledge
              </StyledButton>
              <StyledButton
                shape="round"
                size="small"
                $isHighlight={pathname.startsWith(Path.APIManagement)}
                onClick={() => router.push(bp(Path.APIManagementHistory))}
              >
                API
              </StyledButton>
            </Space>
          )}
        </Space>
        <Space size={[12, 0]}>
          {isModeling && <Deploy />}
          {currentOrganization && organizations.length > 1 && (
            <Dropdown
              overlay={
                <Menu
                  items={organizations.map((org) => ({
                    key: String(org.id),
                    icon:
                      org.id === currentOrganization.id ? (
                        <CheckOutlined />
                      ) : (
                        <TeamOutlined />
                      ),
                    label: org.displayName,
                    onClick: () => setCurrentOrgId(org.id),
                  }))}
                />
              }
              trigger={['click']}
              placement="bottomRight"
            >
              <OrgButton size="small" icon={<SwapOutlined />}>
                <Typography.Text
                  ellipsis
                  style={{ color: 'inherit', maxWidth: 130 }}
                >
                  {currentOrganization.displayName}
                </Typography.Text>
              </OrgButton>
            </Dropdown>
          )}
          {user && (
            <Dropdown
              overlay={
                <Menu
                  items={[
                    {
                      key: 'user-info',
                      label: (
                        <Typography.Text strong>
                          {user.displayName || user.email}
                        </Typography.Text>
                      ),
                      disabled: true,
                    },
                    { type: 'divider' as const },
                    {
                      key: 'settings',
                      icon: <SettingOutlined />,
                      label: 'Settings',
                      onClick: () =>
                        router.push(bp(Path.SettingsGeneral)),
                    },
                    {
                      key: 'logout',
                      icon: <LogoutOutlined />,
                      label: 'Sign out',
                      onClick: logout,
                    },
                  ]}
                />
              }
              trigger={['click']}
              placement="bottomRight"
            >
              <AvatarButton shape="circle" size="small">
                <UserOutlined />
              </AvatarButton>
            </Dropdown>
          )}
        </Space>
      </div>
    </StyledHeader>
  );
}
