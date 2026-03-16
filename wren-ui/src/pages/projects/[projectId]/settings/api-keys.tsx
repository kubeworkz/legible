import { useCallback, useState } from 'react';
import {
  Button,
  Table,
  Tag,
  Typography,
  Modal,
  Form,
  Input,
  InputNumber,
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
import EditOutlined from '@ant-design/icons/EditOutlined';
import SettingsLayout from '@/components/layouts/SettingsLayout';
import useOrganization from '@/hooks/useOrganization';
import { useQuery, useMutation } from '@apollo/client';
import {
  LIST_API_KEYS,
  CREATE_API_KEY,
  REVOKE_API_KEY,
  DELETE_API_KEY,
  UPDATE_API_KEY_RATE_LIMITS,
  RESET_API_KEY_TOKEN_QUOTA,
} from '@/apollo/client/graphql/apiKeys';

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
  max-width: 1200px;
  padding: 24px 32px;
`;

const HeaderRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
`;

interface ApiKeyRecord {
  id: number;
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
  rateLimitRpm: number | null;
  rateLimitRpd: number | null;
  tokenQuotaMonthly: number | null;
  tokenQuotaUsed: number;
  quotaResetAt: string | null;
}

// ── Edit Rate Limits Modal ────────────────────────────────────

interface EditRateLimitsModalProps {
  visible: boolean;
  record: ApiKeyRecord | null;
  onClose: () => void;
  onSave: (
    keyId: number,
    limits: {
      rateLimitRpm?: number | null;
      rateLimitRpd?: number | null;
      tokenQuotaMonthly?: number | null;
    },
  ) => Promise<void>;
  onResetQuota: (keyId: number) => Promise<void>;
}

function EditRateLimitsModal({
  visible,
  record,
  onClose,
  onSave,
  onResetQuota,
}: EditRateLimitsModalProps) {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const handleSave = useCallback(async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      await onSave(record!.id, {
        rateLimitRpm: values.rateLimitRpm || null,
        rateLimitRpd: values.rateLimitRpd || null,
        tokenQuotaMonthly: values.tokenQuotaMonthly || null,
      });
      message.success('Rate limits updated');
      onClose();
    } catch (error) {
      if ((error as any)?.errorFields) return;
      message.error('Failed to update rate limits');
    } finally {
      setSubmitting(false);
    }
  }, [form, record, onSave, onClose]);

  const handleResetQuota = useCallback(async () => {
    if (!record) return;
    try {
      await onResetQuota(record.id);
      message.success('Token quota reset');
      onClose();
    } catch {
      message.error('Failed to reset quota');
    }
  }, [record, onResetQuota, onClose]);

  return (
    <Modal
      title={`Rate limits — ${record?.name || ''}`}
      open={visible}
      onOk={handleSave}
      onCancel={onClose}
      confirmLoading={submitting}
      okText="Save"
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          rateLimitRpm: record?.rateLimitRpm ?? undefined,
          rateLimitRpd: record?.rateLimitRpd ?? undefined,
          tokenQuotaMonthly: record?.tokenQuotaMonthly ?? undefined,
        }}
      >
        <Form.Item
          label="Requests per minute (RPM)"
          name="rateLimitRpm"
          extra="Leave empty for unlimited."
        >
          <InputNumber
            min={1}
            max={100000}
            style={{ width: '100%' }}
            placeholder="Unlimited"
          />
        </Form.Item>
        <Form.Item
          label="Requests per day (RPD)"
          name="rateLimitRpd"
          extra="Leave empty for unlimited."
        >
          <InputNumber
            min={1}
            max={10000000}
            style={{ width: '100%' }}
            placeholder="Unlimited"
          />
        </Form.Item>
        <Form.Item
          label="Monthly token quota"
          name="tokenQuotaMonthly"
          extra="Total LLM tokens allowed per calendar month. Leave empty for unlimited."
        >
          <InputNumber
            min={1000}
            style={{ width: '100%' }}
            placeholder="Unlimited"
            formatter={(v) =>
              v ? `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''
            }
          />
        </Form.Item>
      </Form>
      {record?.tokenQuotaMonthly != null && (
        <div style={{ borderTop: '1px solid var(--gray-4)', paddingTop: 12 }}>
          <Text className="gray-7">
            Used: {(record.tokenQuotaUsed || 0).toLocaleString()} /{' '}
            {record.tokenQuotaMonthly.toLocaleString()} tokens
          </Text>
          <Popconfirm
            title="Reset token usage to 0?"
            onConfirm={handleResetQuota}
            okText="Reset"
          >
            <Button size="small" type="link" danger className="ml-2">
              Reset usage
            </Button>
          </Popconfirm>
        </div>
      )}
    </Modal>
  );
}

// ── Create API Key Modal ──────────────────────────────────────

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
      console.error('Failed to create API key:', error);
      message.error('Failed to create API key.');
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
        title="API Key Created"
        open={visible}
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
      title="Create API Key"
      open={visible}
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

// ── API Keys Page ─────────────────────────────────────────────

export default function SettingsApiKeys() {
  const { currentOrganization, loading: orgLoading, isAdmin } = useOrganization();
  const [createVisible, setCreateVisible] = useState(false);

  const {
    data,
    loading: keysLoading,
    refetch,
  } = useQuery(LIST_API_KEYS, {
    skip: !currentOrganization,
    fetchPolicy: 'cache-and-network',
  });

  const [createApiKey] = useMutation(CREATE_API_KEY);
  const [revokeApiKey] = useMutation(REVOKE_API_KEY);
  const [deleteApiKey] = useMutation(DELETE_API_KEY);
  const [updateRateLimits] = useMutation(UPDATE_API_KEY_RATE_LIMITS);
  const [resetTokenQuota] = useMutation(RESET_API_KEY_TOKEN_QUOTA);

  const apiKeys: ApiKeyRecord[] = data?.listApiKeys || [];

  const [editRateLimitRecord, setEditRateLimitRecord] =
    useState<ApiKeyRecord | null>(null);

  const handleCreate = useCallback(
    async (name: string, expiresAt?: string): Promise<string | null> => {
      const result = await createApiKey({
        variables: { data: { name, expiresAt } },
      });
      await refetch();
      return result.data?.createApiKey?.secretKey || null;
    },
    [createApiKey, refetch],
  );

  const handleRevoke = useCallback(
    async (keyId: number) => {
      try {
        await revokeApiKey({ variables: { keyId } });
        await refetch();
        message.success('API key revoked.');
      } catch (error) {
        console.error('Failed to revoke API key:', error);
        message.error('Failed to revoke API key.');
      }
    },
    [revokeApiKey, refetch],
  );

  const handleDelete = useCallback(
    async (keyId: number) => {
      try {
        await deleteApiKey({ variables: { keyId } });
        await refetch();
        message.success('API key deleted.');
      } catch (error) {
        console.error('Failed to delete API key:', error);
        message.error('Failed to delete API key.');
      }
    },
    [deleteApiKey, refetch],
  );

  const handleUpdateRateLimits = useCallback(
    async (
      keyId: number,
      limits: {
        rateLimitRpm?: number | null;
        rateLimitRpd?: number | null;
        tokenQuotaMonthly?: number | null;
      },
    ) => {
      await updateRateLimits({ variables: { data: { keyId, ...limits } } });
      await refetch();
    },
    [updateRateLimits, refetch],
  );

  const handleResetTokenQuota = useCallback(
    async (keyId: number) => {
      await resetTokenQuota({ variables: { keyId } });
      await refetch();
    },
    [resetTokenQuota, refetch],
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
      render: (name: string, record: ApiKeyRecord) => (
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
    {
      title: 'Rate Limits',
      key: 'rateLimits',
      width: 200,
      render: (_: any, record: ApiKeyRecord) => {
        const parts: string[] = [];
        if (record.rateLimitRpm) parts.push(`${record.rateLimitRpm} RPM`);
        if (record.rateLimitRpd) parts.push(`${record.rateLimitRpd} RPD`);
        if (!parts.length && !record.tokenQuotaMonthly)
          return <Text className="gray-6">No limits</Text>;
        return (
          <div>
            {parts.length > 0 && (
              <Text style={{ fontSize: 12 }}>{parts.join(' · ')}</Text>
            )}
            {record.tokenQuotaMonthly != null && (
              <div style={{ fontSize: 12 }}>
                <Text className="gray-7">
                  Tokens:{' '}
                  {(record.tokenQuotaUsed || 0).toLocaleString()} /{' '}
                  {record.tokenQuotaMonthly.toLocaleString()}
                </Text>
              </div>
            )}
          </div>
        );
      },
    },
    ...(isAdmin
      ? [
          {
            title: '',
            key: 'actions',
            width: 130,
            render: (_: any, record: ApiKeyRecord) => (
              <Space size={4}>
                {!record.revokedAt && (
                  <Tooltip title="Edit rate limits">
                    <Button
                      type="text"
                      size="small"
                      icon={<EditOutlined />}
                      onClick={() => setEditRateLimitRecord(record)}
                    />
                  </Tooltip>
                )}
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

  if (orgLoading || !currentOrganization) {
    return (
      <SettingsLayout loading={orgLoading}>
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
              API Keys
            </Title>
            <Paragraph className="gray-7 mb-0">
              Manage API keys for programmatic access to your organization's
              projects. Keys authenticate requests to the REST API.
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
          locale={{
            emptyText: (
              <div style={{ padding: '32px 0' }}>
                <KeyOutlined
                  style={{ fontSize: 32, color: 'var(--gray-5)' }}
                />
                <Paragraph className="gray-6 mt-2 mb-0">
                  No API keys yet. Create one to get started.
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

        <EditRateLimitsModal
          visible={!!editRateLimitRecord}
          record={editRateLimitRecord}
          onClose={() => setEditRateLimitRecord(null)}
          onSave={handleUpdateRateLimits}
          onResetQuota={handleResetTokenQuota}
        />
      </PageContainer>
    </SettingsLayout>
  );
}
