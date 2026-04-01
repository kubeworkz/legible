import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useQuery } from '@apollo/client';
import { Card, Statistic, Row, Col, Typography, Tag, Table } from 'antd';
import styled from 'styled-components';
import SuperadminLayout from '@/components/layouts/SuperadminLayout';
import useAuth from '@/hooks/useAuth';
import {
  ADMIN_PLATFORM_STATS,
  ADMIN_LIST_ORGANIZATIONS,
} from '@/apollo/client/graphql/superadmin';

const { Title, Text } = Typography;

const PageContainer = styled.div`
  padding: 24px 32px;
  max-width: 1200px;
`;

const StyledCard = styled(Card)`
  .ant-statistic-title {
    color: var(--gray-7);
  }
`;

const columns = [
  {
    title: 'Organization',
    dataIndex: 'displayName',
    key: 'displayName',
  },
  {
    title: 'Members',
    dataIndex: 'memberCount',
    key: 'memberCount',
    width: 100,
  },
  {
    title: 'Plan',
    dataIndex: 'plan',
    key: 'plan',
    width: 120,
    render: (plan: string) => (
      <Tag color={plan === 'free' ? 'default' : 'blue'}>{plan}</Tag>
    ),
  },
  {
    title: 'Status',
    dataIndex: 'subscriptionStatus',
    key: 'subscriptionStatus',
    width: 120,
    render: (status: string | null) => {
      if (!status) return <Tag>N/A</Tag>;
      const color = status === 'active' ? 'green' : 'orange';
      return <Tag color={color}>{status}</Tag>;
    },
  },
  {
    title: 'Created',
    dataIndex: 'createdAt',
    key: 'createdAt',
    width: 180,
    render: (date: string) => new Date(date).toLocaleDateString(),
  },
];

export default function SuperadminOverview() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && user && !user.isSuperadmin) {
      router.replace('/');
    }
  }, [authLoading, user, router]);

  const { data: statsData, loading: statsLoading } =
    useQuery(ADMIN_PLATFORM_STATS, { skip: !user?.isSuperadmin });

  const { data: orgsData, loading: orgsLoading } =
    useQuery(ADMIN_LIST_ORGANIZATIONS, { skip: !user?.isSuperadmin });

  if (authLoading || !user?.isSuperadmin) {
    return <SuperadminLayout loading={true}>{null}</SuperadminLayout>;
  }

  const stats = statsData?.adminPlatformStats;
  const orgs = orgsData?.adminListOrganizations || [];

  return (
    <SuperadminLayout>
      <PageContainer>
        <Title level={4} className="gray-9 mb-1">
          Platform Overview
        </Title>
        <Text className="gray-6 d-block mb-5">
          High-level view of platform usage and organizations.
        </Text>

        <Row gutter={[16, 16]} className="mb-6">
          <Col span={6}>
            <StyledCard loading={statsLoading}>
              <Statistic
                title="Total Users"
                value={stats?.totalUsers ?? 0}
              />
            </StyledCard>
          </Col>
          <Col span={6}>
            <StyledCard loading={statsLoading}>
              <Statistic
                title="Active Users"
                value={stats?.activeUsers ?? 0}
              />
            </StyledCard>
          </Col>
          <Col span={6}>
            <StyledCard loading={statsLoading}>
              <Statistic
                title="Organizations"
                value={stats?.totalOrganizations ?? 0}
              />
            </StyledCard>
          </Col>
          <Col span={6}>
            <StyledCard loading={statsLoading}>
              <Statistic
                title="Paid Plans"
                value={
                  stats?.subscriptionsByPlan
                    ?.filter((p: any) => p.plan !== 'free')
                    .reduce((sum: number, p: any) => sum + p.count, 0) ?? 0
                }
              />
            </StyledCard>
          </Col>
        </Row>

        {stats?.subscriptionsByPlan?.length > 0 && (
          <div className="mb-6">
            <Title level={5} className="gray-8 mb-3">
              Subscriptions by Plan
            </Title>
            <Row gutter={[12, 12]}>
              {stats.subscriptionsByPlan.map((item: any) => (
                <Col key={item.plan}>
                  <Tag
                    color={item.plan === 'free' ? 'default' : 'blue'}
                    style={{ fontSize: 14, padding: '4px 12px' }}
                  >
                    {item.plan}: {item.count}
                  </Tag>
                </Col>
              ))}
            </Row>
          </div>
        )}

        <div>
          <Title level={5} className="gray-8 mb-3">
            Organizations
          </Title>
          <Table
            dataSource={orgs}
            columns={columns}
            rowKey="id"
            loading={orgsLoading}
            pagination={{ pageSize: 10 }}
            size="middle"
            onRow={(record: any) => ({
              style: { cursor: 'pointer' },
              onClick: () =>
                router.push(`/superadmin/organizations/${record.id}`),
            })}
          />
        </div>
      </PageContainer>
    </SuperadminLayout>
  );
}
