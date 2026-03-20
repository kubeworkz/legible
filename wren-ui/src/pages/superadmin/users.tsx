import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useQuery, useMutation } from '@apollo/client';
import { Typography, Table, Tag, Input, Button, Popconfirm, message } from 'antd';
import styled from 'styled-components';
import SuperadminLayout from '@/components/layouts/SuperadminLayout';
import useAuth from '@/hooks/useAuth';
import {
  ADMIN_LIST_USERS,
  ADMIN_SET_SUPERADMIN,
  ADMIN_REVOKE_SUPERADMIN,
} from '@/apollo/client/graphql/superadmin';

const { Title, Text } = Typography;

const PageContainer = styled.div`
  padding: 24px 32px;
  max-width: 1200px;
`;

export default function SuperadminUsers() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!authLoading && user && !user.isSuperadmin) {
      router.replace('/');
    }
  }, [authLoading, user, router]);

  const { data, loading, refetch } = useQuery(ADMIN_LIST_USERS, {
    skip: !user?.isSuperadmin,
  });

  const [setSuperadmin] = useMutation(ADMIN_SET_SUPERADMIN, {
    onCompleted: () => {
      message.success('Superadmin granted');
      refetch();
    },
    onError: (err) => message.error(err.message),
  });

  const [revokeSuperadmin] = useMutation(ADMIN_REVOKE_SUPERADMIN, {
    onCompleted: () => {
      message.success('Superadmin revoked');
      refetch();
    },
    onError: (err) => message.error(err.message),
  });

  if (authLoading || !user?.isSuperadmin) {
    return <SuperadminLayout loading={true}>{null}</SuperadminLayout>;
  }

  const allUsers = data?.adminListUsers || [];
  const users = search
    ? allUsers.filter(
        (u: any) =>
          u.email.toLowerCase().includes(search.toLowerCase()) ||
          u.displayName?.toLowerCase().includes(search.toLowerCase()),
      )
    : allUsers;

  const columns = [
    {
      title: 'User',
      key: 'user',
      render: (_: any, record: any) => (
        <div>
          <div>{record.displayName || record.email}</div>
          {record.displayName && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.email}
            </Text>
          )}
        </div>
      ),
      sorter: (a: any, b: any) =>
        (a.displayName || a.email).localeCompare(b.displayName || b.email),
    },
    {
      title: 'Status',
      key: 'status',
      width: 120,
      render: (_: any, record: any) => (
        <Tag color={record.isActive ? 'green' : 'red'}>
          {record.isActive ? 'Active' : 'Inactive'}
        </Tag>
      ),
      filters: [
        { text: 'Active', value: true },
        { text: 'Inactive', value: false },
      ],
      onFilter: (value: any, record: any) => record.isActive === value,
    },
    {
      title: 'Email Verified',
      dataIndex: 'emailVerified',
      key: 'emailVerified',
      width: 130,
      render: (v: boolean) => (
        <Tag color={v ? 'green' : 'orange'}>{v ? 'Yes' : 'No'}</Tag>
      ),
    },
    {
      title: 'Organizations',
      key: 'organizations',
      render: (_: any, record: any) =>
        record.organizations?.map((o: any) => (
          <Tag key={o.organizationId}>{o.organizationName || `Org ${o.organizationId}`}</Tag>
        )) || '-',
    },
    {
      title: 'Superadmin',
      key: 'superadmin',
      width: 140,
      render: (_: any, record: any) => {
        if (record.isSuperadmin) {
          return (
            <Popconfirm
              title="Revoke superadmin?"
              description="This will remove superadmin access."
              onConfirm={() =>
                revokeSuperadmin({ variables: { userId: record.id } })
              }
              disabled={record.id === user?.id}
            >
              <Tag color="gold" style={{ cursor: record.id === user?.id ? 'default' : 'pointer' }}>
                Superadmin
              </Tag>
            </Popconfirm>
          );
        }
        return (
          <Popconfirm
            title="Grant superadmin?"
            description="This will give full platform access."
            onConfirm={() =>
              setSuperadmin({ variables: { userId: record.id } })
            }
          >
            <Button size="small" type="link">
              Grant
            </Button>
          </Popconfirm>
        );
      },
    },
    {
      title: 'Last Login',
      dataIndex: 'lastLoginAt',
      key: 'lastLoginAt',
      width: 160,
      sorter: (a: any, b: any) => {
        if (!a.lastLoginAt) return 1;
        if (!b.lastLoginAt) return -1;
        return (
          new Date(a.lastLoginAt).getTime() -
          new Date(b.lastLoginAt).getTime()
        );
      },
      render: (date: string | null) =>
        date ? new Date(date).toLocaleString() : 'Never',
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 140,
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
  ];

  return (
    <SuperadminLayout>
      <PageContainer>
        <Title level={4} className="gray-9 mb-1">
          Users
        </Title>
        <Text className="gray-6 d-block mb-4">
          All users registered on the platform.
        </Text>

        <Input.Search
          placeholder="Search by name or email..."
          allowClear
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 360, marginBottom: 16 }}
        />

        <Table
          dataSource={users}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 20, showSizeChanger: true }}
          size="middle"
        />
      </PageContainer>
    </SuperadminLayout>
  );
}
