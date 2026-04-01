import { useMemo, useState } from 'react';
import {
  Button,
  Tag,
  Table,
  TableColumnsType,
  Typography,
  Modal,
  Input,
  Form,
  Space,
  message,
} from 'antd';
import BlockOutlined from '@ant-design/icons/BlockOutlined';
import PlusOutlined from '@ant-design/icons/PlusOutlined';
import DeleteOutlined from '@ant-design/icons/DeleteOutlined';
import EditOutlined from '@ant-design/icons/EditOutlined';
import ExclamationCircleOutlined from '@ant-design/icons/ExclamationCircleOutlined';
import SiderLayout from '@/components/layouts/SiderLayout';
import PageLayout from '@/components/layouts/PageLayout';
import { getCompactTime } from '@/utils/time';
import {
  BlueprintData,
  useBlueprintsQuery,
  useCreateBlueprintMutation,
  useDeleteBlueprintMutation,
} from '@/apollo/client/graphql/blueprints.generated';

const { Text, Paragraph } = Typography;
const { TextArea } = Input;

const DEFAULT_BLUEPRINT_YAML = `version: "0.1.0"
description: |
  My custom agent blueprint.

components:
  sandbox:
    image: "legible-sandbox:latest"
    name: "my-agent"
    forward_ports:
      - 9000
  inference:
    profiles:
      anthropic:
        provider_type: "anthropic"
        provider_name: "anthropic-inference"
        endpoint: "https://api.anthropic.com/v1"
        model: "claude-sonnet-4-20250514"
  mcp:
    servers:
      legible:
        transport: "streamable-http"
        url: "http://host.docker.internal:9000/mcp"

policies:
  network: "policies/legible-sandbox.yaml"
  filesystem:
    read_only:
      - /usr
      - /lib
    read_write:
      - /home/sandbox
      - /tmp
  process:
    deny_privilege_escalation: true

agent:
  type: "claude"
  allowed_types:
    - claude
    - codex
`;

export default function BlueprintsPage() {
  const { data, loading, refetch } = useBlueprintsQuery();
  const [createBlueprint, { loading: creating }] =
    useCreateBlueprintMutation();
  const [deleteBlueprint] = useDeleteBlueprintMutation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewYaml, setViewYaml] = useState<string | null>(null);
  const [form] = Form.useForm();

  const blueprints = useMemo(() => {
    return data?.blueprints || [];
  }, [data]);

  const columns: TableColumnsType<BlueprintData> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: BlueprintData) => (
        <Space>
          <Text strong>{name}</Text>
          {record.isBuiltin && <Tag color="blue">built-in</Tag>}
        </Space>
      ),
    },
    {
      title: 'Version',
      dataIndex: 'version',
      key: 'version',
      width: 100,
    },
    {
      title: 'Agent Type',
      dataIndex: 'defaultAgentType',
      key: 'defaultAgentType',
      width: 120,
      render: (type: string) => type || '-',
    },
    {
      title: 'Image',
      dataIndex: 'sandboxImage',
      key: 'sandboxImage',
      width: 200,
      render: (image: string) => (
        <Text code style={{ fontSize: 12 }}>
          {image || '-'}
        </Text>
      ),
    },
    {
      title: 'Profiles',
      dataIndex: 'inferenceProfiles',
      key: 'inferenceProfiles',
      width: 180,
      render: (profiles: Record<string, any> | null) => {
        if (!profiles) return '-';
        const names = Object.keys(profiles);
        return names.map((name) => (
          <Tag key={name} color="geekblue">
            {name}
          </Tag>
        ));
      },
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 140,
      render: (createdAt: string) => getCompactTime(createdAt),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 160,
      render: (_: any, record: BlueprintData) => (
        <Space>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => setViewYaml(record.blueprintYaml)}
          >
            View YAML
          </Button>
          {!record.isBuiltin && (
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(record)}
            />
          )}
        </Space>
      ),
    },
  ];

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      await createBlueprint({
        variables: {
          data: {
            name: values.name,
            blueprintYaml: values.blueprintYaml,
            version: values.version || '0.1.0',
            description: values.description,
            sandboxImage: values.sandboxImage,
            defaultAgentType: values.defaultAgentType,
          },
        },
      });
      message.success(`Blueprint "${values.name}" created`);
      form.resetFields();
      setIsModalOpen(false);
      refetch();
    } catch (err: any) {
      if (err?.message) {
        message.error(err.message);
      }
    }
  };

  const handleDelete = (record: BlueprintData) => {
    Modal.confirm({
      title: `Delete blueprint "${record.name}"?`,
      icon: <ExclamationCircleOutlined />,
      content:
        'Agents created from this blueprint will continue running, but no new agents can use it.',
      okText: 'Delete',
      okType: 'danger',
      onOk: async () => {
        await deleteBlueprint({
          variables: { where: { id: record.id } },
        });
        message.success(`Blueprint "${record.name}" deleted`);
        refetch();
      },
    });
  };

  return (
    <SiderLayout>
      <PageLayout
        title={
          <Space>
            <BlockOutlined style={{ fontSize: 20 }} />
            Blueprints
          </Space>
        }
        description="NemoClaw-compatible agent blueprints define sandbox images, inference profiles, network policies, and agent configuration."
        titleExtra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setIsModalOpen(true)}
          >
            Create Blueprint
          </Button>
        }
      >
        <Table
          dataSource={blueprints}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={blueprints.length > 20 ? { pageSize: 20 } : false}
          expandable={{
            expandedRowRender: (record) => (
              <Paragraph style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
                {record.description || 'No description'}
              </Paragraph>
            ),
          }}
          locale={{
            emptyText:
              'No blueprints yet. Click "Create Blueprint" to define your first agent template.',
          }}
        />
      </PageLayout>

      <Modal
        title="Create Blueprint"
        open={isModalOpen}
        onOk={handleCreate}
        onCancel={() => {
          form.resetFields();
          setIsModalOpen(false);
        }}
        confirmLoading={creating}
        width={700}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="Blueprint Name"
            rules={[{ required: true, message: 'Name is required' }]}
          >
            <Input placeholder="e.g., my-analyst-blueprint" />
          </Form.Item>
          <Form.Item name="version" label="Version" initialValue="0.1.0">
            <Input placeholder="0.1.0" />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input placeholder="Short description of this blueprint" />
          </Form.Item>
          <Form.Item name="sandboxImage" label="Sandbox Image">
            <Input placeholder="e.g., legible-sandbox:latest" />
          </Form.Item>
          <Form.Item name="defaultAgentType" label="Default Agent Type">
            <Input placeholder="e.g., claude, codex, opencode" />
          </Form.Item>
          <Form.Item
            name="blueprintYaml"
            label="Blueprint YAML"
            rules={[{ required: true, message: 'Blueprint YAML is required' }]}
            initialValue={DEFAULT_BLUEPRINT_YAML}
          >
            <TextArea
              rows={16}
              style={{ fontFamily: 'monospace', fontSize: 12 }}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Blueprint YAML"
        open={!!viewYaml}
        onCancel={() => setViewYaml(null)}
        footer={null}
        width={700}
      >
        <pre
          style={{
            background: '#f5f5f5',
            padding: 16,
            borderRadius: 4,
            maxHeight: 500,
            overflow: 'auto',
            fontSize: 12,
          }}
        >
          {viewYaml}
        </pre>
      </Modal>
    </SiderLayout>
  );
}
