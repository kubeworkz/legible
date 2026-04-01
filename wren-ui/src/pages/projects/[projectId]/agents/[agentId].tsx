import { useMemo } from 'react';
import { useRouter } from 'next/router';
import {
  Button,
  Card,
  Col,
  Descriptions,
  message,
  Modal,
  Row,
  Space,
  Spin,
  Table,
  TableColumnsType,
  Tabs,
  Tag,
  Typography,
} from 'antd';
import ArrowLeftOutlined from '@ant-design/icons/ArrowLeftOutlined';
import RobotOutlined from '@ant-design/icons/RobotOutlined';
import DeleteOutlined from '@ant-design/icons/DeleteOutlined';
import ExclamationCircleOutlined from '@ant-design/icons/ExclamationCircleOutlined';
import SiderLayout from '@/components/layouts/SiderLayout';
import PageLayout from '@/components/layouts/PageLayout';
import { Path, buildPath } from '@/utils/enum';
import { getCompactTime } from '@/utils/time';
import useProject from '@/hooks/useProject';
import {
  AgentFieldsFragment,
  AgentAuditLogFieldsFragment,
  useAgentQuery,
  useAgentLogsQuery,
  useUpdateAgentMutation,
  useDeleteAgentMutation,
} from '@/apollo/client/graphql/agents.generated';

const { Text, Paragraph } = Typography;

const STATUS_COLORS: Record<string, string> = {
  CREATING: 'blue',
  RUNNING: 'green',
  STOPPED: 'default',
  FAILED: 'red',
};

const LOG_ACTION_COLORS: Record<string, string> = {
  CREATED: 'blue',
  STARTED: 'green',
  STOPPED: 'orange',
  DELETED: 'red',
  UPDATED: 'default',
  FAILED: 'red',
};

// ── Overview Tab ────────────────────────────────────────────────

function OverviewTab({ agent }: { agent: AgentFieldsFragment }) {
  return (
    <Row gutter={[24, 24]}>
      <Col span={12}>
        <Descriptions column={1} size="small" bordered>
          <Descriptions.Item label="ID">{agent.id}</Descriptions.Item>
          <Descriptions.Item label="Name">
            <Text strong>{agent.name}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Sandbox">
            <Text code>{agent.sandboxName}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Status">
            <Tag color={STATUS_COLORS[agent.status] || 'default'}>
              {agent.status}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Provider">
            {agent.providerName || <Text type="secondary">—</Text>}
          </Descriptions.Item>
          <Descriptions.Item label="Image">
            {agent.image ? (
              <Text code>{agent.image}</Text>
            ) : (
              <Text type="secondary">—</Text>
            )}
          </Descriptions.Item>
        </Descriptions>
      </Col>
      <Col span={12}>
        <Descriptions column={1} size="small" bordered>
          <Descriptions.Item label="Blueprint ID">
            {agent.blueprintId ?? <Text type="secondary">—</Text>}
          </Descriptions.Item>
          <Descriptions.Item label="Inference Profile">
            {agent.inferenceProfile || <Text type="secondary">—</Text>}
          </Descriptions.Item>
          <Descriptions.Item label="Created">
            {getCompactTime(agent.createdAt)}
          </Descriptions.Item>
          <Descriptions.Item label="Updated">
            {getCompactTime(agent.updatedAt)}
          </Descriptions.Item>
        </Descriptions>
        {agent.metadata && Object.keys(agent.metadata).length > 0 && (
          <Card size="small" title="Metadata" style={{ marginTop: 16 }}>
            <pre style={{ margin: 0, fontSize: 12, whiteSpace: 'pre-wrap' }}>
              {JSON.stringify(agent.metadata, null, 2)}
            </pre>
          </Card>
        )}
      </Col>
    </Row>
  );
}

// ── Logs Tab ────────────────────────────────────────────────────

function LogsTab({ agentId }: { agentId: number }) {
  const { data, loading } = useAgentLogsQuery({
    variables: { where: { id: agentId }, limit: 100 },
    fetchPolicy: 'cache-and-network',
  });

  const logs = useMemo(() => data?.agentLogs || [], [data]);

  const columns: TableColumnsType<AgentAuditLogFieldsFragment> = [
    {
      title: 'Action',
      dataIndex: 'action',
      key: 'action',
      width: 120,
      render: (action: string) => (
        <Tag color={LOG_ACTION_COLORS[action] || 'default'}>{action}</Tag>
      ),
    },
    {
      title: 'Detail',
      dataIndex: 'detail',
      key: 'detail',
      render: (detail: string | null) =>
        detail || <Text type="secondary">—</Text>,
    },
    {
      title: 'Time',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (ts: string) => getCompactTime(ts),
    },
  ];

  return (
    <Table
      dataSource={logs}
      columns={columns}
      rowKey="id"
      loading={loading}
      pagination={logs.length > 50 ? { pageSize: 50 } : false}
      locale={{ emptyText: 'No audit log entries yet.' }}
      size="small"
    />
  );
}

// ── Policy Tab ──────────────────────────────────────────────────

function PolicyTab({ agent }: { agent: AgentFieldsFragment }) {
  if (!agent.policyYaml) {
    return (
      <Paragraph type="secondary">
        No network policy YAML is set for this agent.
      </Paragraph>
    );
  }

  return (
    <Card size="small">
      <pre
        style={{
          margin: 0,
          fontSize: 12,
          lineHeight: 1.6,
          whiteSpace: 'pre-wrap',
          fontFamily: "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace",
        }}
      >
        {agent.policyYaml}
      </pre>
    </Card>
  );
}

// ── Page ────────────────────────────────────────────────────────

export default function AgentDetailPage() {
  const router = useRouter();
  const { currentProjectId } = useProject();
  const agentId = Number(router.query.agentId);

  const { data, loading } = useAgentQuery({
    variables: { where: { id: agentId } },
    skip: !agentId,
    fetchPolicy: 'cache-and-network',
    pollInterval: 10000,
  });

  const [updateAgent] = useUpdateAgentMutation({
    refetchQueries: ['Agent', 'AgentLogs'],
    awaitRefetchQueries: true,
  });

  const [deleteAgent] = useDeleteAgentMutation({
    refetchQueries: ['Agents'],
    awaitRefetchQueries: true,
  });

  const agent = useMemo(() => data?.agent ?? null, [data]);

  const handleBack = () => {
    router.push(buildPath(Path.Agents, currentProjectId));
  };

  const handleStart = async () => {
    if (!agent) return;
    try {
      await updateAgent({
        variables: { where: { id: agent.id }, data: { status: 'RUNNING' } },
      });
      message.success('Agent started');
    } catch (err: any) {
      message.error(err?.message || 'Failed to start agent');
    }
  };

  const handleStop = async () => {
    if (!agent) return;
    try {
      await updateAgent({
        variables: { where: { id: agent.id }, data: { status: 'STOPPED' } },
      });
      message.success('Agent stopped');
    } catch (err: any) {
      message.error(err?.message || 'Failed to stop agent');
    }
  };

  const handleDelete = () => {
    if (!agent) return;
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
          handleBack();
        } catch (err: any) {
          message.error(err?.message || 'Failed to delete agent');
        }
      },
    });
  };

  if (loading && !agent) {
    return (
      <SiderLayout>
        <div style={{ textAlign: 'center', padding: 64 }}>
          <Spin size="large" />
        </div>
      </SiderLayout>
    );
  }

  if (!agent) {
    return (
      <SiderLayout>
        <PageLayout title="Agent not found">
          <Paragraph>
            The requested agent could not be found.
          </Paragraph>
          <Button onClick={handleBack}>Back to Agents</Button>
        </PageLayout>
      </SiderLayout>
    );
  }

  const tabItems = [
    {
      key: 'overview',
      label: 'Overview',
      children: <OverviewTab agent={agent} />,
    },
    {
      key: 'logs',
      label: 'Audit Logs',
      children: <LogsTab agentId={agent.id} />,
    },
    {
      key: 'policy',
      label: 'Network Policy',
      children: <PolicyTab agent={agent} />,
    },
  ];

  return (
    <SiderLayout>
      <PageLayout
        title={
          <Space>
            <Button
              type="text"
              size="small"
              icon={<ArrowLeftOutlined />}
              onClick={handleBack}
            />
            <RobotOutlined style={{ fontSize: 20 }} />
            {agent.name}
            <Tag color={STATUS_COLORS[agent.status] || 'default'}>
              {agent.status}
            </Tag>
          </Space>
        }
        titleExtra={
          <Space>
            {agent.status === 'STOPPED' && (
              <Button onClick={handleStart}>Start</Button>
            )}
            {agent.status === 'RUNNING' && (
              <Button onClick={handleStop}>Stop</Button>
            )}
            <Button
              danger
              icon={<DeleteOutlined />}
              onClick={handleDelete}
            >
              Delete
            </Button>
          </Space>
        }
      >
        <Tabs items={tabItems} defaultActiveKey="overview" />
      </PageLayout>
    </SiderLayout>
  );
}
