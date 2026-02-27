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
} from 'antd';
import styled from 'styled-components';
import UserAddOutlined from '@ant-design/icons/UserAddOutlined';
import DeleteOutlined from '@ant-design/icons/DeleteOutlined';
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

        <HeaderRow>
          <Tabs defaultActiveKey="members">
            <Tabs.TabPane tab="Manage members" key="members" />
          </Tabs>
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

        <AddMemberModal
          visible={addVisible}
          onClose={() => setAddVisible(false)}
          onAdd={handleAdd}
        />
      </PageContainer>
    </SettingsLayout>
  );
}
