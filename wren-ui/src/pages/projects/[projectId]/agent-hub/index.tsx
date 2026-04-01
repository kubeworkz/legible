import { useMemo } from 'react';
import { useRouter } from 'next/router';
import {
  Card,
  Col,
  Progress,
  Row,
  Space,
  Statistic,
  Table,
  TableColumnsType,
  Tag,
  Typography,
} from 'antd';
import styled from 'styled-components';
import DashboardOutlined from '@ant-design/icons/DashboardOutlined';
import RobotOutlined from '@ant-design/icons/RobotOutlined';
import BlockOutlined from '@ant-design/icons/BlockOutlined';
import CloudServerOutlined from '@ant-design/icons/CloudServerOutlined';
import CheckCircleOutlined from '@ant-design/icons/CheckCircleOutlined';
import CloseCircleOutlined from '@ant-design/icons/CloseCircleOutlined';
import LoadingOutlined from '@ant-design/icons/LoadingOutlined';
import HistoryOutlined from '@ant-design/icons/HistoryOutlined';
import SiderLayout from '@/components/layouts/SiderLayout';
import PageLayout from '@/components/layouts/PageLayout';
import { Path, buildPath } from '@/utils/enum';
import { getCompactTime } from '@/utils/time';
import useProject from '@/hooks/useProject';
import useOrganization from '@/hooks/useOrganization';
import ActivityFeed from '@/components/pages/agents/ActivityFeed';
import {
  AgentFieldsFragment,
  useAgentsQuery,
} from '@/apollo/client/graphql/agents.generated';
import { useBlueprintsQuery } from '@/apollo/client/graphql/blueprints.generated';
import { useGatewayForOrgQuery } from '@/apollo/client/graphql/gateways.generated';

const { Text } = Typography;

const StatCard = styled(Card)`
  .ant-statistic-title {
    font-size: 13px;
    color: rgba(0, 0, 0, 0.45);
  }
  .ant-statistic-content {
    font-size: 28px;
  }
`;

const STATUS_COLORS: Record<string, string> = {
  CREATING: 'blue',
  RUNNING: 'green',
  STOPPED: 'default',
  FAILED: 'red',
};

const GATEWAY_STATUS_ICON: Record<string, React.ReactNode> = {
  RUNNING: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
  STARTING: <LoadingOutlined style={{ color: '#1890ff' }} />,
  STOPPED: <CloseCircleOutlined style={{ color: '#8c8c8c' }} />,
  FAILED: <CloseCircleOutlined style={{ color: '#ff4d4f' }} />,
};

export default function AgentHubPage() {
  const router = useRouter();
  const { currentProjectId } = useProject();
  const { currentOrgId } = useOrganization();

  const { data: agentsData, loading: agentsLoading } = useAgentsQuery({
    fetchPolicy: 'cache-and-network',
  });
  const { data: blueprintsData } = useBlueprintsQuery();
  const { data: gatewayData } = useGatewayForOrgQuery({
    variables: { organizationId: currentOrgId! },
    skip: !currentOrgId,
    fetchPolicy: 'cache-and-network',
    pollInterval: 15000,
  });

  const agents = useMemo(() => agentsData?.agents || [], [agentsData]);
  const blueprints = useMemo(
    () => blueprintsData?.blueprints || [],
    [blueprintsData],
  );
  const gateway = useMemo(
    () => gatewayData?.gatewayForOrganization ?? null,
    [gatewayData],
  );

  const running = agents.filter((a) => a.status === 'RUNNING').length;
  const stopped = agents.filter((a) => a.status === 'STOPPED').length;
  const failed = agents.filter((a) => a.status === 'FAILED').length;
  const creating = agents.filter((a) => a.status === 'CREATING').length;

  const bp = (path: Path) => buildPath(path, currentProjectId);

  // Recent agents (sorted by updatedAt descending, top 10)
  const recentAgents = useMemo(
    () =>
      [...agents]
        .sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() -
            new Date(a.updatedAt).getTime(),
        )
        .slice(0, 10),
    [agents],
  );

  const columns: TableColumnsType<AgentFieldsFragment> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => (
        <Text strong style={{ color: '#1890ff' }}>
          {name}
        </Text>
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
        <Tag color={STATUS_COLORS[status] || 'default'}>{status}</Tag>
      ),
    },
    {
      title: 'Blueprint',
      dataIndex: 'blueprintId',
      key: 'blueprintId',
      render: (id: number | null) => {
        if (!id) return <Text type="secondary">—</Text>;
        const bp = blueprints.find((b) => b.id === id);
        return bp ? <Tag color="geekblue">{bp.name}</Tag> : `#${id}`;
      },
    },
    {
      title: 'Updated',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 160,
      render: (ts: string) => getCompactTime(ts),
    },
  ];

  // Gateway sandbox usage
  const sandboxPercent = gateway?.maxSandboxes
    ? Math.round(
        (gateway.sandboxCount / gateway.maxSandboxes) * 100,
      )
    : 0;
  const sandboxColor =
    sandboxPercent >= 90
      ? '#ff4d4f'
      : sandboxPercent >= 70
        ? '#faad14'
        : '#52c41a';

  return (
    <SiderLayout>
      <PageLayout
        title={
          <Space>
            <DashboardOutlined style={{ fontSize: 20 }} />
            Agent Hub
          </Space>
        }
        description="Overview of agents, blueprints, and gateway status for your organization."
      >
        {/* ── Stats Row ──────────────────────────────────── */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <StatCard hoverable onClick={() => router.push(bp(Path.Agents))}>
              <Statistic
                title="Total Agents"
                value={agents.length}
                prefix={<RobotOutlined />}
                loading={agentsLoading}
              />
            </StatCard>
          </Col>
          <Col span={6}>
            <StatCard>
              <Statistic
                title="Running"
                value={running}
                valueStyle={{ color: '#52c41a' }}
                suffix={
                  <Text type="secondary" style={{ fontSize: 14 }}>
                    {creating > 0 && ` · ${creating} creating`}
                    {stopped > 0 && ` · ${stopped} stopped`}
                    {failed > 0 && ` · ${failed} failed`}
                  </Text>
                }
              />
            </StatCard>
          </Col>
          <Col span={6}>
            <StatCard
              hoverable
              onClick={() => router.push(bp(Path.Blueprints))}
            >
              <Statistic
                title="Blueprints"
                value={blueprints.length}
                prefix={<BlockOutlined />}
              />
            </StatCard>
          </Col>
          <Col span={6}>
            <StatCard
              hoverable
              onClick={() => router.push(bp(Path.Gateways))}
            >
              <Statistic
                title="Gateway"
                value={gateway ? gateway.status : 'None'}
                prefix={
                  gateway ? (
                    GATEWAY_STATUS_ICON[gateway.status] || (
                      <CloudServerOutlined />
                    )
                  ) : (
                    <CloudServerOutlined
                      style={{ color: 'rgba(0,0,0,0.25)' }}
                    />
                  )
                }
                valueStyle={{
                  fontSize: gateway ? 20 : 16,
                  color: gateway
                    ? undefined
                    : 'rgba(0,0,0,0.25)',
                }}
              />
            </StatCard>
          </Col>
        </Row>

        {/* ── Gateway Sandbox Usage ──────────────────────── */}
        {gateway && (
          <Card
            size="small"
            style={{ marginBottom: 24 }}
            title={
              <Space>
                <CloudServerOutlined />
                Gateway Sandbox Usage
              </Space>
            }
            extra={
              <Text>
                {gateway.cpus} CPU · {gateway.memory} RAM
                {gateway.version && ` · v${gateway.version}`}
              </Text>
            }
          >
            <Row align="middle" gutter={16}>
              <Col flex="auto">
                <Progress
                  percent={sandboxPercent}
                  strokeColor={sandboxColor}
                  format={() =>
                    `${gateway.sandboxCount} / ${gateway.maxSandboxes}`
                  }
                />
              </Col>
            </Row>
          </Card>
        )}

        {/* ── Recent Agents ─────────────────────────────── */}
        <Card
          title="Recent Agents"
          size="small"
          extra={
            <a onClick={() => router.push(bp(Path.Agents))}>
              View all →
            </a>
          }
        >
          <Table
            dataSource={recentAgents}
            columns={columns}
            rowKey="id"
            loading={agentsLoading}
            pagination={false}
            size="small"
            locale={{ emptyText: 'No agents yet.' }}
            onRow={(record) => ({
              onClick: () => {
                const base = buildPath(Path.Agents, currentProjectId);
                router.push(`${base}/${record.id}`);
              },
              style: { cursor: 'pointer' },
            })}
          />
        </Card>

        {/* ── Activity Feed ─────────────────────────────── */}
        <Card
          title={
            <Space>
              <HistoryOutlined />
              Activity Feed
            </Space>
          }
          size="small"
          style={{ marginTop: 24 }}
        >
          <ActivityFeed agents={agents} limit={30} />
        </Card>
      </PageLayout>
    </SiderLayout>
  );
}
