import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useQuery } from '@apollo/client';
import { Card, Statistic, Row, Col, Typography, Tag, Table } from 'antd';
import {
  DollarOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import styled from 'styled-components';
import SuperadminLayout from '@/components/layouts/SuperadminLayout';
import useAuth from '@/hooks/useAuth';
import { ADMIN_REVENUE_STATS } from '@/apollo/client/graphql/superadmin';

const { Title, Text } = Typography;

const PageContainer = styled.div`
  padding: 24px 32px;
  max-width: 1200px;
`;

const StyledCard = styled(Card)`
  .ant-statistic-title {
    color: var(--gray-7);
  }
  .ant-statistic-content-value {
    font-size: 28px;
  }
`;

const planColors: Record<string, string> = {
  free: 'default',
  pro: 'blue',
  enterprise: 'purple',
};

const statusColors: Record<string, string> = {
  active: 'green',
  trialing: 'cyan',
  past_due: 'orange',
  canceled: 'red',
  unpaid: 'volcano',
};

const orgRevenueColumns = [
  {
    title: 'Organization',
    dataIndex: 'organizationName',
    key: 'organizationName',
    sorter: (a: any, b: any) =>
      a.organizationName.localeCompare(b.organizationName),
  },
  {
    title: 'Plan',
    dataIndex: 'plan',
    key: 'plan',
    width: 120,
    filters: [
      { text: 'Free', value: 'free' },
      { text: 'Pro', value: 'pro' },
      { text: 'Enterprise', value: 'enterprise' },
    ],
    onFilter: (value: any, record: any) => record.plan === value,
    render: (plan: string) => (
      <Tag color={planColors[plan] || 'default'}>{plan}</Tag>
    ),
  },
  {
    title: 'Status',
    dataIndex: 'status',
    key: 'status',
    width: 120,
    filters: [
      { text: 'Active', value: 'active' },
      { text: 'Trialing', value: 'trialing' },
      { text: 'Past Due', value: 'past_due' },
      { text: 'Canceled', value: 'canceled' },
    ],
    onFilter: (value: any, record: any) => record.status === value,
    render: (status: string) => (
      <Tag color={statusColors[status] || 'default'}>{status}</Tag>
    ),
  },
  {
    title: 'MRR',
    dataIndex: 'mrr',
    key: 'mrr',
    width: 120,
    sorter: (a: any, b: any) => a.mrr - b.mrr,
    render: (mrr: number) => (
      <Text strong={mrr > 0} type={mrr > 0 ? 'success' : undefined}>
        ${mrr.toFixed(2)}
      </Text>
    ),
  },
  {
    title: 'Period End',
    dataIndex: 'currentPeriodEnd',
    key: 'currentPeriodEnd',
    width: 150,
    render: (date: string | null) =>
      date ? new Date(date).toLocaleDateString() : '—',
  },
  {
    title: 'Canceled',
    dataIndex: 'canceledAt',
    key: 'canceledAt',
    width: 150,
    render: (date: string | null) =>
      date ? (
        <Text type="danger">{new Date(date).toLocaleDateString()}</Text>
      ) : (
        '—'
      ),
  },
];

export default function SuperadminRevenue() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && user && !user.isSuperadmin) {
      router.replace('/');
    }
  }, [authLoading, user, router]);

  const { data, loading } = useQuery(ADMIN_REVENUE_STATS, {
    skip: !user?.isSuperadmin,
  });

  if (authLoading || !user?.isSuperadmin) {
    return <SuperadminLayout loading={true}>{null}</SuperadminLayout>;
  }

  const rev = data?.adminRevenueStats;

  return (
    <SuperadminLayout>
      <PageContainer>
        <Title level={4} className="gray-9 mb-1">
          Revenue & Billing
        </Title>
        <Text className="gray-6 d-block mb-5">
          Monthly recurring revenue, churn, and per-organization billing
          overview.
        </Text>

        {/* Top-line metrics */}
        <Row gutter={[16, 16]} className="mb-6">
          <Col span={6}>
            <StyledCard loading={loading}>
              <Statistic
                title="MRR"
                value={rev?.mrr ?? 0}
                prefix={<DollarOutlined />}
                precision={2}
              />
            </StyledCard>
          </Col>
          <Col span={6}>
            <StyledCard loading={loading}>
              <Statistic
                title="ARR"
                value={rev?.arr ?? 0}
                prefix={<DollarOutlined />}
                precision={2}
              />
            </StyledCard>
          </Col>
          <Col span={6}>
            <StyledCard loading={loading}>
              <Statistic
                title="ARPU"
                value={rev?.arpu ?? 0}
                prefix={<DollarOutlined />}
                precision={2}
                suffix="/org"
              />
            </StyledCard>
          </Col>
          <Col span={6}>
            <StyledCard loading={loading}>
              <Statistic
                title="Churn Rate (30d)"
                value={rev?.churnRate ?? 0}
                precision={1}
                suffix="%"
                valueStyle={{
                  color:
                    (rev?.churnRate ?? 0) > 5
                      ? '#cf1322'
                      : (rev?.churnRate ?? 0) > 0
                        ? '#faad14'
                        : '#3f8600',
                }}
                prefix={
                  (rev?.churnRate ?? 0) > 0 ? (
                    <ArrowDownOutlined />
                  ) : (
                    <ArrowUpOutlined />
                  )
                }
              />
            </StyledCard>
          </Col>
        </Row>

        {/* Org counts */}
        <Row gutter={[16, 16]} className="mb-6">
          <Col span={8}>
            <StyledCard loading={loading}>
              <Statistic
                title="Paid Organizations"
                value={rev?.totalPaidOrgs ?? 0}
                prefix={<TeamOutlined />}
                valueStyle={{ color: '#3f8600' }}
              />
            </StyledCard>
          </Col>
          <Col span={8}>
            <StyledCard loading={loading}>
              <Statistic
                title="Free Organizations"
                value={rev?.totalFreeOrgs ?? 0}
                prefix={<TeamOutlined />}
              />
            </StyledCard>
          </Col>
          <Col span={8}>
            <StyledCard loading={loading}>
              <Statistic
                title="Canceled"
                value={rev?.totalCanceledOrgs ?? 0}
                prefix={<TeamOutlined />}
                valueStyle={{
                  color: (rev?.totalCanceledOrgs ?? 0) > 0 ? '#cf1322' : undefined,
                }}
              />
            </StyledCard>
          </Col>
        </Row>

        {/* Plan breakdown */}
        {rev?.planBreakdown?.length > 0 && (
          <div className="mb-6">
            <Title level={5} className="gray-8 mb-3">
              Revenue by Plan
            </Title>
            <Row gutter={[12, 12]}>
              {rev.planBreakdown.map((item: any) => (
                <Col key={item.plan} span={8}>
                  <Card size="small">
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <Tag
                          color={planColors[item.plan] || 'default'}
                          style={{ fontSize: 14, marginBottom: 4 }}
                        >
                          {item.plan}
                        </Tag>
                        <div>
                          <Text type="secondary">{item.count} orgs</Text>
                        </div>
                      </div>
                      <Statistic
                        value={item.mrr}
                        prefix="$"
                        precision={2}
                        suffix="/mo"
                        valueStyle={{ fontSize: 20 }}
                      />
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>
          </div>
        )}

        {/* Org revenue table */}
        <div>
          <Title level={5} className="gray-8 mb-3">
            Organization Revenue
          </Title>
          <Table
            dataSource={rev?.orgRevenue || []}
            columns={orgRevenueColumns}
            rowKey="organizationId"
            loading={loading}
            pagination={{ pageSize: 10 }}
            size="middle"
            onRow={(record: any) => ({
              style: { cursor: 'pointer' },
              onClick: () =>
                router.push(
                  `/superadmin/organizations/${record.organizationId}`,
                ),
            })}
          />
        </div>
      </PageContainer>
    </SuperadminLayout>
  );
}
