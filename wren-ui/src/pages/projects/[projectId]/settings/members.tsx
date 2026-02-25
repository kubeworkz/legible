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
  Space,
} from 'antd';
import styled from 'styled-components';
import UserAddOutlined from '@ant-design/icons/UserAddOutlined';
import DeleteOutlined from '@ant-design/icons/DeleteOutlined';
import SettingsLayout from '@/components/layouts/SettingsLayout';
import useOrganization, { MemberInfo, MemberRole } from '@/hooks/useOrganization';
import useAuth from '@/hooks/useAuth';

const { Title, Text } = Typography;

const PageContainer = styled.div`
  max-width: 800px;
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

const INVITE_ROLE_OPTIONS = [
  { label: 'Admin', value: 'ADMIN' },
  { label: 'Member', value: 'MEMBER' },
];

// ── Invite Member Modal ──────────────────────────────────────

interface InviteModalProps {
  visible: boolean;
  onClose: () => void;
  onInvite: (email: string, role: MemberRole) => Promise<void>;
}

function InviteMemberModal({ visible, onClose, onInvite }: InviteModalProps) {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const handleOk = useCallback(async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      await onInvite(values.email, values.role);
      form.resetFields();
      onClose();
      message.success(`Invitation sent to ${values.email}`);
    } catch (error) {
      if ((error as any)?.errorFields) return; // validation error
      console.error('Failed to invite member:', error);
      message.error('Failed to send invitation.');
    } finally {
      setSubmitting(false);
    }
  }, [form, onInvite, onClose]);

  const handleCancel = useCallback(() => {
    form.resetFields();
    onClose();
  }, [form, onClose]);

  return (
    <Modal
      title="Invite Member"
      visible={visible}
      onOk={handleOk}
      onCancel={handleCancel}
      confirmLoading={submitting}
      okText="Send Invitation"
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{ role: 'MEMBER' }}
      >
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
          <Select options={INVITE_ROLE_OPTIONS} />
        </Form.Item>
      </Form>
    </Modal>
  );
}

// ── Members Page ─────────────────────────────────────────────

export default function SettingsMembers() {
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
  const [inviteVisible, setInviteVisible] = useState(false);

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

  const handleInvite = useCallback(
    async (email: string, role: MemberRole) => {
      await inviteMember(email, role);
      await refetchMembers();
    },
    [inviteMember, refetchMembers],
  );

  const columns = [
    {
      title: 'Member',
      dataIndex: 'user',
      key: 'user',
      render: (_: any, record: MemberInfo) => (
        <div>
          <Text strong>
            {record.user.displayName || record.user.email}
          </Text>
          {record.user.displayName && (
            <Text className="gray-6 d-block text-sm">
              {record.user.email}
            </Text>
          )}
        </div>
      ),
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      width: 160,
      render: (_: any, record: MemberInfo) => {
        if (record.role === 'OWNER') {
          return <Tag color={ROLE_COLORS.OWNER}>Owner</Tag>;
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
    {
      title: 'Joined',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 140,
      render: (date: string) =>
        new Date(date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
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
                  title="Remove this member? They will lose access to this organization."
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
        <HeaderRow>
          <div>
            <Title level={4} className="gray-9 mb-1">
              Members
            </Title>
            <Text className="gray-6">
              Manage members of{' '}
              <Text strong>{currentOrganization.displayName}</Text>.
            </Text>
          </div>
          {isAdmin && (
            <Button
              type="primary"
              icon={<UserAddOutlined />}
              onClick={() => setInviteVisible(true)}
            >
              Invite Member
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

        <InviteMemberModal
          visible={inviteVisible}
          onClose={() => setInviteVisible(false)}
          onInvite={handleInvite}
        />
      </PageContainer>
    </SettingsLayout>
  );
}
