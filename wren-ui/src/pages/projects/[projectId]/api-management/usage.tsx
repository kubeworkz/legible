import { useState, useMemo } from 'react';
import {
  Table,
  TableColumnsType,
  Card,
  Row,
  Col,
  DatePicker,
  Tag,
  Typography,
  Spin,
  Empty,
} from 'antd';
import styled from 'styled-components';
import SiderLayout from '@/components/layouts/SiderLayout';
import PageLayout from '@/components/layouts/PageLayout';
import BarChartOutlined from '@ant-design/icons/BarChartOutlined';
import CheckCircleOutlined from '@ant-design/icons/CheckCircleOutlined';
import CloseCircleOutlined from '@ant-design/icons/CloseCircleOutlined';
import ClockCircleOutlined from '@ant-design/icons/ClockCircleOutlined';
import ThunderboltOutlined from '@ant-design/icons/ThunderboltOutlined';
import { useApiUsageDashboardQuery } from '@/apollo/client/graphql/apiManagement.generated';
import { ApiType } from '@/apollo/client/graphql/__types__';

const { RangePicker } = DatePicker;
const { Text } = Typography;

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

const StatSuffix = styled.span`
  font-size: 14px;
  font-weight: 400;
  color: rgba(0, 0, 0, 0.45);
`;

const formatNumber = (num: number) => {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toString();
};

const formatApiType = (type: string) => {
  return type.toLowerCase().replace(/_/g, ' ');
};

export default function APIUsage() {
  const [dateRange, setDateRange] = useState<[string?, string?]>([
    undefined,
    undefined,
  ]);

  const filter = useMemo(() => {
    const f: Record<string, any> = {};
    if (dateRange[0]) f.startDate = dateRange[0];
    if (dateRange[1]) f.endDate = dateRange[1];
    return Object.keys(f).length > 0 ? f : undefined;
  }, [dateRange]);

  const { data, loading } = useApiUsageDashboardQuery({
    fetchPolicy: 'cache-and-network',
    variables: { filter },
    onError: (error) => console.error(error),
  });

  const summary = data?.apiUsageDashboard?.summary;
  const byApiType = data?.apiUsageDashboard?.byApiType || [];
  const byApiKey = data?.apiUsageDashboard?.byApiKey || [];
  const dailyUsage = data?.apiUsageDashboard?.dailyUsage || [];

  const successRate = summary
    ? summary.totalRequests > 0
      ? ((summary.successfulRequests / summary.totalRequests) * 100).toFixed(1)
      : '0'
    : '0';

  // Columns for "Usage by API Type" table
  const apiTypeColumns: TableColumnsType<(typeof byApiType)[0]> = [
    {
      title: 'API Type',
      dataIndex: 'apiType',
      key: 'apiType',
      render: (type: ApiType) => (
        <Tag className="gray-8">{formatApiType(type)}</Tag>
      ),
    },
    {
      title: 'Total Requests',
      dataIndex: 'totalRequests',
      key: 'totalRequests',
      sorter: (a, b) => a.totalRequests - b.totalRequests,
      render: (val: number) => (
        <Text className="gray-8">{formatNumber(val)}</Text>
      ),
    },
    {
      title: 'Successful',
      dataIndex: 'successfulRequests',
      key: 'successfulRequests',
      render: (val: number) => (
        <Text type="success">{formatNumber(val)}</Text>
      ),
    },
    {
      title: 'Failed',
      dataIndex: 'failedRequests',
      key: 'failedRequests',
      render: (val: number) =>
        val > 0 ? (
          <Text type="danger">{formatNumber(val)}</Text>
        ) : (
          <Text className="gray-6">0</Text>
        ),
    },
    {
      title: 'Avg Duration (ms)',
      dataIndex: 'avgDurationMs',
      key: 'avgDurationMs',
      sorter: (a, b) => a.avgDurationMs - b.avgDurationMs,
      render: (val: number) => (
        <Text className="gray-7">{val.toLocaleString()}</Text>
      ),
    },
    {
      title: 'Tokens Used',
      dataIndex: 'tokensTotal',
      key: 'tokensTotal',
      sorter: (a, b) => a.tokensTotal - b.tokensTotal,
      render: (val: number) => (
        <Text className="gray-7">{val > 0 ? formatNumber(val) : '-'}</Text>
      ),
    },
  ];

  // Columns for "Usage by API Key" table
  const apiKeyColumns: TableColumnsType<(typeof byApiKey)[0]> = [
    {
      title: 'Key ID',
      dataIndex: 'apiKeyId',
      key: 'apiKeyId',
      width: 80,
      render: (id: number) => <Text className="gray-8">#{id}</Text>,
    },
    {
      title: 'Type',
      dataIndex: 'apiKeyType',
      key: 'apiKeyType',
      width: 100,
      render: (type: string) => (
        <Tag color={type === 'org' ? 'blue' : 'green'}>{type}</Tag>
      ),
    },
    {
      title: 'Total Requests',
      dataIndex: 'totalRequests',
      key: 'totalRequests',
      sorter: (a, b) => a.totalRequests - b.totalRequests,
      render: (val: number) => (
        <Text className="gray-8">{formatNumber(val)}</Text>
      ),
    },
    {
      title: 'Successful',
      dataIndex: 'successfulRequests',
      key: 'successfulRequests',
      render: (val: number) => (
        <Text type="success">{formatNumber(val)}</Text>
      ),
    },
    {
      title: 'Failed',
      dataIndex: 'failedRequests',
      key: 'failedRequests',
      render: (val: number) =>
        val > 0 ? (
          <Text type="danger">{formatNumber(val)}</Text>
        ) : (
          <Text className="gray-6">0</Text>
        ),
    },
    {
      title: 'Avg Duration (ms)',
      dataIndex: 'avgDurationMs',
      key: 'avgDurationMs',
      render: (val: number) => (
        <Text className="gray-7">{val.toLocaleString()}</Text>
      ),
    },
    {
      title: 'Tokens Used',
      dataIndex: 'tokensTotal',
      key: 'tokensTotal',
      render: (val: number) => (
        <Text className="gray-7">{val > 0 ? formatNumber(val) : '-'}</Text>
      ),
    },
    {
      title: 'Last Used',
      dataIndex: 'lastUsedAt',
      key: 'lastUsedAt',
      render: (date: string) => (
        <Text className="gray-7">
          {date ? new Date(date).toLocaleDateString() : '-'}
        </Text>
      ),
    },
  ];

  // Columns for "Daily Usage" table
  const dailyColumns: TableColumnsType<(typeof dailyUsage)[0]> = [
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      render: (date: string) => <Text className="gray-8">{date}</Text>,
    },
    {
      title: 'Total Requests',
      dataIndex: 'totalRequests',
      key: 'totalRequests',
      render: (val: number) => (
        <Text className="gray-8">{formatNumber(val)}</Text>
      ),
    },
    {
      title: 'Successful',
      dataIndex: 'successfulRequests',
      key: 'successfulRequests',
      render: (val: number) => (
        <Text type="success">{formatNumber(val)}</Text>
      ),
    },
    {
      title: 'Failed',
      dataIndex: 'failedRequests',
      key: 'failedRequests',
      render: (val: number) =>
        val > 0 ? (
          <Text type="danger">{formatNumber(val)}</Text>
        ) : (
          <Text className="gray-6">0</Text>
        ),
    },
    {
      title: 'Tokens Used',
      dataIndex: 'tokensTotal',
      key: 'tokensTotal',
      render: (val: number) => (
        <Text className="gray-7">{val > 0 ? formatNumber(val) : '-'}</Text>
      ),
    },
  ];

  return (
    <SiderLayout loading={false} sidebar={null}>
      <PageLayout
        title={
          <>
            <BarChartOutlined className="mr-2 gray-8" />
            API usage
          </>
        }
        description="Monitor your API usage across endpoints and API keys."
      >
        {/* Date Range Filter */}
        <div className="mb-4">
          <RangePicker
            onChange={(dates) => {
              if (dates && dates[0] && dates[1]) {
                setDateRange([
                  dates[0].toISOString(),
                  dates[1].toISOString(),
                ]);
              } else {
                setDateRange([undefined, undefined]);
              }
            }}
            allowClear
          />
        </div>

        {/* Summary Cards */}
        <Spin spinning={loading}>
          <Row gutter={[16, 16]} className="mb-4">
            <Col xs={24} sm={12} lg={6}>
              <Card size="small">
                <StatTitle>Total Requests</StatTitle>
                <StatValue>
                  <ThunderboltOutlined style={{ fontSize: 20 }} />
                  {formatNumber(summary?.totalRequests || 0)}
                </StatValue>
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card size="small">
                <StatTitle>Successful</StatTitle>
                <StatValue $color="#52c41a">
                  <CheckCircleOutlined style={{ fontSize: 20 }} />
                  {formatNumber(summary?.successfulRequests || 0)}
                  <StatSuffix>({successRate}%)</StatSuffix>
                </StatValue>
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card size="small">
                <StatTitle>Failed</StatTitle>
                <StatValue
                  $color={
                    (summary?.failedRequests || 0) > 0
                      ? '#ff4d4f'
                      : undefined
                  }
                >
                  <CloseCircleOutlined style={{ fontSize: 20 }} />
                  {formatNumber(summary?.failedRequests || 0)}
                </StatValue>
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card size="small">
                <StatTitle>Avg Duration</StatTitle>
                <StatValue>
                  <ClockCircleOutlined style={{ fontSize: 20 }} />
                  {summary?.avgDurationMs || 0}
                  <StatSuffix>ms</StatSuffix>
                </StatValue>
              </Card>
            </Col>
          </Row>

          {/* Usage by API Type */}
          <Card
            title="Usage by API type"
            size="small"
            className="mb-4"
          >
            {byApiType.length > 0 ? (
              <Table
                dataSource={byApiType}
                columns={apiTypeColumns}
                rowKey="apiType"
                pagination={false}
                size="small"
              />
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No API usage data yet"
              />
            )}
          </Card>

          {/* Usage by API Key */}
          <Card
            title="Usage by API key"
            size="small"
            className="mb-4"
          >
            {byApiKey.length > 0 ? (
              <Table
                dataSource={byApiKey}
                columns={apiKeyColumns}
                rowKey="apiKeyId"
                pagination={false}
                size="small"
              />
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No per-key usage data yet. API key attribution is recorded on each call."
              />
            )}
          </Card>

          {/* Daily Usage */}
          <Card
            title="Daily usage"
            size="small"
            className="mb-4"
          >
            {dailyUsage.length > 0 ? (
              <Table
                dataSource={[...dailyUsage].reverse()}
                columns={dailyColumns}
                rowKey="date"
                pagination={{
                  hideOnSinglePage: true,
                  pageSize: 14,
                  size: 'small',
                }}
                size="small"
              />
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No daily usage data yet"
              />
            )}
          </Card>
        </Spin>
      </PageLayout>
    </SiderLayout>
  );
}
