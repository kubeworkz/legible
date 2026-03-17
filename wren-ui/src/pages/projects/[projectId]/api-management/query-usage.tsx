import { useState, useMemo } from 'react';
import {
  Table,
  TableColumnsType,
  Card,
  Row,
  Col,
  Tag,
  Typography,
  Spin,
  Empty,
  Progress,
  DatePicker,
  Space,
  Segmented,
} from 'antd';
import styled from 'styled-components';
import SiderLayout from '@/components/layouts/SiderLayout';
import PageLayout from '@/components/layouts/PageLayout';
import DatabaseOutlined from '@ant-design/icons/DatabaseOutlined';
import ThunderboltOutlined from '@ant-design/icons/ThunderboltOutlined';
import CheckCircleOutlined from '@ant-design/icons/CheckCircleOutlined';
import DollarOutlined from '@ant-design/icons/DollarOutlined';
import { useQuery } from '@apollo/client';
import {
  QUERY_USAGE_OVERVIEW,
  QUERY_USAGE_STATS,
} from '@/apollo/client/graphql/queryUsage';
import type {
  QueryUsageOverview,
  QueryUsageStats,
  QueryUsageBySource,
  QueryUsageByProject,
  QueryDailyUsage,
} from '@/apollo/client/graphql/__types__';
import dayjs from 'dayjs';

const { Text } = Typography;
const { RangePicker } = DatePicker;

// ── Styled Components ─────────────────────────────────

const StatTitle = styled.div`
  color: rgba(0, 0, 0, 0.45);
  font-size: 14px;
  margin-bottom: 4px;
`;

const StatValue = styled.div<{ $color?: string }>`
  font-size: 24px;
  font-weight: 600;
  color: ${({ $color }) => $color || 'rgba(0, 0, 0, 0.85)'};
  display: flex;
  align-items: baseline;
  gap: 6px;
`;

const FreeTierBar = styled.div`
  margin-top: 16px;
  margin-bottom: 24px;
  padding: 16px 24px;
  background: #fafafa;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
`;

const SectionTitle = styled.h3`
  font-size: 16px;
  font-weight: 600;
  margin: 24px 0 12px;
`;

// ── Helpers ───────────────────────────────────────────

const FREE_TIER_LIMIT = 25;

function formatCost(cost: number): string {
  return `$${cost.toFixed(2)}`;
}

function formatSource(source: string): string {
  return source
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ── Source Table Columns ──────────────────────────────

const sourceColumns: TableColumnsType<QueryUsageBySource> = [
  {
    title: 'Source',
    dataIndex: 'source',
    key: 'source',
    render: (val: string) => <Tag color="blue">{formatSource(val)}</Tag>,
  },
  {
    title: 'Queries',
    dataIndex: 'totalQueries',
    key: 'totalQueries',
    align: 'right',
    sorter: (a, b) => a.totalQueries - b.totalQueries,
    render: (val: number) => val.toLocaleString(),
  },
  {
    title: 'Cost',
    dataIndex: 'totalCost',
    key: 'totalCost',
    align: 'right',
    sorter: (a, b) => a.totalCost - b.totalCost,
    render: (val: number) => formatCost(val),
  },
];

// ── Project Table Columns ─────────────────────────────

const projectColumns: TableColumnsType<QueryUsageByProject> = [
  {
    title: 'Project ID',
    dataIndex: 'projectId',
    key: 'projectId',
  },
  {
    title: 'Queries',
    dataIndex: 'totalQueries',
    key: 'totalQueries',
    align: 'right',
    sorter: (a, b) => a.totalQueries - b.totalQueries,
    render: (val: number) => val.toLocaleString(),
  },
  {
    title: 'Cost',
    dataIndex: 'totalCost',
    key: 'totalCost',
    align: 'right',
    sorter: (a, b) => a.totalCost - b.totalCost,
    render: (val: number) => formatCost(val),
  },
];

// ── Daily Usage Table Columns ─────────────────────────

const dailyColumns: TableColumnsType<QueryDailyUsage> = [
  {
    title: 'Date',
    dataIndex: 'date',
    key: 'date',
    sorter: (a, b) => a.date.localeCompare(b.date),
  },
  {
    title: 'Queries',
    dataIndex: 'totalQueries',
    key: 'totalQueries',
    align: 'right',
    sorter: (a, b) => a.totalQueries - b.totalQueries,
    render: (val: number) => val.toLocaleString(),
  },
  {
    title: 'Cost',
    dataIndex: 'totalCost',
    key: 'totalCost',
    align: 'right',
    sorter: (a, b) => a.totalCost - b.totalCost,
    render: (val: number) => formatCost(val),
  },
];

// ── Page Component ────────────────────────────────────

export default function QueryUsagePage() {
  const [dateRange, setDateRange] = useState<
    [dayjs.Dayjs | null, dayjs.Dayjs | null] | null
  >(null);
  const [sourceFilter, setSourceFilter] = useState<string>('all');

  const filter = useMemo(() => {
    const f: Record<string, string | undefined> = {};
    if (dateRange && dateRange[0] && dateRange[1]) {
      f.startDate = dateRange[0].format('YYYY-MM-DD');
      f.endDate = dateRange[1].format('YYYY-MM-DD');
    }
    if (sourceFilter === 'mcp') {
      f.sourcePrefix = 'mcp_';
    }
    return Object.keys(f).length > 0 ? f : undefined;
  }, [dateRange, sourceFilter]);

  const {
    data: overviewData,
    loading: overviewLoading,
  } = useQuery<{ queryUsageOverview: QueryUsageOverview }>(
    QUERY_USAGE_OVERVIEW,
    { fetchPolicy: 'cache-and-network' }
  );

  const {
    data: statsData,
    loading: statsLoading,
  } = useQuery<{ queryUsageStats: QueryUsageStats }>(QUERY_USAGE_STATS, {
    variables: filter ? { filter } : {},
    fetchPolicy: 'cache-and-network',
  });

  const overview = overviewData?.queryUsageOverview;
  const stats = statsData?.queryUsageStats;

  const loading = overviewLoading || statsLoading;

  if (loading && !overview && !stats) {
    return (
      <SiderLayout>
        <PageLayout
          title="Query Usage"
          description={`Monitor your data query usage and costs. The first ${FREE_TIER_LIMIT.toLocaleString()} queries each month are free.`}
        >
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <Spin size="large" />
          </div>
        </PageLayout>
      </SiderLayout>
    );
  }

  const totalQueries = overview?.summary?.totalQueries ?? 0;
  const freeTierRemaining = overview?.freeTierRemaining ?? FREE_TIER_LIMIT;
  const isFreeTier = overview?.isFreeTier ?? true;
  const paidQueries = overview?.summary?.paidQueries ?? 0;
  const totalCost = overview?.summary?.totalCost ?? 0;
  const freeTierUsed = FREE_TIER_LIMIT - freeTierRemaining;
  const freeTierPercent = Math.round((freeTierUsed / FREE_TIER_LIMIT) * 100);

  return (
    <SiderLayout>
      <PageLayout
        title="Query Usage"
        description={`Monitor your data query usage and costs. The first ${FREE_TIER_LIMIT.toLocaleString()} queries each month are free.`}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* ── Stat Cards ─────────────────────────────── */}
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} lg={6}>
              <Card size="small">
                <StatTitle>Total Queries</StatTitle>
                <StatValue>
                  <ThunderboltOutlined
                    style={{ fontSize: 20, color: '#1890ff' }}
                  />
                  {totalQueries.toLocaleString()}
                </StatValue>
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card size="small">
                <StatTitle>Free Tier Remaining</StatTitle>
                <StatValue $color={freeTierRemaining > 0 ? '#52c41a' : '#ff4d4f'}>
                  <CheckCircleOutlined style={{ fontSize: 20 }} />
                  {freeTierRemaining.toLocaleString()}
                </StatValue>
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card size="small">
                <StatTitle>Paid Queries</StatTitle>
                <StatValue $color={paidQueries > 0 ? '#fa8c16' : undefined}>
                  {paidQueries.toLocaleString()}
                </StatValue>
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card size="small">
                <StatTitle>Total Cost</StatTitle>
                <StatValue $color={totalCost > 0 ? '#f5222d' : '#52c41a'}>
                  <DollarOutlined style={{ fontSize: 20 }} />
                  {formatCost(totalCost)}
                </StatValue>
              </Card>
            </Col>
          </Row>

          {/* ── Free Tier Progress ─────────────────────── */}
          <FreeTierBar>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: 8,
              }}
            >
              <Text strong>Free Tier Usage</Text>
              <Text type="secondary">
                {freeTierUsed.toLocaleString()} /{' '}
                {FREE_TIER_LIMIT.toLocaleString()} queries used
              </Text>
            </div>
            <Progress
              percent={freeTierPercent}
              status={freeTierPercent >= 100 ? 'exception' : 'active'}
              strokeColor={freeTierPercent >= 90 ? '#ff4d4f' : '#1890ff'}
              showInfo={false}
            />
            {isFreeTier ? (
              <Text
                type="secondary"
                style={{ fontSize: 12, marginTop: 4, display: 'block' }}
              >
                You are on the free tier. Queries beyond{' '}
                {FREE_TIER_LIMIT.toLocaleString()} are billed at $0.02 each.
              </Text>
            ) : (
              <Text
                type="warning"
                style={{ fontSize: 12, marginTop: 4, display: 'block' }}
              >
                Free tier exhausted. All additional queries are billed at $0.02
                each.
              </Text>
            )}
          </FreeTierBar>

          {/* ── Filters ─────────────────────────────── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <Text strong style={{ marginRight: 8 }}>
                Source:
              </Text>
              <Segmented
                value={sourceFilter}
                onChange={(val) => setSourceFilter(val as string)}
                options={[
                  { label: 'All Sources', value: 'all' },
                  { label: 'MCP Only', value: 'mcp' },
                ]}
              />
            </div>
            <div>
              <Text strong style={{ marginRight: 8 }}>
                Date range:
              </Text>
              <RangePicker
                value={dateRange}
                onChange={(dates) => setDateRange(dates)}
                allowClear
                style={{ width: 300 }}
              />
            </div>
          </div>

          {/* ── Usage by Source ─────────────────────────── */}
          <div>
            <SectionTitle>Usage by Source</SectionTitle>
            {stats?.bySource && stats.bySource.length > 0 ? (
              <Table
                dataSource={stats.bySource}
                columns={sourceColumns}
                rowKey="source"
                pagination={false}
                size="small"
              />
            ) : (
              <Empty
                description="No usage data available"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            )}
          </div>

          {/* ── Usage by Project ────────────────────────── */}
          {stats?.byProject && stats.byProject.length > 1 && (
            <div>
              <SectionTitle>Usage by Project</SectionTitle>
              <Table
                dataSource={stats.byProject}
                columns={projectColumns}
                rowKey="projectId"
                pagination={false}
                size="small"
              />
            </div>
          )}

          {/* ── Daily Usage ────────────────────────────── */}
          <div>
            <SectionTitle>Daily Usage</SectionTitle>
            {stats?.dailyUsage && stats.dailyUsage.length > 0 ? (
              <Table
                dataSource={stats.dailyUsage}
                columns={dailyColumns}
                rowKey="date"
                pagination={{ pageSize: 14 }}
                size="small"
              />
            ) : (
              <Empty
                description="No daily usage data available"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            )}
          </div>
        </Space>
      </PageLayout>
    </SiderLayout>
  );
}
