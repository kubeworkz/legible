import { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Table,
  Tag,
  Typography,
  Modal,
  Form,
  Input,
  Switch,
  message,
  Popconfirm,
  Tooltip,
  Space,
} from 'antd';
import styled from 'styled-components';
import PlusOutlined from '@ant-design/icons/PlusOutlined';
import DeleteOutlined from '@ant-design/icons/DeleteOutlined';
import EditOutlined from '@ant-design/icons/EditOutlined';
import SafetyOutlined from '@ant-design/icons/SafetyOutlined';
import SettingsLayout from '@/components/layouts/SettingsLayout';
import useOrganization from '@/hooks/useOrganization';
import { useQuery, useMutation } from '@apollo/client';
import {
  OIDC_PROVIDERS_ADMIN,
  CREATE_OIDC_PROVIDER,
  UPDATE_OIDC_PROVIDER,
  DELETE_OIDC_PROVIDER,
} from '@/apollo/client/graphql/oidc';

const { Title, Text, Paragraph } = Typography;

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

interface OidcProviderRecord {
  id: number;
  slug: string;
  displayName: string;
  issuerUrl: string;
  clientId: string;
  scopes: string | null;
  emailDomainFilter: string | null;
  autoCreateOrg: boolean;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

// ── Provider Form Modal ───────────────────────────────────────

interface ProviderFormModalProps {
  visible: boolean;
  record: OidcProviderRecord | null; // null = create mode
  onClose: () => void;
  onSave: (values: any) => Promise<void>;
}

function ProviderFormModal({
  visible,
  record,
  onClose,
  onSave,
}: ProviderFormModalProps) {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const isEdit = !!record;

  useEffect(() => {
    if (visible && record) {
      form.setFieldsValue({
        slug: record.slug,
        displayName: record.displayName,
        issuerUrl: record.issuerUrl,
        clientId: record.clientId,
        clientSecret: '',
        scopes: record.scopes || '',
        emailDomainFilter: record.emailDomainFilter || '',
        autoCreateOrg: record.autoCreateOrg,
        enabled: record.enabled,
      });
    } else if (visible) {
      form.resetFields();
      form.setFieldsValue({ autoCreateOrg: false, enabled: true });
    }
  }, [visible, record, form]);

  const handleSave = useCallback(async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      await onSave(values);
      onClose();
    } catch (error) {
      if ((error as any)?.errorFields) return;
      message.error(
        isEdit ? 'Failed to update provider' : 'Failed to create provider',
      );
    } finally {
      setSubmitting(false);
    }
  }, [form, onSave, onClose, isEdit]);

  return (
    <Modal
      title={isEdit ? `Edit ${record?.displayName}` : 'Add SSO Provider'}
      open={visible}
      onOk={handleSave}
      onCancel={onClose}
      confirmLoading={submitting}
      okText={isEdit ? 'Save' : 'Create'}
      destroyOnClose
      width={560}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          label="Slug"
          name="slug"
          rules={[
            { required: true, message: 'Slug is required' },
            {
              pattern: /^[a-z0-9][a-z0-9-]*[a-z0-9]$/,
              message:
                'Lowercase letters, numbers, and hyphens only (min 2 chars)',
            },
          ]}
          extra="URL-safe identifier, e.g. google, okta-prod"
        >
          <Input placeholder="google" disabled={isEdit} />
        </Form.Item>
        <Form.Item
          label="Display Name"
          name="displayName"
          rules={[{ required: true, message: 'Display name is required' }]}
        >
          <Input placeholder="Sign in with Google" />
        </Form.Item>
        <Form.Item
          label="Issuer URL"
          name="issuerUrl"
          rules={[
            { required: true, message: 'Issuer URL is required' },
            { type: 'url', message: 'Must be a valid URL' },
          ]}
          extra="OpenID Connect discovery endpoint base URL"
        >
          <Input placeholder="https://accounts.google.com" />
        </Form.Item>
        <Form.Item
          label="Client ID"
          name="clientId"
          rules={[{ required: true, message: 'Client ID is required' }]}
        >
          <Input placeholder="your-client-id.apps.googleusercontent.com" />
        </Form.Item>
        <Form.Item
          label="Client Secret"
          name="clientSecret"
          rules={isEdit ? [] : [{ required: true, message: 'Client secret is required' }]}
          extra={isEdit ? 'Leave blank to keep existing secret' : undefined}
        >
          <Input.Password placeholder={isEdit ? '••••••••' : 'Client secret'} />
        </Form.Item>
        <Form.Item
          label="Scopes"
          name="scopes"
          extra="Space-separated. Defaults to 'openid email profile' if empty."
        >
          <Input placeholder="openid email profile" />
        </Form.Item>
        <Form.Item
          label="Email Domain Filter"
          name="emailDomainFilter"
          extra="Comma-separated domains to restrict sign-in (e.g. example.com,corp.io). Leave blank to allow all."
        >
          <Input placeholder="example.com" />
        </Form.Item>
        <Form.Item
          label="Auto-create Organization"
          name="autoCreateOrg"
          valuePropName="checked"
        >
          <Switch />
        </Form.Item>
        <Form.Item label="Enabled" name="enabled" valuePropName="checked">
          <Switch />
        </Form.Item>
      </Form>
    </Modal>
  );
}

// ── OIDC Providers Page ───────────────────────────────────────

export default function SettingsOidcProviders() {
  const { currentOrganization, loading: orgLoading } = useOrganization();
  const [formVisible, setFormVisible] = useState(false);
  const [editRecord, setEditRecord] = useState<OidcProviderRecord | null>(
    null,
  );

  const {
    data,
    loading: providersLoading,
    refetch,
  } = useQuery(OIDC_PROVIDERS_ADMIN, {
    skip: !currentOrganization,
    fetchPolicy: 'cache-and-network',
  });

  const [createProvider] = useMutation(CREATE_OIDC_PROVIDER);
  const [updateProvider] = useMutation(UPDATE_OIDC_PROVIDER);
  const [deleteProvider] = useMutation(DELETE_OIDC_PROVIDER);

  const providers: OidcProviderRecord[] = data?.oidcProvidersAdmin || [];

  const openCreate = useCallback(() => {
    setEditRecord(null);
    setFormVisible(true);
  }, []);

  const openEdit = useCallback((record: OidcProviderRecord) => {
    setEditRecord(record);
    setFormVisible(true);
  }, []);

  const handleSave = useCallback(
    async (values: any) => {
      if (editRecord) {
        // Update — only send changed/non-empty fields
        const input: any = {};
        if (values.displayName) input.displayName = values.displayName;
        if (values.issuerUrl) input.issuerUrl = values.issuerUrl;
        if (values.clientId) input.clientId = values.clientId;
        if (values.clientSecret) input.clientSecret = values.clientSecret;
        if (values.scopes !== undefined)
          input.scopes = values.scopes || null;
        if (values.emailDomainFilter !== undefined)
          input.emailDomainFilter = values.emailDomainFilter || null;
        input.autoCreateOrg = values.autoCreateOrg;
        input.enabled = values.enabled;

        await updateProvider({
          variables: { id: editRecord.id, data: input },
        });
        message.success('Provider updated');
      } else {
        // Create
        await createProvider({
          variables: {
            data: {
              slug: values.slug,
              displayName: values.displayName,
              issuerUrl: values.issuerUrl,
              clientId: values.clientId,
              clientSecret: values.clientSecret,
              scopes: values.scopes || null,
              emailDomainFilter: values.emailDomainFilter || null,
              autoCreateOrg: values.autoCreateOrg ?? false,
              enabled: values.enabled ?? true,
            },
          },
        });
        message.success('Provider created');
      }
      await refetch();
    },
    [editRecord, createProvider, updateProvider, refetch],
  );

  const handleDelete = useCallback(
    async (id: number) => {
      try {
        await deleteProvider({ variables: { id } });
        await refetch();
        message.success('Provider deleted');
      } catch {
        message.error('Failed to delete provider');
      }
    },
    [deleteProvider, refetch],
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
      title: 'Provider',
      key: 'provider',
      width: 200,
      render: (_: any, record: OidcProviderRecord) => (
        <div>
          <Text strong>{record.displayName}</Text>
          <br />
          <Text className="gray-6" style={{ fontSize: 12 }}>
            {record.slug}
          </Text>
        </div>
      ),
    },
    {
      title: 'Issuer URL',
      dataIndex: 'issuerUrl',
      key: 'issuerUrl',
      width: 280,
      ellipsis: true,
      render: (url: string) => (
        <Text className="gray-7" style={{ fontSize: 13 }}>
          {url}
        </Text>
      ),
    },
    {
      title: 'Domain Filter',
      dataIndex: 'emailDomainFilter',
      key: 'emailDomainFilter',
      width: 160,
      render: (filter: string | null) =>
        filter ? (
          <Text style={{ fontSize: 12 }}>{filter}</Text>
        ) : (
          <Text className="gray-6">All domains</Text>
        ),
    },
    {
      title: 'Status',
      dataIndex: 'enabled',
      key: 'enabled',
      width: 100,
      render: (enabled: boolean) =>
        enabled ? (
          <Tag color="green">Enabled</Tag>
        ) : (
          <Tag color="default">Disabled</Tag>
        ),
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 130,
      render: (date: string) => (
        <Text className="gray-7">{formatDate(date)}</Text>
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 90,
      render: (_: any, record: OidcProviderRecord) => (
        <Space size={4}>
          <Tooltip title="Edit">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => openEdit(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Delete this SSO provider? Users won't be able to sign in with it."
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
              SSO Providers
            </Title>
            <Paragraph className="gray-7 mb-0">
              Configure OpenID Connect (OIDC) identity providers for
              single sign-on. Users can sign in with any enabled provider.
            </Paragraph>
          </div>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={openCreate}
          >
            Add provider
          </Button>
        </HeaderRow>

        <Table
          dataSource={providers}
          columns={columns}
          rowKey="id"
          loading={providersLoading}
          pagination={false}
          size="middle"
          scroll={{ x: 900 }}
          locale={{
            emptyText: (
              <div style={{ padding: '32px 0' }}>
                <SafetyOutlined
                  style={{ fontSize: 32, color: 'var(--gray-5)' }}
                />
                <Paragraph className="gray-6 mt-2 mb-0">
                  No SSO providers configured. Add one to enable single sign-on.
                </Paragraph>
              </div>
            ),
          }}
        />

        <ProviderFormModal
          visible={formVisible}
          record={editRecord}
          onClose={() => setFormVisible(false)}
          onSave={handleSave}
        />
      </PageContainer>
    </SettingsLayout>
  );
}
