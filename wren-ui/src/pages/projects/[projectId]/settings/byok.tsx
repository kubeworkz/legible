import { useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  Select,
  Space,
  Typography,
  Modal,
  message,
  Tag,
} from 'antd';
import styled from 'styled-components';
import { useQuery, useMutation } from '@apollo/client';
import SettingsLayout from '@/components/layouts/SettingsLayout';
import {
  PROJECT_LLM_CONFIG,
  SET_PROJECT_LLM_KEY,
  CLEAR_PROJECT_LLM_KEY,
} from '@/apollo/client/graphql/byok';
import { parseGraphQLError } from '@/utils/errorHandler';
import KeyOutlined from '@ant-design/icons/KeyOutlined';
import DeleteOutlined from '@ant-design/icons/DeleteOutlined';
import CheckCircleOutlined from '@ant-design/icons/CheckCircleOutlined';

const { Title, Text, Paragraph } = Typography;

const PageContainer = styled.div`
  max-width: 640px;
  padding: 24px 32px;
`;

const PROVIDER_OPTIONS = [
  { value: 'openrouter', label: 'OpenRouter (Default)' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'azure', label: 'Azure OpenAI' },
  { value: 'google', label: 'Google AI (Gemini)' },
  { value: 'groq', label: 'Groq' },
  { value: 'together', label: 'Together AI' },
  { value: 'mistral', label: 'Mistral AI' },
];

export default function ByokSettingsPage() {
  const [form] = Form.useForm();
  const [isEditing, setIsEditing] = useState(false);

  const { data, loading, refetch } = useQuery(PROJECT_LLM_CONFIG, {
    fetchPolicy: 'network-only',
  });

  const [setProjectLlmKey, { loading: saving }] = useMutation(
    SET_PROJECT_LLM_KEY,
    {
      onCompleted: () => {
        message.success('API key saved successfully');
        setIsEditing(false);
        form.resetFields();
        refetch();
      },
      onError: (error) => {
        const parsed = parseGraphQLError(error);
        message.error(parsed?.message || 'Failed to save API key');
      },
    },
  );

  const [clearProjectLlmKey, { loading: clearing }] = useMutation(
    CLEAR_PROJECT_LLM_KEY,
    {
      onCompleted: () => {
        message.success('API key removed. Using system default.');
        refetch();
      },
      onError: (error) => {
        const parsed = parseGraphQLError(error);
        message.error(parsed?.message || 'Failed to remove API key');
      },
    },
  );

  const config = data?.projectLlmConfig;
  const hasKey = config?.hasApiKey ?? false;

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      await setProjectLlmKey({
        variables: {
          data: {
            apiKey: values.apiKey,
            provider: values.provider || 'openrouter',
          },
        },
      });
    } catch {
      // validation errors handled by form
    }
  };

  const handleClear = () => {
    Modal.confirm({
      title: 'Remove API key?',
      content:
        'This will remove the custom API key from this project. The system will revert to using the default OpenRouter key for AI operations.',
      okText: 'Remove',
      okButtonProps: { danger: true },
      onOk: () => clearProjectLlmKey(),
    });
  };

  const providerLabel = PROVIDER_OPTIONS.find(
    (p) => p.value === config?.provider,
  )?.label || config?.provider || 'System Default';

  return (
    <SettingsLayout>
      <PageContainer>
        <Title level={4} className="mb-1">
          <KeyOutlined className="mr-2" />
          Bring Your Own Key (BYOK)
        </Title>
        <Paragraph type="secondary" className="mb-6">
          Configure a custom LLM API key for this project. When set, all AI
          operations in this project will use your key instead of the shared
          system default.
        </Paragraph>

        <Alert
          type="info"
          showIcon
          className="mb-6"
          message="How BYOK works"
          description={
            <>
              By default, all projects use the system&apos;s shared OpenRouter API key,
              which gives access to many LLMs. You can optionally provide your own
              API key to use a different provider or your own billing account. The
              key is encrypted at rest and only used for AI operations within this
              project.
            </>
          }
        />

        {/* Current status */}
        <Card
          className="mb-6"
          title="Current Configuration"
          loading={loading}
        >
          {hasKey ? (
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <div>
                <Text type="secondary">Status</Text>
                <div>
                  <Tag color="green" icon={<CheckCircleOutlined />}>
                    Custom key active
                  </Tag>
                </div>
              </div>
              <div>
                <Text type="secondary">Provider</Text>
                <div>
                  <Text strong>{providerLabel}</Text>
                </div>
              </div>
              <div>
                <Text type="secondary">API Key</Text>
                <div>
                  <Text code>{config?.maskedApiKey}</Text>
                </div>
              </div>
              <Space>
                <Button
                  type="primary"
                  onClick={() => setIsEditing(true)}
                >
                  Update key
                </Button>
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  loading={clearing}
                  onClick={handleClear}
                >
                  Remove key
                </Button>
              </Space>
            </Space>
          ) : (
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <div>
                <Text type="secondary">Status</Text>
                <div>
                  <Tag>Using system default</Tag>
                </div>
              </div>
              <Paragraph type="secondary">
                No custom API key has been configured for this project. All AI
                operations will use the shared system OpenRouter key.
              </Paragraph>
              <Button type="primary" onClick={() => setIsEditing(true)}>
                Add API key
              </Button>
            </Space>
          )}
        </Card>

        {/* Edit form */}
        {isEditing && (
          <Card title={hasKey ? 'Update API Key' : 'Add API Key'}>
            <Form
              form={form}
              layout="vertical"
              initialValues={{ provider: 'openrouter' }}
            >
              <Form.Item
                name="provider"
                label="LLM Provider"
                extra="Select the provider that matches your API key."
              >
                <Select
                  options={PROVIDER_OPTIONS}
                  placeholder="Select a provider"
                  style={{ width: '100%' }}
                />
              </Form.Item>
              <Form.Item
                name="apiKey"
                label="API Key"
                rules={[
                  { required: true, message: 'Please enter your API key' },
                  { min: 8, message: 'API key must be at least 8 characters' },
                ]}
                extra="Your key will be encrypted before storage."
              >
                <Input.Password
                  placeholder="sk-..."
                  autoComplete="off"
                />
              </Form.Item>
              <Space>
                <Button
                  type="primary"
                  loading={saving}
                  onClick={handleSave}
                >
                  Save key
                </Button>
                <Button onClick={() => { setIsEditing(false); form.resetFields(); }}>
                  Cancel
                </Button>
              </Space>
            </Form>
          </Card>
        )}
      </PageContainer>
    </SettingsLayout>
  );
}
