import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import {
  Button,
  Col,
  Input,
  Row,
  Select,
  Tag,
  Table,
  TableColumnsType,
  Typography,
  Modal,
  Space,
  message,
} from 'antd';
import RobotOutlined from '@ant-design/icons/RobotOutlined';
import PlusOutlined from '@ant-design/icons/PlusOutlined';
import DeleteOutlined from '@ant-design/icons/DeleteOutlined';
import ThunderboltOutlined from '@ant-design/icons/ThunderboltOutlined';
import ExclamationCircleOutlined from '@ant-design/icons/ExclamationCircleOutlined';
import SearchOutlined from '@ant-design/icons/SearchOutlined';
import PlayCircleOutlined from '@ant-design/icons/PlayCircleOutlined';
import PauseCircleOutlined from '@ant-design/icons/PauseCircleOutlined';
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
import CreateAgentWizard, {
  CreateAgentWizardValues,
} from '@/components/pages/agents/CreateAgentWizard';
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
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [blueprintFilter, setBlueprintFilter] = useState<number | undefined>();
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);
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

  const [createAgent, { loading: creating }] =
    useCreateAgentMutation(refetchOptions);
  const [deleteAgent] = useDeleteAgentMutation(refetchOptions);
  const [updateAgent] = useUpdateAgentMutation(refetchOptions);

  const agents = useMemo(() => data?.agents || [], [data]);

  const filteredAgents = useMemo(() => {
    let result = agents;
    if (searchText) {
      const q = searchText.toLowerCase();
      result = result.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.sandboxName.toLowerCase().includes(q),
      );
    }
    if (statusFilter) {
      result = result.filter((a) => a.status === statusFilter);
    }
    if (blueprintFilter) {
      result = result.filter((a) => a.blueprintId === blueprintFilter);
    }
    return result;
  }, [agents, searchText, statusFilter, blueprintFilter]);

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

  const handleCreate = async (values: CreateAgentWizardValues) => {
    try {
      await createAgent({
        variables: {
          data: {
            name: values.name,
            sandboxName: values.sandboxName,
            image: values.image,
            blueprintId: values.blueprintId,
            inferenceProfile: values.inferenceProfile,
            policyYaml: values.policyYaml,
          },
        },
      });
      message.success(`Agent "${values.name}" created`);
      setIsWizardOpen(false);
    } catch (err: any) {
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

  // ── Bulk operations ──────────────────────────────────
  const selectedAgents = useMemo(
    () => agents.filter((a) => selectedRowKeys.includes(a.id)),
    [agents, selectedRowKeys],
  );

  const handleBulkStart = useCallback(async () => {
    const eligible = selectedAgents.filter((a) => a.status === 'STOPPED');
    if (!eligible.length) {
      message.warning('No stopped agents selected');
      return;
    }
    setBulkLoading(true);
    try {
      await Promise.all(
        eligible.map((a) =>
          updateAgent({
            variables: { where: { id: a.id }, data: { status: 'RUNNING' } },
          }),
        ),
      );
      message.success(`Started ${eligible.length} agent(s)`);
      setSelectedRowKeys([]);
    } catch (err: any) {
      message.error(err?.message || 'Failed to start some agents');
    } finally {
      setBulkLoading(false);
    }
  }, [selectedAgents, updateAgent]);

  const handleBulkStop = useCallback(async () => {
    const eligible = selectedAgents.filter((a) => a.status === 'RUNNING');
    if (!eligible.length) {
      message.warning('No running agents selected');
      return;
    }
    setBulkLoading(true);
    try {
      await Promise.all(
        eligible.map((a) =>
          updateAgent({
            variables: { where: { id: a.id }, data: { status: 'STOPPED' } },
          }),
        ),
      );
      message.success(`Stopped ${eligible.length} agent(s)`);
      setSelectedRowKeys([]);
    } catch (err: any) {
      message.error(err?.message || 'Failed to stop some agents');
    } finally {
      setBulkLoading(false);
    }
  }, [selectedAgents, updateAgent]);

  const handleBulkDelete = useCallback(() => {
    if (!selectedAgents.length) return;
    Modal.confirm({
      title: `Delete ${selectedAgents.length} agent(s)?`,
      icon: <ExclamationCircleOutlined />,
      content:
        'This will destroy the sandboxes and remove all associated data for the selected agents.',
      okText: 'Delete All',
      okButtonProps: { danger: true },
      onOk: async () => {
        setBulkLoading(true);
        try {
          await Promise.all(
            selectedAgents.map((a) =>
              deleteAgent({ variables: { where: { id: a.id } } }),
            ),
          );
          message.success(`Deleted ${selectedAgents.length} agent(s)`);
          setSelectedRowKeys([]);
        } catch (err: any) {
          message.error(err?.message || 'Failed to delete some agents');
        } finally {
          setBulkLoading(false);
        }
      },
    });
  }, [selectedAgents, deleteAgent]);

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
              onClick={() => setIsWizardOpen(true)}
            >
              Create Agent
            </Button>
          </Space>
        }
      >
        <GatewayStatusBar />
        <Row gutter={12} style={{ marginBottom: 16 }}>
          <Col flex="auto">
            <Input
              placeholder="Search by name or sandbox…"
              prefix={<SearchOutlined />}
              allowClear
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </Col>
          <Col>
            <Select
              placeholder="Status"
              allowClear
              style={{ width: 140 }}
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { label: 'Creating', value: 'CREATING' },
                { label: 'Running', value: 'RUNNING' },
                { label: 'Stopped', value: 'STOPPED' },
                { label: 'Failed', value: 'FAILED' },
              ]}
            />
          </Col>
          <Col>
            <Select
              placeholder="Blueprint"
              allowClear
              style={{ width: 180 }}
              value={blueprintFilter}
              onChange={setBlueprintFilter}
              options={blueprints.map((bp) => ({
                label: bp.name,
                value: bp.id,
              }))}
            />
          </Col>
        </Row>
        {selectedRowKeys.length > 0 && (
          <Row
            align="middle"
            style={{
              marginBottom: 12,
              padding: '8px 12px',
              background: '#e6f4ff',
              borderRadius: 6,
            }}
          >
            <Col flex="auto">
              <Text strong>{selectedRowKeys.length} agent(s) selected</Text>
            </Col>
            <Col>
              <Space>
                <Button
                  size="small"
                  icon={<PlayCircleOutlined />}
                  loading={bulkLoading}
                  onClick={handleBulkStart}
                >
                  Start
                </Button>
                <Button
                  size="small"
                  icon={<PauseCircleOutlined />}
                  loading={bulkLoading}
                  onClick={handleBulkStop}
                >
                  Stop
                </Button>
                <Button
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  loading={bulkLoading}
                  onClick={handleBulkDelete}
                >
                  Delete
                </Button>
                <Button
                  size="small"
                  type="link"
                  onClick={() => setSelectedRowKeys([])}
                >
                  Clear
                </Button>
              </Space>
            </Col>
          </Row>
        )}
        <Table
          dataSource={filteredAgents}
          columns={columns}
          rowKey="id"
          loading={loading}
          rowSelection={{
            selectedRowKeys,
            onChange: setSelectedRowKeys,
          }}
          pagination={filteredAgents.length > 20 ? { pageSize: 20 } : false}
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

      <CreateAgentWizard
        open={isWizardOpen}
        loading={creating}
        blueprints={blueprints}
        onCancel={() => setIsWizardOpen(false)}
        onCreate={handleCreate}
      />
    </SiderLayout>
  );
}
