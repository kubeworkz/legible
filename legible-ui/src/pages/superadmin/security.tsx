import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useQuery } from '@apollo/client';
import { Card, Statistic, Row, Col, Typography, Tag, Table, Badge, Button } from 'antd';
import {
  SafetyCertificateOutlined,
  WarningOutlined,
  KeyOutlined,
  UserSwitchOutlined,
  ApiOutlined,
  LockOutlined,
} from '@ant-design/icons';
import styled from 'styled-components';
import SuperadminLayout from '@/components/layouts/SuperadminLayout';
import useAuth from '@/hooks/useAuth';
import { ADMIN_SECURITY_OVERVIEW } from '@/apollo/client/graphql/superadmin';

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

const categoryColors: Record<string, string> = {
  auth: 'blue',
  profile: 'cyan',
  org: 'green',
  org_member: 'lime',
  project: 'purple',
  project_member: 'magenta',
  api_key: 'orange',
  deploy: 'geekblue',
  superadmin: 'red',
};

const resultColors: Record<string, string> = {
  success: 'green',
  failure: 'red',
};

const recentEventsColumns = [
  {
    title: 'Time',
    dataIndex: 'timestamp',
    key: 'timestamp',
    width: 170,
    render: (ts: string) => new Date(ts).toLocaleString(),
  },
  {
    title: 'User',
    dataIndex: 'userEmail',
    key: 'userEmail',
    width: 200,
    render: (email: string | null) =>
      email ?? <Text type="secondary">system</Text>,
  },
  {
    title: 'Category',
    dataIndex: 'category',
    key: 'category',
    width: 130,
    render: (cat: string) => (
      <Tag color={categoryColors[cat] || 'default'}>{cat}</Tag>
    ),
  },
  {
    title: 'Action',
    dataIndex: 'action',
    key: 'action',
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
];

export default function SuperadminSecurity() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && user && !user.isSuperadmin) {
      router.replace('/');
    }
  }, [authLoading, user, router]);

  const { data, loading } = useQuery(ADMIN_SECURITY_OVERVIEW, {
    skip: !user?.isSuperadmin,
    fetchPolicy: 'network-only',
  });

  if (authLoading || !user?.isSuperadmin) {
    return <SuperadminLayout loading={true}>{null}</SuperadminLayout>;
  }

  const sec = data?.adminSecurityOverview;

  return (
    <SuperadminLayout>
      <PageContainer>
        <Title level={4} className="gray-9 mb-1">
          Security Overview
        </Title>
        <Text className="gray-6 d-block mb-5">
          Platform security posture, authentication health, and recent
          security events.
        </Text>

        {/* Threat indicators */}
        <Title level={5} className="gray-8 mb-3">
          Threat Indicators (24h)
        </Title>
        <Row gutter={[16, 16]} className="mb-6">
          <Col span={6}>
            <StyledCard loading={loading}>
              <Statistic
                title="Failed Logins"
                value={sec?.failedLogins24h ?? 0}
                prefix={<WarningOutlined />}
                valueStyle={{
                  color:
                    (sec?.failedLogins24h ?? 0) > 10
                      ? '#cf1322'
                      : (sec?.failedLogins24h ?? 0) > 0
                        ? '#faad14'
                        : '#3f8600',
                }}
              />
            </StyledCard>
          </Col>
          <Col span={6}>
            <StyledCard loading={loading}>
              <Statistic
                title="Failed OIDC Logins"
                value={sec?.failedOidcLogins24h ?? 0}
                prefix={<KeyOutlined />}
                valueStyle={{
                  color:
                    (sec?.failedOidcLogins24h ?? 0) > 0
                      ? '#faad14'
                      : '#3f8600',
                }}
              />
            </StyledCard>
          </Col>
          <Col span={6}>
            <StyledCard loading={loading}>
              <Statistic
                title="Total Events"
                value={sec?.totalEvents24h ?? 0}
                prefix={<SafetyCertificateOutlined />}
              />
            </StyledCard>
          </Col>
          <Col span={6}>
            <StyledCard loading={loading}>
              <Statistic
                title="Superadmin Actions (7d)"
                value={sec?.superadminActions7d ?? 0}
                prefix={<UserSwitchOutlined />}
              />
            </StyledCard>
          </Col>
        </Row>

        {/* Auth & SSO */}
        <Title level={5} className="gray-8 mb-3">
          Authentication & SSO
        </Title>
        <Row gutter={[16, 16]} className="mb-6">
          <Col span={6}>
            <StyledCard loading={loading}>
              <Statistic
                title="OIDC Providers"
                value={sec?.oidcProviderCount ?? 0}
                prefix={<ApiOutlined />}
                suffix={
                  sec?.oidcEnabledCount != null ? (
                    <Text
                      type="secondary"
                      style={{ fontSize: 14, marginLeft: 4 }}
                    >
                      ({sec.oidcEnabledCount} enabled)
                    </Text>
                  ) : null
                }
              />
            </StyledCard>
          </Col>
          <Col span={6}>
            <StyledCard loading={loading}>
              <Statistic
                title="SSO Enforced"
                value={sec?.ssoEnforcedCount ?? 0}
                prefix={<LockOutlined />}
                valueStyle={{
                  color: (sec?.ssoEnforcedCount ?? 0) > 0 ? '#3f8600' : undefined,
                }}
              />
            </StyledCard>
          </Col>
          <Col span={6}>
            <StyledCard loading={loading}>
              <Statistic
                title="Active Sessions"
                value={sec?.activeSessions ?? 0}
                suffix={
                  <Text
                    type="secondary"
                    style={{ fontSize: 14, marginLeft: 4 }}
                  >
                    / {sec?.totalSessions ?? 0}
                  </Text>
                }
              />
            </StyledCard>
          </Col>
          <Col span={6}>
            <StyledCard loading={loading}>
              <Statistic
                title="Superadmin Users"
                value={sec?.superadminCount ?? 0}
                prefix={
                  <Badge
                    status={
                      (sec?.superadminCount ?? 0) <= 3
                        ? 'success'
                        : 'warning'
                    }
                  />
                }
                suffix={
                  <Text
                    type="secondary"
                    style={{ fontSize: 14, marginLeft: 4 }}
                  >
                    / {sec?.totalUsers ?? 0}
                  </Text>
                }
              />
            </StyledCard>
          </Col>
        </Row>

        {/* Recent events */}
        <div>
          <Title level={5} className="gray-8 mb-3">
            Recent Security Events (7 days)
          </Title>
          <Table
            dataSource={sec?.recentSecurityEvents || []}
            columns={recentEventsColumns}
            rowKey="id"
            loading={loading}
            pagination={false}
            size="small"
          />
          <div style={{ marginTop: 12 }}>
            <Button
              type="link"
              onClick={() => router.push('/superadmin/audit')}
              style={{ padding: 0 }}
            >
              View full audit log →
            </Button>
          </div>
        </div>
      </PageContainer>
    </SuperadminLayout>
  );
}
