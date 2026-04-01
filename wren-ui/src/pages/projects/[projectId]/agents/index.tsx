import { useMemo, useState } from 'react';
import { useRouter } from 'next/router';
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
  Select,
  message,
} from 'antd';
import RobotOutlined from '@ant-design/icons/RobotOutlined';
import PlusOutlined from '@ant-design/icons/PlusOutlined';
import DeleteOutlined from '@ant-design/icons/DeleteOutlined';
import ThunderboltOutlined from '@ant-design/icons/ThunderboltOutlined';
import ExclamationCircleOutlined from '@ant-design/icons/ExclamationCircleOutlined';
import SiderLayout from '@/components/layouts/SiderLayout';
import PageLayout from '@/components/layouts/PageLayout';
import { getCompactTime } from '@/utils/time';
import {
  AgentFieldsFragment,
  useAgentsQuery,
  useCreateAgentMutation,
  useDeleteAgentMutation,
  useUpdateAgentMutation,
} from '@/apollo/client/graphql/agents.generated';
import { useBlueprintsQuery } from '@/apollo/client/graphql/blueprints.generated';
import { useProvisionAgentMutation } from '@/apollo/client/graphql/registry.generated';
import useProject from '@/hooks/useProject';
import GatewayStatusBar from '@/components/pages/agents/GatewayStatusBar';
import { Path, buildPath } from '@/utils/enum';

const { Text } = Typography;

const STATUS_COLORS: Record<string, string> = {
  CREATING: 'blue',
  RUNNING: 'green',
  STOPPED: 'default',
  FAILED: 'red',
};

const refetchOptions = {
  refetchQueries: ['Agents'],
  awaitRefetchQueries: true,
};

export default function AgentsPage() {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBlueprintId, setSelectedBlueprintId] = useState<
    number | undefined
  >();
  const [form] = Form.useForm();
  const { currentProject } = useProject();
  const connectorType = currentProject?.type || '';

  const { data, loading } = useAgentsQuery({
    fetchPolicy: 'cache-and-network',
  });

  const { data: blueprintData } = useBlueprintsQuery();
  const blueprints = useMemo(
    () => blueprintData?.blueprints || [],
    [blueprintData],
  );

  const [provisionAgent, { loading: provisioning }] =
    useProvisionAgentMutation();

  const selectedBlueprint = useMemo(
    () => blueprints.find((bp) => bp.id === selectedBlueprintId),
    [blueprints, selectedBlueprintId],
  );

  const inferenceProfileOptions = useMemo(() => {
    if (!selectedBlueprint?.inferenceProfiles) return [];
    return Object.keys(selectedBlueprint.inferenceProfiles).map((name) => ({
      label: name,
      value: name,
    }));
  }, [selectedBlueprint]);

  const [createAgent, { loading: creating }] =
    useCreateAgentMutation(refetchOptions);
  const [deleteAgent] = useDeleteAgentMutation(refetchOptions);
  const [updateAgent] = useUpdateAgentMutation(refetchOptions);

  const agents = useMemo(() => data?.agents || [], [data]);

  const columns: TableColumnsType<AgentFieldsFragment> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => (
        <Text strong style={{ color: '#1890ff' }}>{name}</Text>
      ),
    },
    {
      title: 'Sandbox',
      dataIndex: 'sandboxName',
      key: 'sandboxName',
      render: (name: string) => <Text code>{name}</Text>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => (
        <Tag color={STATUS_COLORS[status] || 'default'}>
          {status}
        </Tag>
      ),
    },
    {
      title: 'Image',
      dataIndex: 'image',
      key: 'image',
      ellipsis: true,
      render: (image: string | null) => image || '-',
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (ts: string) => getCompactTime(ts),
    },
    {
      title: '',
      key: 'actions',
      width: 100,
      render: (_: any, record: AgentFieldsFragment) => (
        <Space onClick={(e) => e.stopPropagation()}>
          {record.status === 'STOPPED' && (
            <Button
              size="small"
              onClick={() => handleStart(record.id)}
            >
              Start
            </Button>
          )}
          {record.status === 'RUNNING' && (
            <Button
              size="small"
              onClick={() => handleStop(record.id)}
            >
              Stop
            </Button>
          )}
          <Button
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record)}
          />
        </Space>
      ),
    },
  ];

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      await createAgent({
        variables: {
          data: {
            name: values.name,
            sandboxName: values.sandboxName,
            image: values.image || undefined,
            blueprintId: values.blueprintId || undefined,
            inferenceProfile: values.inferenceProfile || undefined,
          },
        },
      });
      message.success(`Agent "${values.name}" created`);
      form.resetFields();
      setIsModalOpen(false);
    } catch (err: any) {
      if (err?.errorFields) return; // validation error
      message.error(err?.message || 'Failed to create agent');
    }
  };

  const handleStart = async (id: number) => {
    try {
      await updateAgent({
        variables: { where: { id }, data: { status: 'RUNNING' } },
      });
      message.success('Agent started');
    } catch (err: any) {
      message.error(err?.message || 'Failed to start agent');
    }
  };

  const handleStop = async (id: number) => {
    try {
      await updateAgent({
        variables: { where: { id }, data: { status: 'STOPPED' } },
      });
      message.success('Agent stopped');
    } catch (err: any) {
      message.error(err?.message || 'Failed to stop agent');
    }
  };

  const handleDelete = (agent: AgentFieldsFragment) => {
    Modal.confirm({
      title: `Delete agent "${agent.name}"?`,
      icon: <ExclamationCircleOutlined />,
      content: `This will destroy the sandbox "${agent.sandboxName}" and remove all associated data.`,
      okText: 'Delete',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await deleteAgent({
            variables: { where: { id: agent.id } },
          });
          message.success(`Agent "${agent.name}" deleted`);
        } catch (err: any) {
          message.error(err?.message || 'Failed to delete agent');
        }
      },
    });
  };

  const handleAutoProvision = async () => {
    if (!connectorType) {
      message.warning('No data source connected to this project');
      return;
    }
    try {
      const result = await provisionAgent({
        variables: { connectorType },
        refetchQueries: ['Agents'],
        awaitRefetchQueries: true,
      });
      const { agentName, blueprintName } = result.data?.provisionAgent || {};
      message.success(
        `Agent "${agentName}" auto-provisioned with blueprint "${blueprintName}"`,
      );
    } catch (err: any) {
      message.error(err?.message || 'Failed to auto-provision agent');
    }
  };

  return (
    <SiderLayout>
      <PageLayout
        title={
          <Space>
            <RobotOutlined style={{ fontSize: 20 }} />
            Agents
          </Space>
        }
        description="Create and manage sandboxed AI agents that connect to your semantic layer via MCP."
        titleExtra={
          <Space>
            {connectorType && (
              <Button
                icon={<ThunderboltOutlined />}
                loading={provisioning}
                onClick={handleAutoProvision}
              >
                Auto-Provision for {connectorType}
              </Button>
            )}
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setIsModalOpen(true)}
            >
              Create Agent
            </Button>
          </Space>
        }
      >
        <GatewayStatusBar />
        <Table
          dataSource={agents}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={agents.length > 20 ? { pageSize: 20 } : false}
          locale={{ emptyText: 'No agents yet. Click "Create Agent" to get started.' }}
          onRow={(record) => ({
            onClick: () => {
              const base = buildPath(Path.Agents, currentProject?.id || '');
              router.push(`${base}/${record.id}`);
            },
            style: { cursor: 'pointer' },
          })}
        />
      </PageLayout>

      <Modal
        title="Create Agent"
        open={isModalOpen}
        onOk={handleCreate}
        onCancel={() => {
          form.resetFields();
          setIsModalOpen(false);
        }}
        confirmLoading={creating}
        okText="Create"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="Name"
            name="name"
            rules={[{ required: true, message: 'Agent name is required' }]}
          >
            <Input placeholder="e.g. analytics-agent" />
          </Form.Item>
          <Form.Item
            label="Sandbox Name"
            name="sandboxName"
            rules={[
              { required: true, message: 'Sandbox name is required' },
              {
                pattern: /^[a-z0-9][a-z0-9-]*[a-z0-9]$/,
                message: 'Lowercase alphanumeric and hyphens only',
              },
            ]}
          >
            <Input placeholder="e.g. analytics-sandbox-1" />
          </Form.Item>
          <Form.Item label="Blueprint (optional)" name="blueprintId">
            <Select
              allowClear
              placeholder="Select a blueprint template"
              onChange={(value) => {
                setSelectedBlueprintId(value);
                form.setFieldValue('inferenceProfile', undefined);
              }}
              options={blueprints.map((bp) => ({
                label: `${bp.name} (v${bp.version})`,
                value: bp.id,
              }))}
            />
          </Form.Item>
          {inferenceProfileOptions.length > 0 && (
            <Form.Item label="Inference Profile" name="inferenceProfile">
              <Select
                allowClear
                placeholder="Select inference profile"
                options={inferenceProfileOptions}
              />
            </Form.Item>
          )}
          <Form.Item label="Image (optional)" name="image">
            <Input placeholder="e.g. legible-sandbox:latest" />
          </Form.Item>
        </Form>
      </Modal>
    </SiderLayout>
  );
}
