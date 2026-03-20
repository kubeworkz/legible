import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useQuery } from '@apollo/client';
import { Typography, Table, Tag, Input } from 'antd';
import styled from 'styled-components';
import SuperadminLayout from '@/components/layouts/SuperadminLayout';
import useAuth from '@/hooks/useAuth';
import { ADMIN_LIST_ORGANIZATIONS } from '@/apollo/client/graphql/superadmin';
import { useState } from 'react';

const { Title, Text } = Typography;

const PageContainer = styled.div`
  padding: 24px 32px;
  max-width: 1200px;
`;

const columns = [
  {
    title: 'Organization',
    dataIndex: 'displayName',
    key: 'displayName',
    sorter: (a: any, b: any) => a.displayName.localeCompare(b.displayName),
  },
  {
    title: 'Slug',
    dataIndex: 'slug',
    key: 'slug',
    render: (slug: string) => (
      <Text code style={{ fontSize: 12 }}>
        {slug}
      </Text>
    ),
  },
  {
    title: 'Members',
    dataIndex: 'memberCount',
    key: 'memberCount',
    width: 100,
    sorter: (a: any, b: any) => a.memberCount - b.memberCount,
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
    sorter: (a: any, b: any) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    render: (date: string) => new Date(date).toLocaleDateString(),
  },
];

export default function SuperadminOrganizations() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!authLoading && user && !user.isSuperadmin) {
      router.replace('/');
    }
  }, [authLoading, user, router]);

  const { data, loading } = useQuery(ADMIN_LIST_ORGANIZATIONS, {
    skip: !user?.isSuperadmin,
  });

  if (authLoading || !user?.isSuperadmin) {
    return <SuperadminLayout loading={true}>{null}</SuperadminLayout>;
  }

  const allOrgs = data?.adminListOrganizations || [];
  const orgs = search
    ? allOrgs.filter(
        (o: any) =>
          o.displayName.toLowerCase().includes(search.toLowerCase()) ||
          o.slug.toLowerCase().includes(search.toLowerCase()),
      )
    : allOrgs;

  return (
    <SuperadminLayout>
      <PageContainer>
        <Title level={4} className="gray-9 mb-1">
          Organizations
        </Title>
        <Text className="gray-6 d-block mb-4">
          All organizations on the platform.
        </Text>

        <Input.Search
          placeholder="Search by name or slug..."
          allowClear
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 360, marginBottom: 16 }}
        />

        <Table
          dataSource={orgs}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 20, showSizeChanger: true }}
          size="middle"
          onRow={(record: any) => ({
            style: { cursor: 'pointer' },
            onClick: () =>
              router.push(`/superadmin/organizations/${record.id}`),
          })}
        />
      </PageContainer>
    </SuperadminLayout>
  );
}
