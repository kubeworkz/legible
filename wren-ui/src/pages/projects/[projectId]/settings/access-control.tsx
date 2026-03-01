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
  message,
  Popconfirm,
  Tabs,
  Space,
  Tooltip,
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

const ROLE_COLORS: Record<MemberRole, string> = {
  OWNER: 'gold',
  ADMIN: 'blue',
  MEMBER: 'default',
};

const ROLE_OPTIONS = [
  { label: 'Admin', value: 'ADMIN' },
  { label: 'Member', value: 'MEMBER' },
];

const PERMISSION_OPTIONS = [
  { label: 'Owner', value: 'OWNER' },
  { label: 'Admin', value: 'ADMIN' },
  { label: 'Member', value: 'MEMBER' },
];

// ── Add Member Modal ──────────────────────────────────────

interface AddMemberModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (email: string, role: MemberRole) => Promise<void>;
}

function AddMemberModal({ visible, onClose, onAdd }: AddMemberModalProps) {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const handleOk = useCallback(async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      await onAdd(values.email, values.role);
      form.resetFields();
      onClose();
      message.success(`Member added: ${values.email}`);
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
      title="Add Member"
      visible={visible}
      onOk={handleOk}
      onCancel={handleCancel}
      confirmLoading={submitting}
      okText="Add member"
      destroyOnClose
    >
      <Form form={form} layout="vertical" initialValues={{ role: 'MEMBER' }}>
        <Form.Item
          label="Email address"
          name="email"
          rules={[
            { required: true, message: 'Please enter an email address' },
            { type: 'email', message: 'Please enter a valid email address' },
          ]}
        >
          <Input placeholder="colleague@example.com" />
        </Form.Item>
        <Form.Item
          label="Role"
          name="role"
          rules={[{ required: true, message: 'Please select a role' }]}
        >
          <Select options={ROLE_OPTIONS} />
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
        return (
          <Text strong>
            {record.user.displayName || record.user.email}
            {isMe && <Text className="gray-6"> (me)</Text>}
          </Text>
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
              value={record.role}
              size="small"
              style={{ width: 120 }}
              disabled
              options={PERMISSION_OPTIONS}
            />
          );
        }
        if (isAdmin && record.userId !== user?.id) {
          return (
            <Select
              value={record.role}
              size="small"
              style={{ width: 120 }}
              options={ROLE_OPTIONS}
              onChange={(value) =>
                handleRoleChange(record.id, value as MemberRole)
              }
            />
          );
        }
        return <Tag color={ROLE_COLORS[record.role]}>{record.role}</Tag>;
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

interface RolePermission {
  role: string;
  description: string;
  canChangePermission: boolean;
}

const ROLE_PERMISSIONS: RolePermission[] = [
  {
    role: 'Owner',
    description: 'Full access',
    canChangePermission: false,
  },
  {
    role: 'Contributor',
    description:
      'Modeling: Read and Update\nKnowledge: Create, Read, Update, Delete',
    canChangePermission: false,
  },
  {
    role: 'Viewer',
    description: 'Modeling: Read only\nKnowledge: Read only',
    canChangePermission: true,
  },
];

function RolePermissionsTab({ isAdmin }: { isAdmin: boolean }) {
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
      dataIndex: 'description',
      key: 'description',
      render: (desc: string) => (
        <div>
          {desc.split('\n').map((line, i) => (
            <div key={i}>• {line}</div>
          ))}
        </div>
      ),
    },
    {
      title: 'Action',
      key: 'action',
      width: 160,
      render: (_: any, record: RolePermission) => {
        if (!record.canChangePermission) return null;
        if (!isAdmin) return null;
        return (
          <Button type="link" size="small">
            Change permission
          </Button>
        );
      },
    },
  ];

  return (
    <Table
      dataSource={ROLE_PERMISSIONS}
      columns={permissionColumns}
      rowKey="role"
      pagination={false}
      size="middle"
    />
  );
}
