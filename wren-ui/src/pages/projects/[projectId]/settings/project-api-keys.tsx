import { useCallback, useState } from 'react';
import {
  Button,
  Table,
  Tag,
  Typography,
  Modal,
  Form,
  Input,
  DatePicker,
  message,
  Popconfirm,
  Tooltip,
  Alert,
  Space,
} from 'antd';
import styled from 'styled-components';
import PlusOutlined from '@ant-design/icons/PlusOutlined';
import DeleteOutlined from '@ant-design/icons/DeleteOutlined';
import StopOutlined from '@ant-design/icons/StopOutlined';
import CopyOutlined from '@ant-design/icons/CopyOutlined';
import KeyOutlined from '@ant-design/icons/KeyOutlined';
import SettingsLayout from '@/components/layouts/SettingsLayout';
import useProject from '@/hooks/useProject';
import useOrganization from '@/hooks/useOrganization';
import { useQuery, useMutation } from '@apollo/client';
import {
  LIST_PROJECT_API_KEYS,
  CREATE_PROJECT_API_KEY,
  REVOKE_PROJECT_API_KEY,
  DELETE_PROJECT_API_KEY,
} from '@/apollo/client/graphql/projectApiKeys';

const { Title, Text, Paragraph } = Typography;

function copyText(text: string) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
  } else {
    fallbackCopy(text);
  }
}

function fallbackCopy(text: string) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  document.body.removeChild(ta);
}

const PageContainer = styled.div`
  max-width: 960px;
  padding: 24px 32px;
`;

const HeaderRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
`;

interface ProjectApiKeyRecord {
  id: number;
  projectId: number;
  organizationId: number;
  name: string;
  secretKeyMasked: string;
  permissions: string[];
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdBy: number;
  createdByEmail: string | null;
  createdAt: string;
  revokedAt: string | null;
}

// ── Create Project API Key Modal ──────────────────────────────

interface CreateKeyModalProps {
  visible: boolean;
  onClose: () => void;
  onCreate: (name: string, expiresAt?: string) => Promise<string | null>;
}

function CreateKeyModal({ visible, onClose, onCreate }: CreateKeyModalProps) {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [newSecretKey, setNewSecretKey] = useState<string | null>(null);

  const handleCreate = useCallback(async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      const expiresAt = values.expiresAt
        ? values.expiresAt.toISOString()
        : undefined;
      const secretKey = await onCreate(values.name, expiresAt);
      setNewSecretKey(secretKey);
    } catch (error) {
      if ((error as any)?.errorFields) return;
      console.error('Failed to create project API key:', error);
      message.error('Failed to create project API key.');
    } finally {
      setSubmitting(false);
    }
  }, [form, onCreate]);

  const handleClose = useCallback(() => {
    form.resetFields();
    setNewSecretKey(null);
    onClose();
  }, [form, onClose]);

  const copyToClipboard = useCallback(() => {
    if (newSecretKey) {
      copyText(newSecretKey);
      message.success('API key copied to clipboard');
    }
  }, [newSecretKey]);

  // After key is created — show the secret key
  if (newSecretKey) {
    return (
      <Modal
        title="Project API Key Created"
        visible={visible}
        onCancel={handleClose}
        footer={[
          <Button key="done" type="primary" onClick={handleClose}>
            Done
          </Button>,
        ]}
        closable={false}
        maskClosable={false}
      >
        <Alert
          type="warning"
          showIcon
          message="Save this key — you won't be able to see it again"
          className="mb-3"
        />
        <div
          style={{
            background: 'var(--gray-3)',
            borderRadius: 6,
            padding: '12px 16px',
            fontFamily: 'monospace',
            fontSize: 13,
            wordBreak: 'break-all',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Text code style={{ flex: 1, fontSize: 13 }}>
            {newSecretKey}
          </Text>
          <Tooltip title="Copy to clipboard">
            <Button
              type="text"
              size="small"
              icon={<CopyOutlined />}
              onClick={copyToClipboard}
            />
          </Tooltip>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      title="Create Project API Key"
      visible={visible}
      onOk={handleCreate}
      onCancel={handleClose}
      confirmLoading={submitting}
      okText="Create key"
      destroyOnClose
    >
      <Form form={form} layout="vertical">
        <Form.Item
          label="Key name"
          name="name"
          rules={[
            { required: true, message: 'Please name your API key' },
            { max: 64, message: 'Name must be 64 characters or fewer' },
          ]}
        >
          <Input placeholder="e.g. Production Backend, CI Pipeline" />
        </Form.Item>
        <Form.Item
          label="Expiration date (optional)"
          name="expiresAt"
          extra="Leave empty for a key that never expires."
        >
          <DatePicker
            style={{ width: '100%' }}
            showTime={false}
            format="YYYY-MM-DD"
            disabledDate={(current) =>
              current && current.valueOf() < Date.now() - 86400000
            }
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}

// ── Project API Keys Page ─────────────────────────────────────

export default function SettingsProjectApiKeys() {
  const { currentProjectId, loading: projectLoading } = useProject();
  const { isAdmin } = useOrganization();
  const [createVisible, setCreateVisible] = useState(false);

  const {
    data,
    loading: keysLoading,
    refetch,
  } = useQuery(LIST_PROJECT_API_KEYS, {
    variables: { projectId: currentProjectId },
    skip: !currentProjectId,
    fetchPolicy: 'cache-and-network',
  });

  const [createProjectApiKey] = useMutation(CREATE_PROJECT_API_KEY);
  const [revokeProjectApiKey] = useMutation(REVOKE_PROJECT_API_KEY);
  const [deleteProjectApiKey] = useMutation(DELETE_PROJECT_API_KEY);

  const apiKeys: ProjectApiKeyRecord[] = data?.listProjectApiKeys || [];

  const handleCreate = useCallback(
    async (name: string, expiresAt?: string): Promise<string | null> => {
      const result = await createProjectApiKey({
        variables: {
          data: { projectId: currentProjectId, name, expiresAt },
        },
      });
      await refetch();
      return result.data?.createProjectApiKey?.secretKey || null;
    },
    [createProjectApiKey, refetch, currentProjectId],
  );

  const handleRevoke = useCallback(
    async (keyId: number) => {
      try {
        await revokeProjectApiKey({
          variables: { keyId, projectId: currentProjectId },
        });
        await refetch();
        message.success('Project API key revoked.');
      } catch (error) {
        console.error('Failed to revoke project API key:', error);
        message.error('Failed to revoke project API key.');
      }
    },
    [revokeProjectApiKey, refetch, currentProjectId],
  );

  const handleDelete = useCallback(
    async (keyId: number) => {
      try {
        await deleteProjectApiKey({
          variables: { keyId, projectId: currentProjectId },
        });
        await refetch();
        message.success('Project API key deleted.');
      } catch (error) {
        console.error('Failed to delete project API key:', error);
        message.error('Failed to delete project API key.');
      }
    },
    [deleteProjectApiKey, refetch, currentProjectId],
  );

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (name: string, record: ProjectApiKeyRecord) => (
        <Space>
          <KeyOutlined className="gray-6" />
          <Text strong>{name}</Text>
          {record.revokedAt && (
            <Tag color="red" style={{ marginLeft: 4 }}>
              Revoked
            </Tag>
          )}
        </Space>
      ),
    },
    {
      title: 'Key',
      dataIndex: 'secretKeyMasked',
      key: 'secretKeyMasked',
      width: 250,
      render: (masked: string) => (
        <Space size={4}>
          <Text code style={{ fontSize: 12 }}>
            {masked}
          </Text>
          <Tooltip title="Copy to clipboard">
            <Button
              type="text"
              size="small"
              icon={<CopyOutlined />}
              onClick={() => {
                copyText(masked);
                message.success('Copied to clipboard');
              }}
            />
          </Tooltip>
        </Space>
      ),
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 140,
      render: (date: string) => (
        <Text className="gray-7">{formatDate(date)}</Text>
      ),
    },
    {
      title: 'Created by',
      dataIndex: 'createdByEmail',
      key: 'createdByEmail',
      width: 180,
      render: (email: string | null) => (
        <Text className="gray-7">{email || '—'}</Text>
      ),
    },
    {
      title: 'Last used',
      dataIndex: 'lastUsedAt',
      key: 'lastUsedAt',
      width: 140,
      render: (date: string | null) => (
        <Text className="gray-7">{formatDate(date)}</Text>
      ),
    },
    {
      title: 'Expires',
      dataIndex: 'expiresAt',
      key: 'expiresAt',
      width: 140,
      render: (date: string | null) => {
        if (!date) return <Text className="gray-6">Never</Text>;
        const isExpired = new Date(date) < new Date();
        return (
          <Text className={isExpired ? 'red-6' : 'gray-7'}>
            {formatDate(date)}
            {isExpired && ' (expired)'}
          </Text>
        );
      },
    },
    ...(isAdmin
      ? [
          {
            title: '',
            key: 'actions',
            width: 100,
            render: (_: any, record: ProjectApiKeyRecord) => (
              <Space size={4}>
                {!record.revokedAt && (
                  <Popconfirm
                    title="Revoke this API key? It will stop working immediately."
                    onConfirm={() => handleRevoke(record.id)}
                    okText="Revoke"
                    okButtonProps={{ danger: true }}
                  >
                    <Tooltip title="Revoke">
                      <Button
                        type="text"
                        size="small"
                        icon={<StopOutlined />}
                      />
                    </Tooltip>
                  </Popconfirm>
                )}
                <Popconfirm
                  title="Permanently delete this API key?"
                  onConfirm={() => handleDelete(record.id)}
                  okText="Delete"
                  okButtonProps={{ danger: true }}
                >
                  <Tooltip title="Delete">
                    <Button
                      type="text"
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                    />
                  </Tooltip>
                </Popconfirm>
              </Space>
            ),
          },
        ]
      : []),
  ];

  if (projectLoading || !currentProjectId) {
    return (
      <SettingsLayout loading={projectLoading}>
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
              Project API Keys
            </Title>
            <Paragraph className="gray-7 mb-0">
              Manage API keys scoped to this project. These keys authenticate
              requests to the REST API and are limited to this project's
              resources.
            </Paragraph>
          </div>
          {isAdmin && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setCreateVisible(true)}
            >
              Create key
            </Button>
          )}
        </HeaderRow>

        <Table
          dataSource={apiKeys}
          columns={columns}
          rowKey="id"
          loading={keysLoading}
          pagination={false}
          size="middle"
          scroll={{ x: 1100 }}
          locale={{
            emptyText: (
              <div style={{ padding: '32px 0' }}>
                <KeyOutlined
                  style={{ fontSize: 32, color: 'var(--gray-5)' }}
                />
                <Paragraph className="gray-6 mt-2 mb-0">
                  No project API keys yet. Create one to get started.
                </Paragraph>
              </div>
            ),
          }}
        />

        <CreateKeyModal
          visible={createVisible}
          onClose={() => setCreateVisible(false)}
          onCreate={handleCreate}
        />
      </PageContainer>
    </SettingsLayout>
  );
}
