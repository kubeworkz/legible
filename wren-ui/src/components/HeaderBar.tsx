import { useCallback, useState } from 'react';
import { useRouter } from 'next/router';
import {
  Button,
  Dropdown,
  Input,
  Layout,
  Menu,
  Modal,
  Space,
  Typography,
  Form,
  message,
} from 'antd';
import styled from 'styled-components';
import UserOutlined from '@ant-design/icons/UserOutlined';
import LogoutOutlined from '@ant-design/icons/LogoutOutlined';
import SettingOutlined from '@ant-design/icons/SettingOutlined';
import DownOutlined from '@ant-design/icons/DownOutlined';
import PlusOutlined from '@ant-design/icons/PlusOutlined';
import CheckOutlined from '@ant-design/icons/CheckOutlined';
import LogoBar from '@/components/LogoBar';
import { Path, buildPath } from '@/utils/enum';
import Deploy from '@/components/deploy/Deploy';
import useProject from '@/hooks/useProject';
import useAuth from '@/hooks/useAuth';
import useOrganization from '@/hooks/useOrganization';
import { useApolloClient } from '@apollo/client';

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

const BreadcrumbButton = styled(Button)`
  background: transparent;
  border: none;
  color: var(--gray-3);
  display: flex;
  align-items: center;
  padding: 2px 8px;
  height: 28px;
  font-size: 13px;
  font-weight: 500;

  .anticon-down {
    font-size: 10px;
    margin-left: 4px;
    opacity: 0.7;
  }

  &:hover,
  &:focus {
    background: rgba(255, 255, 255, 0.1);
    color: var(--gray-1);
  }
`;

const BreadcrumbSeparator = styled.span`
  color: rgba(255, 255, 255, 0.3);
  margin: 0 2px;
  font-size: 14px;
  user-select: none;
`;

const OrgAvatar = styled.span<{ $color?: string }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  background: ${(props) => props.$color || 'var(--geekblue-6)'};
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  margin-right: 8px;
  flex-shrink: 0;
`;

const DropdownHeader = styled.div`
  padding: 8px 12px 4px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--gray-6);
`;

// Generate a consistent color for an org based on its name
function orgColor(name: string): string {
  const colors = [
    '#e6194b', '#3cb44b', '#4363d8', '#f58231', '#911eb4',
    '#42d4f4', '#f032e6', '#bfef45', '#fabed4', '#469990',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export default function HeaderBar() {
  const router = useRouter();
  const apolloClient = useApolloClient();
  const {
    projects,
    currentProjectId,
    setCurrentProjectId,
  } = useProject();
  const { user, logout } = useAuth();
  const {
    organizations,
    currentOrganization,
    setCurrentOrgId,
    createOrganization,
  } = useOrganization();
  const { pathname } = router;
  const showNav = !pathname.startsWith(Path.Onboarding);
  const isModeling = pathname.startsWith(Path.Modeling);
  const bp = (path: Path) => buildPath(path, currentProjectId);

  const [newOrgModalVisible, setNewOrgModalVisible] = useState(false);
  const [newOrgForm] = Form.useForm();
  const [creatingOrg, setCreatingOrg] = useState(false);

  const handleCreateOrg = useCallback(async () => {
    try {
      const values = await newOrgForm.validateFields();
      setCreatingOrg(true);
      const slug = values.displayName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      await createOrganization({
        displayName: values.displayName,
        slug: slug + '-' + Math.random().toString(36).slice(2, 6),
      });
      setNewOrgModalVisible(false);
      newOrgForm.resetFields();
      message.success('Organization created');
      // Reset store and redirect to home
      await apolloClient.resetStore();
      router.push('/');
    } catch (err) {
      if (err?.errorFields) return; // validation error
      message.error('Failed to create organization');
    } finally {
      setCreatingOrg(false);
    }
  }, [newOrgForm, createOrganization, apolloClient, router]);

  const handleOrgSwitch = useCallback(
    async (orgId: number) => {
      if (orgId === currentOrganization?.id) return;
      setCurrentOrgId(orgId);
      await apolloClient.resetStore();
      router.push('/');
    },
    [currentOrganization, setCurrentOrgId, apolloClient, router],
  );

  const handleProjectSwitch = useCallback(
    async (projectId: number) => {
      if (projectId === currentProjectId) return;
      setCurrentProjectId(projectId);
      await apolloClient.resetStore();
      router.push(buildPath(Path.Home, projectId));
    },
    [currentProjectId, setCurrentProjectId, apolloClient, router],
  );

  // Current project name
  const currentProject = projects.find((p) => p.id === currentProjectId);
  const projectName = currentProject?.displayName || 'Select Project';
  const orgName = currentOrganization?.displayName || 'Organization';

  const orgMenuOverlay = (
    <Menu>
      <Menu.Item key="__header" disabled style={{ cursor: 'default', padding: 0 }}>
        <DropdownHeader>Organizations</DropdownHeader>
      </Menu.Item>
      <Menu.Divider />
      <Menu.Item
        key="__new"
        icon={<PlusOutlined />}
        onClick={() => setNewOrgModalVisible(true)}
      >
        New organization
      </Menu.Item>
      <Menu.Divider />
      {organizations.map((org) => (
        <Menu.Item
          key={String(org.id)}
          onClick={() => handleOrgSwitch(org.id)}
        >
          <div className="d-flex align-center">
            <OrgAvatar $color={orgColor(org.displayName)}>
              {org.displayName.charAt(0).toUpperCase()}
            </OrgAvatar>
            <span style={{ flex: 1 }}>{org.displayName}</span>
            {org.id === currentOrganization?.id && (
              <CheckOutlined style={{ color: 'var(--geekblue-6)', marginLeft: 8 }} />
            )}
          </div>
        </Menu.Item>
      ))}
    </Menu>
  );

  const projectMenuOverlay = (
    <Menu>
      <Menu.Item key="__header" disabled style={{ cursor: 'default', padding: 0 }}>
        <DropdownHeader>Projects</DropdownHeader>
      </Menu.Item>
      <Menu.Divider />
      <Menu.Item
        key="__new"
        icon={<PlusOutlined />}
        onClick={() =>
          router.push(buildPath(Path.OnboardingConnection, currentProjectId || 0))
        }
      >
        New project
      </Menu.Item>
      {projects.length > 0 && <Menu.Divider />}
      {projects.map((project) => (
        <Menu.Item
          key={String(project.id)}
          onClick={() => handleProjectSwitch(project.id)}
        >
          <div className="d-flex align-center">
            <span style={{ flex: 1 }}>{project.displayName}</span>
            {project.id === currentProjectId && (
              <CheckOutlined style={{ color: 'var(--geekblue-6)', marginLeft: 8 }} />
            )}
          </div>
        </Menu.Item>
      ))}
    </Menu>
  );

  return (
    <>
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
                <StyledButton
                  shape="round"
                  size="small"
                  $isHighlight={pathname.startsWith(Path.DataSecurity)}
                  onClick={() => router.push(bp(Path.DataSecurityRowLevel))}
                >
                  Data Security
                </StyledButton>
              </Space>
            )}
          </Space>
          <Space size={[4, 0]} align="center">
            {isModeling && <Deploy />}
            {currentOrganization && (
              <>
                <Dropdown
                  overlay={orgMenuOverlay}
                  trigger={['click']}
                  placement="bottomRight"
                >
                  <BreadcrumbButton>
                    {orgName}
                    <DownOutlined />
                  </BreadcrumbButton>
                </Dropdown>
                <BreadcrumbSeparator>/</BreadcrumbSeparator>
                <Dropdown
                  overlay={projectMenuOverlay}
                  trigger={['click']}
                  placement="bottomRight"
                >
                  <BreadcrumbButton>
                    {projectName}
                    <DownOutlined />
                  </BreadcrumbButton>
                </Dropdown>
              </>
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

      <Modal
        title="Create Organization"
        visible={newOrgModalVisible}
        onOk={handleCreateOrg}
        onCancel={() => {
          setNewOrgModalVisible(false);
          newOrgForm.resetFields();
        }}
        confirmLoading={creatingOrg}
        okText="Create"
        destroyOnClose
      >
        <Form form={newOrgForm} layout="vertical">
          <Form.Item
            name="displayName"
            label="Organization name"
            rules={[
              { required: true, message: 'Please enter an organization name' },
              { min: 2, message: 'Name must be at least 2 characters' },
            ]}
          >
            <Input placeholder="e.g. My Company" autoFocus />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
