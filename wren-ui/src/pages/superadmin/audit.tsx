import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useQuery } from '@apollo/client';
import {
  Card,
  Typography,
  Table,
  Tag,
  Select,
  DatePicker,
  Row,
  Col,
  Space,
  Button,
} from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import SuperadminLayout from '@/components/layouts/SuperadminLayout';
import useAuth from '@/hooks/useAuth';
import { ADMIN_AUDIT_LOGS } from '@/apollo/client/graphql/superadmin';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const PageContainer = styled.div`
  padding: 24px 32px;
  max-width: 1400px;
`;

const categoryColors: Record<string, string> = {
  auth: 'blue',
  profile: 'cyan',
  org: 'green',
  org_member: 'lime',
  project: 'purple',
  project_member: 'magenta',
  project_permission: 'volcano',
  api_key: 'orange',
  deploy: 'geekblue',
  superadmin: 'red',
};

const resultColors: Record<string, string> = {
  success: 'green',
  failure: 'red',
};

const PAGE_SIZE = 25;

const columns = [
  {
    title: 'Time',
    dataIndex: 'timestamp',
    key: 'timestamp',
    width: 170,
    render: (ts: string) => {
      const d = new Date(ts);
      return d.toLocaleString();
    },
  },
  {
    title: 'User',
    dataIndex: 'userEmail',
    key: 'userEmail',
    width: 200,
    render: (email: string | null) => email ?? <Text type="secondary">system</Text>,
  },
  {
    title: 'Category',
    dataIndex: 'category',
    key: 'category',
    width: 140,
    render: (cat: string) => (
      <Tag color={categoryColors[cat] || 'default'}>{cat}</Tag>
    ),
  },
  {
    title: 'Action',
    dataIndex: 'action',
    key: 'action',
    width: 220,
    render: (action: string) => (
      <Text code style={{ fontSize: 12 }}>
        {action}
      </Text>
    ),
  },
  {
    title: 'Result',
    dataIndex: 'result',
    key: 'result',
    width: 90,
    render: (result: string) => (
      <Tag color={resultColors[result] || 'default'}>{result}</Tag>
    ),
  },
  {
    title: 'Target',
    key: 'target',
    width: 150,
    render: (_: any, record: any) => {
      if (!record.targetType) return '—';
      return (
        <Text type="secondary">
          {record.targetType}
          {record.targetId ? ` #${record.targetId}` : ''}
        </Text>
      );
    },
  },
  {
    title: 'IP',
    dataIndex: 'clientIp',
    key: 'clientIp',
    width: 130,
    render: (ip: string | null) =>
      ip ?? <Text type="secondary">—</Text>,
  },
  {
    title: 'Detail',
    dataIndex: 'detail',
    key: 'detail',
    ellipsis: true,
    render: (detail: any) => {
      if (!detail) return '—';
      const str = typeof detail === 'object' ? JSON.stringify(detail) : detail;
      return (
        <Text type="secondary" style={{ fontSize: 12 }} ellipsis title={str}>
          {str}
        </Text>
      );
    },
  },
];

const categoryOptions = [
  { value: '', label: 'All Categories' },
  { value: 'auth', label: 'Auth' },
  { value: 'profile', label: 'Profile' },
  { value: 'org', label: 'Organization' },
  { value: 'org_member', label: 'Org Member' },
  { value: 'project', label: 'Project' },
  { value: 'project_member', label: 'Project Member' },
  { value: 'project_permission', label: 'Permissions' },
  { value: 'api_key', label: 'API Key' },
  { value: 'deploy', label: 'Deploy' },
  { value: 'superadmin', label: 'Superadmin' },
];

const resultOptions = [
  { value: '', label: 'All Results' },
  { value: 'success', label: 'Success' },
  { value: 'failure', label: 'Failure' },
];

export default function SuperadminAuditLogs() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState('');
  const [result, setResult] = useState('');
  const [dateRange, setDateRange] = useState<[any, any] | null>(null);

  useEffect(() => {
    if (!authLoading && user && !user.isSuperadmin) {
      router.replace('/');
    }
  }, [authLoading, user, router]);

  const buildFilter = useCallback(() => {
    const filter: Record<string, any> = {};
    if (category) filter.category = category;
    if (result) filter.result = result;
    if (dateRange && dateRange[0] && dateRange[1]) {
      filter.startTime = dateRange[0].toISOString();
      filter.endTime = dateRange[1].toISOString();
    }
    return Object.keys(filter).length > 0 ? filter : undefined;
  }, [category, result, dateRange]);

  const { data, loading, refetch } = useQuery(ADMIN_AUDIT_LOGS, {
    skip: !user?.isSuperadmin,
    variables: {
      filter: buildFilter(),
      pagination: { limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE },
    },
    fetchPolicy: 'network-only',
  });

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handleFilterReset = () => {
    setCategory('');
    setResult('');
    setDateRange(null);
    setPage(1);
  };

  if (authLoading || !user?.isSuperadmin) {
    return <SuperadminLayout loading={true}>{null}</SuperadminLayout>;
  }

  const auditData = data?.adminAuditLogs;

  return (
    <SuperadminLayout>
      <PageContainer>
        <Title level={4} className="gray-9 mb-1">
          Audit Log
        </Title>
        <Text className="gray-6 d-block mb-5">
          Cross-organization audit trail of all platform events.
        </Text>

        <Card className="mb-4" size="small">
          <Row gutter={[12, 12]} align="middle">
            <Col>
              <Select
                value={category}
                onChange={(v) => {
                  setCategory(v);
                  setPage(1);
                }}
                options={categoryOptions}
                style={{ width: 160 }}
                placeholder="Category"
              />
            </Col>
            <Col>
              <Select
                value={result}
                onChange={(v) => {
                  setResult(v);
                  setPage(1);
                }}
                options={resultOptions}
                style={{ width: 130 }}
                placeholder="Result"
              />
            </Col>
            <Col>
              <RangePicker
                showTime
                value={dateRange}
                onChange={(dates) => {
                  setDateRange(dates as any);
                  setPage(1);
                }}
              />
            </Col>
            <Col>
              <Space>
                <Button onClick={handleFilterReset}>Reset</Button>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={() => refetch()}
                />
              </Space>
            </Col>
            <Col flex="auto" style={{ textAlign: 'right' }}>
              <Text type="secondary">
                {auditData?.total ?? 0} events
              </Text>
            </Col>
          </Row>
        </Card>

        <Table
          dataSource={auditData?.data || []}
          columns={columns}
          rowKey="id"
          loading={loading}
          size="small"
          scroll={{ x: 1200 }}
          pagination={{
            current: page,
            pageSize: PAGE_SIZE,
            total: auditData?.total ?? 0,
            onChange: handlePageChange,
            showSizeChanger: false,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} of ${total}`,
          }}
        />
      </PageContainer>
    </SuperadminLayout>
  );
}
