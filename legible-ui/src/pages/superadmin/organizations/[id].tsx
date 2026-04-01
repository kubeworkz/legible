import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useQuery } from '@apollo/client';
import {
  Typography,
  Table,
  Tag,
  Descriptions,
  Card,
  Button,
  Statistic,
  Row,
  Col,
} from 'antd';
import styled from 'styled-components';
import ArrowLeftOutlined from '@ant-design/icons/ArrowLeftOutlined';
import SuperadminLayout from '@/components/layouts/SuperadminLayout';
import useAuth from '@/hooks/useAuth';
import { ADMIN_GET_ORGANIZATION } from '@/apollo/client/graphql/superadmin';

const { Title, Text } = Typography;

const PageContainer = styled.div`
  padding: 24px 32px;
  max-width: 1200px;
`;

const memberColumns = [
  {
    title: 'User',
    key: 'user',
    render: (_: any, record: any) => (
      <div>
        <div>{record.user?.displayName || 'Unknown'}</div>
        <Text type="secondary" style={{ fontSize: 12 }}>
          {record.user?.email}
        </Text>
      </div>
    ),
  },
  {
    title: 'Role',
    dataIndex: 'role',
    key: 'role',
    width: 120,
    render: (role: string) => {
      const colors: Record<string, string> = {
        OWNER: 'gold',
        ADMIN: 'blue',
        MEMBER: 'default',
      };
      return <Tag color={colors[role] || 'default'}>{role}</Tag>;
    },
  },
  {
    title: 'Joined',
    dataIndex: 'createdAt',
    key: 'createdAt',
    width: 180,
    render: (date: string) => new Date(date).toLocaleDateString(),
  },
];

export default function SuperadminOrganizationDetail() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const orgId = Number(router.query.id);

  useEffect(() => {
    if (!authLoading && user && !user.isSuperadmin) {
      router.replace('/');
    }
  }, [authLoading, user, router]);

  const { data, loading } = useQuery(ADMIN_GET_ORGANIZATION, {
    variables: { organizationId: orgId },
    skip: !user?.isSuperadmin || !orgId,
  });

  if (authLoading || !user?.isSuperadmin) {
    return <SuperadminLayout loading={true}>{null}</SuperadminLayout>;
  }

  const org = data?.adminGetOrganization;

  return (
    <SuperadminLayout loading={loading && !org}>
      <PageContainer>
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => router.push('/superadmin/organizations')}
          className="mb-3"
        >
          Back to organizations
        </Button>

        {org && (
          <>
            <Title level={4} className="gray-9 mb-1">
              {org.displayName}
            </Title>
            <Text className="gray-6 d-block mb-5">
              Organization details and members.
            </Text>

            <Row gutter={[16, 16]} className="mb-5">
              <Col span={6}>
                <Card>
                  <Statistic title="Members" value={org.memberCount} />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic title="Projects" value={org.projectCount} />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic title="Plan" value={org.plan} />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="Status"
                    value={org.subscriptionStatus || 'N/A'}
                  />
                </Card>
              </Col>
            </Row>

            <Card className="mb-5">
              <Descriptions
                column={2}
                size="small"
                title="Organization Info"
              >
                <Descriptions.Item label="ID">{org.id}</Descriptions.Item>
                <Descriptions.Item label="Slug">
                  <Text code>{org.slug}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Created">
                  {new Date(org.createdAt).toLocaleString()}
                </Descriptions.Item>
                <Descriptions.Item label="Updated">
                  {new Date(org.updatedAt).toLocaleString()}
                </Descriptions.Item>
              </Descriptions>
            </Card>

            <Title level={5} className="gray-8 mb-3">
              Members ({org.members?.length || 0})
            </Title>
            <Table
              dataSource={org.members || []}
              columns={memberColumns}
              rowKey="id"
              pagination={false}
              size="middle"
            />
          </>
        )}
      </PageContainer>
    </SuperadminLayout>
  );
}
