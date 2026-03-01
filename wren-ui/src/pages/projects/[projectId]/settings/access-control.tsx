import { useCallback, useState } from 'react';
import {
  Button,
  Table,
  Tag,
  Select,
  Typography,
  Modal,
  Form,
  Input,
  Radio,
  message,
  Popconfirm,
  Tabs,
  Space,
  Tooltip,
  Divider,
} from 'antd';
import styled from 'styled-components';
import UserAddOutlined from '@ant-design/icons/UserAddOutlined';
import DeleteOutlined from '@ant-design/icons/DeleteOutlined';
import EditOutlined from '@ant-design/icons/EditOutlined';
import SettingsLayout from '@/components/layouts/SettingsLayout';
import useOrganization, { MemberInfo, MemberRole } from '@/hooks/useOrganization';
import useAuth from '@/hooks/useAuth';

const { Title, Text } = Typography;

const PageContainer = styled.div`
  max-width: 900px;
  padding: 24px 32px;
`;

const HeaderRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
`;

type ProjectPermission = 'OWNER' | 'CONTRIBUTOR' | 'VIEWER';

const PERMISSION_COLORS: Record<ProjectPermission, string> = {
  OWNER: 'gold',
  CONTRIBUTOR: 'blue',
  VIEWER: 'default',
};

const ROLE_COLORS: Record<MemberRole, string> = {
  OWNER: 'gold',
  ADMIN: 'blue',
  MEMBER: 'default',
};

const PERMISSION_OPTIONS: { label: string; value: ProjectPermission }[] = [
  { label: 'Owner', value: 'OWNER' },
  { label: 'Contributor', value: 'CONTRIBUTOR' },
  { label: 'Viewer', value: 'VIEWER' },
];

const AVATAR_COLORS = [
  '#f56a00', '#7265e6', '#ffbf00', '#00a2ae',
  '#87d068', '#108ee9', '#eb2f96', '#722ed1',
];

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

const MemberAvatar = styled.span<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background-color: ${(props) => props.$color};
  color: white;
  font-size: 11px;
  font-weight: 600;
  margin-right: 8px;
  flex-shrink: 0;
`;

// ── Add Member Modal ──────────────────────────────────────

interface AddMemberModalProps {
  visible: boolean;
  members: MemberInfo[];
  onClose: () => void;
  onAdd: (email: string, role: MemberRole) => Promise<void>;
}

function AddMemberModal({ visible, members, onClose, onAdd }: AddMemberModalProps) {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const memberOptions = members.map((m) => {
    const name = m.user.displayName || m.user.email;
    const initials = getInitials(name);
    const color = getAvatarColor(name);
    return {
      label: (
        <span className="d-flex align-center">
          <MemberAvatar $color={color}>{initials}</MemberAvatar>
          {name}
        </span>
      ),
      value: m.user.email,
      searchText: `${name} ${m.user.email}`,
    };
  });

  const handleOk = useCallback(async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      await onAdd(values.member, values.permission);
      form.resetFields();
      onClose();
      message.success(`Member added successfully.`);
    } catch (error) {
      if ((error as any)?.errorFields) return;
      console.error('Failed to add member:', error);
      message.error('Failed to add member.');
    } finally {
      setSubmitting(false);
    }
  }, [form, onAdd, onClose]);

  const handleCancel = useCallback(() => {
    form.resetFields();
    onClose();
  }, [form, onClose]);

  return (
    <Modal
      title="Add member"
      visible={visible}
      onOk={handleOk}
      onCancel={handleCancel}
      confirmLoading={submitting}
      okText="Add member"
      destroyOnClose
    >
      <Form form={form} layout="vertical" initialValues={{ permission: 'VIEWER' }}>
        <Form.Item
          label="Member"
          name="member"
          rules={[
            { required: true, message: 'Please select a member' },
          ]}
        >
          <Select
            showSearch
            placeholder="Select a member"
            options={memberOptions}
            filterOption={(input, option) =>
              (option?.searchText as string || '')
                .toLowerCase()
                .includes(input.toLowerCase())
            }
          />
        </Form.Item>
        <Form.Item
          label="Permission"
          name="permission"
          rules={[{ required: true, message: 'Please select a permission' }]}
        >
          <Select options={PERMISSION_OPTIONS} />
        </Form.Item>
      </Form>
    </Modal>
  );
}

// ── Access Control Page ─────────────────────────────────────

export default function SettingsAccessControl() {
  const {
    currentOrganization,
    members,
    membersLoading,
    loading,
    isAdmin,
    updateMemberRole,
    removeMember,
    inviteMember,
    refetchMembers,
  } = useOrganization();
  const { user } = useAuth();
  const [addVisible, setAddVisible] = useState(false);

  const handleRoleChange = useCallback(
    async (memberId: number, role: MemberRole) => {
      try {
        await updateMemberRole(memberId, role);
        await refetchMembers();
        message.success('Member role updated.');
      } catch (error) {
        console.error('Failed to update role:', error);
        message.error('Failed to update member role.');
      }
    },
    [updateMemberRole, refetchMembers],
  );

  const handleRemove = useCallback(
    async (memberId: number) => {
      try {
        await removeMember(memberId);
        await refetchMembers();
        message.success('Member removed.');
      } catch (error) {
        console.error('Failed to remove member:', error);
        message.error('Failed to remove member.');
      }
    },
    [removeMember, refetchMembers],
  );

  const handleAdd = useCallback(
    async (email: string, role: MemberRole) => {
      await inviteMember(email, role);
      await refetchMembers();
    },
    [inviteMember, refetchMembers],
  );

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (_: any, record: MemberInfo) => {
        const isMe = record.userId === user?.id;
        const name = record.user.displayName || record.user.email;
        const initials = getInitials(name);
        const color = getAvatarColor(name);
        return (
          <span className="d-flex align-center">
            <MemberAvatar $color={color}>{initials}</MemberAvatar>
            <Text strong>
              {name}
              {isMe && <Text className="gray-6"> (me)</Text>}
            </Text>
          </span>
        );
      },
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      render: (_: any, record: MemberInfo) => (
        <Text className="gray-7">{record.user.email}</Text>
      ),
    },
    {
      title: 'Organization role',
      dataIndex: 'orgRole',
      key: 'orgRole',
      width: 170,
      render: (_: any, record: MemberInfo) => {
        return <Tag color={ROLE_COLORS[record.role]}>{record.role}</Tag>;
      },
    },
    {
      title: 'Permission',
      dataIndex: 'permission',
      key: 'permission',
      width: 160,
      render: (_: any, record: MemberInfo) => {
        if (record.role === 'OWNER') {
          return (
            <Select
              value="OWNER"
              size="small"
              style={{ width: 130 }}
              disabled
              options={PERMISSION_OPTIONS}
            />
          );
        }
        if (isAdmin && record.userId !== user?.id) {
          return (
            <Select
              defaultValue="VIEWER"
              size="small"
              style={{ width: 130 }}
              options={PERMISSION_OPTIONS}
              onChange={(value) =>
                handleRoleChange(record.id, value as MemberRole)
              }
            />
          );
        }
        return <Tag color="default">Viewer</Tag>;
      },
    },
    ...(isAdmin
      ? [
          {
            title: '',
            key: 'actions',
            width: 60,
            render: (_: any, record: MemberInfo) => {
              if (record.role === 'OWNER') return null;
              if (record.userId === user?.id) return null;
              return (
                <Popconfirm
                  title="Remove this member? They will lose access."
                  onConfirm={() => handleRemove(record.id)}
                  okText="Remove"
                  okButtonProps={{ danger: true }}
                >
                  <Button
                    type="text"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                  />
                </Popconfirm>
              );
            },
          },
        ]
      : []),
  ];

  if (loading || !currentOrganization) {
    return (
      <SettingsLayout loading={loading}>
        <div />
      </SettingsLayout>
    );
  }

  return (
    <SettingsLayout>
      <PageContainer>
        <Title level={4} className="gray-9 mb-3">
          Access control
        </Title>

        <Tabs defaultActiveKey="members">
          <Tabs.TabPane tab="Manage members" key="members">
            <HeaderRow>
              <div />
              {isAdmin && (
                <Button
                  type="primary"
                  icon={<UserAddOutlined />}
                  onClick={() => setAddVisible(true)}
                >
                  Add member
                </Button>
              )}
            </HeaderRow>

            <Table
              dataSource={members}
              columns={columns}
              rowKey="id"
              loading={membersLoading}
              pagination={false}
              size="middle"
            />
          </Tabs.TabPane>

          <Tabs.TabPane tab="Manage groups" key="groups">
            <ManageGroupsTab isAdmin={isAdmin} />
          </Tabs.TabPane>

          <Tabs.TabPane tab="Role permissions" key="permissions">
            <RolePermissionsTab isAdmin={isAdmin} />
          </Tabs.TabPane>
        </Tabs>

        <AddMemberModal
          visible={addVisible}
          members={members}
          onClose={() => setAddVisible(false)}
          onAdd={handleAdd}
        />
      </PageContainer>
    </SettingsLayout>
  );
}

// ── Manage Groups Tab ─────────────────────────────────────

interface Group {
  id: number;
  name: string;
  description: string;
  memberCount: number;
}

const SAMPLE_GROUPS: Group[] = [];

function ManageGroupsTab({ isAdmin }: { isAdmin: boolean }) {
  const [groups, setGroups] = useState<Group[]>(SAMPLE_GROUPS);
  const [addVisible, setAddVisible] = useState(false);
  const [form] = Form.useForm();

  const handleAdd = useCallback(async () => {
    try {
      const values = await form.validateFields();
      const newGroup: Group = {
        id: Date.now(),
        name: values.name,
        description: values.description || '',
        memberCount: 0,
      };
      setGroups((prev) => [...prev, newGroup]);
      form.resetFields();
      setAddVisible(false);
      message.success(`Group "${values.name}" created.`);
    } catch {
      // validation error
    }
  }, [form]);

  const handleDelete = useCallback((id: number) => {
    setGroups((prev) => prev.filter((g) => g.id !== id));
    message.success('Group deleted.');
  }, []);

  const groupColumns = [
    {
      title: 'Group name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => <Text strong>{name}</Text>,
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      render: (desc: string) => (
        <Text className="gray-7">{desc || '—'}</Text>
      ),
    },
    {
      title: 'Members',
      dataIndex: 'memberCount',
      key: 'memberCount',
      width: 100,
      render: (count: number) => count,
    },
    ...(isAdmin
      ? [
          {
            title: 'Action',
            key: 'actions',
            width: 100,
            render: (_: any, record: Group) => (
              <Space>
                <Tooltip title="Edit group">
                  <Button type="text" size="small" icon={<EditOutlined />} />
                </Tooltip>
                <Popconfirm
                  title="Delete this group?"
                  onConfirm={() => handleDelete(record.id)}
                  okText="Delete"
                  okButtonProps={{ danger: true }}
                >
                  <Button
                    type="text"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                  />
                </Popconfirm>
              </Space>
            ),
          },
        ]
      : []),
  ];

  return (
    <>
      <HeaderRow>
        <div />
        {isAdmin && (
          <Button type="primary" onClick={() => setAddVisible(true)}>
            Create group
          </Button>
        )}
      </HeaderRow>
      <Table
        dataSource={groups}
        columns={groupColumns}
        rowKey="id"
        pagination={false}
        size="middle"
        locale={{ emptyText: 'No groups yet. Create a group to organize members.' }}
      />
      <Modal
        title="Create group"
        visible={addVisible}
        onOk={handleAdd}
        onCancel={() => {
          form.resetFields();
          setAddVisible(false);
        }}
        okText="Create"
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="Group name"
            name="name"
            rules={[{ required: true, message: 'Please enter a group name' }]}
          >
            <Input placeholder="e.g. Engineering" />
          </Form.Item>
          <Form.Item label="Description" name="description">
            <Input.TextArea
              placeholder="Optional description"
              rows={3}
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

// ── Role Permissions Tab ──────────────────────────────────

type PermissionLevel = 'read_only' | 'read_update' | 'create_read_update_delete' | 'no_permission';

interface ViewerPermissions {
  modeling: PermissionLevel;
  knowledge: PermissionLevel;
}

const PermissionSection = styled.div`
  margin-bottom: 24px;

  .permission-title {
    font-weight: 600;
    font-size: 14px;
    color: var(--gray-9);
    margin-bottom: 4px;
  }

  .permission-desc {
    font-size: 13px;
    color: var(--gray-7);
    margin-bottom: 12px;
  }

  .ant-radio-wrapper {
    display: flex;
    align-items: flex-start;
    padding: 6px 0;

    .radio-label {
      font-weight: 500;
      color: var(--gray-9);
    }
    .radio-desc {
      font-size: 12px;
      color: var(--gray-7);
      margin-top: 2px;
    }
  }
`;

function RolePermissionsTab({ isAdmin }: { isAdmin: boolean }) {
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [viewerPerms, setViewerPerms] = useState<ViewerPermissions>({
    modeling: 'read_only',
    knowledge: 'read_only',
  });
  const [tempPerms, setTempPerms] = useState<ViewerPermissions>({
    modeling: 'read_only',
    knowledge: 'read_only',
  });

  const openPermissionModal = (role: string) => {
    setEditingRole(role);
    setTempPerms({ ...viewerPerms });
    setModalVisible(true);
  };

  const handleSubmit = () => {
    setViewerPerms({ ...tempPerms });
    setModalVisible(false);
    message.success('Permissions updated.');
  };

  const getViewerDescription = () => {
    const parts: string[] = [];
    if (viewerPerms.modeling === 'read_only') parts.push('Modeling: Read only');
    else parts.push('Modeling: No permission');
    if (viewerPerms.knowledge === 'read_only') parts.push('Knowledge: Read only');
    else parts.push('Knowledge: No permission');
    return parts;
  };

  const roleData = [
    {
      role: 'Owner',
      descriptionLines: ['Full access'],
      canChangePermission: false,
    },
    {
      role: 'Contributor',
      descriptionLines: [
        'Modeling: Read and Update',
        'Knowledge: Create, Read, Update, Delete',
      ],
      canChangePermission: false,
    },
    {
      role: 'Viewer',
      descriptionLines: getViewerDescription(),
      canChangePermission: true,
    },
  ];

  const permissionColumns = [
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      width: 120,
      render: (role: string) => <Text strong>{role}</Text>,
    },
    {
      title: 'Description',
      dataIndex: 'descriptionLines',
      key: 'description',
      render: (lines: string[]) => (
        <div>
          {lines.map((line, i) => (
            <div key={i}>• {line}</div>
          ))}
        </div>
      ),
    },
    {
      title: 'Action',
      key: 'action',
      width: 160,
      render: (_: any, record: any) => {
        if (!record.canChangePermission) return null;
        if (!isAdmin) return null;
        return (
          <Button
            type="link"
            size="small"
            onClick={() => openPermissionModal(record.role)}
          >
            Change permission
          </Button>
        );
      },
    },
  ];

  const CAPABILITIES_MATRIX = [
    { function: 'Update Project Settings', owner: 'Yes', contributor: 'No', viewer: 'No' },
    { function: 'Manage Project Members', owner: 'Yes', contributor: 'No', viewer: 'No' },
    { function: 'Modeling', owner: 'CRUD', contributor: 'RU (Read, Update)', viewer: viewerPerms.modeling === 'read_only' ? 'R (Read Only)' : 'No Permission' },
    { function: 'Knowledge', owner: 'CRUD', contributor: 'CRUD', viewer: viewerPerms.knowledge === 'read_only' ? 'R (Read Only)' : 'No Permission' },
    { function: 'Dashboard', owner: 'CRUD', contributor: 'CRUD', viewer: 'CRUD' },
    { function: 'Spreadsheet', owner: 'CRUD', contributor: 'CRUD', viewer: 'CRUD' },
    { function: 'CSV Download', owner: 'Yes', contributor: 'Yes', viewer: 'Yes' },
  ];

  const capabilityColumns = [
    {
      title: 'Function',
      dataIndex: 'function',
      key: 'function',
      width: 220,
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: 'Project Owner',
      dataIndex: 'owner',
      key: 'owner',
      width: 160,
    },
    {
      title: 'Project Contributor',
      dataIndex: 'contributor',
      key: 'contributor',
      width: 180,
    },
    {
      title: 'Project Viewer',
      dataIndex: 'viewer',
      key: 'viewer',
      width: 160,
    },
  ];

  return (
    <>
      <Table
        dataSource={roleData}
        columns={permissionColumns}
        rowKey="role"
        pagination={false}
        size="middle"
      />

      <Title level={5} className="gray-9 mt-6 mb-3">
        Role Capabilities Matrix
      </Title>
      <Text className="gray-7 d-block mb-3">
        Default permissions for each role. Project Owners can further restrict
        Viewer access to Modeling and Knowledge via the &quot;Change
        permission&quot; action above.
      </Text>
      <Table
        dataSource={CAPABILITIES_MATRIX}
        columns={capabilityColumns}
        rowKey="function"
        pagination={false}
        size="middle"
        bordered
      />

      <Modal
        title={`${editingRole} permission`}
        visible={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={
          <div className="d-flex justify-content-end" style={{ gap: 8 }}>
            <Button onClick={() => setModalVisible(false)}>Cancel</Button>
            <Button type="primary" onClick={handleSubmit}>
              Submit
            </Button>
          </div>
        }
        width={560}
        destroyOnClose
      >
        <PermissionSection>
          <div className="permission-title">Modeling</div>
          <div className="permission-desc">
            Define data models, relationships, and calculations to help AI
            understand data structure and business logic
          </div>
          <Radio.Group
            value={tempPerms.modeling}
            onChange={(e) =>
              setTempPerms((p) => ({ ...p, modeling: e.target.value }))
            }
          >
            <Space direction="vertical">
              <Radio value="read_only">
                <div>
                  <div className="radio-label">Read only</div>
                  <div className="radio-desc">
                    Can view model structures and relationships, but cannot make
                    changes.
                  </div>
                </div>
              </Radio>
              <Radio value="no_permission">
                <div>
                  <div className="radio-label">No permission</div>
                  <div className="radio-desc">
                    This module will be hidden from the user&apos;s interface.
                  </div>
                </div>
              </Radio>
            </Space>
          </Radio.Group>
        </PermissionSection>

        <Divider style={{ margin: '16px 0' }} />

        <PermissionSection>
          <div className="permission-title">Knowledge</div>
          <div className="permission-desc">
            Store and manage verified information that helps the AI generate more
            accurate and consistent responses
          </div>
          <Radio.Group
            value={tempPerms.knowledge}
            onChange={(e) =>
              setTempPerms((p) => ({ ...p, knowledge: e.target.value }))
            }
          >
            <Space direction="vertical">
              <Radio value="read_only">
                <div>
                  <div className="radio-label">Read only</div>
                  <div className="radio-desc">
                    Can browse existing SQL pairs and instructions, but cannot
                    add or edit entries.
                  </div>
                </div>
              </Radio>
              <Radio value="no_permission">
                <div>
                  <div className="radio-label">No permission</div>
                  <div className="radio-desc">
                    This module will be hidden from the user&apos;s interface.
                  </div>
                </div>
              </Radio>
            </Space>
          </Radio.Group>
        </PermissionSection>
      </Modal>
    </>
  );
}
