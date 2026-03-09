import { useCallback, useMemo, useState } from 'react';
import {
  Button,
  Table,
  Tag,
  Select,
  Typography,
  DatePicker,
  Drawer,
  Space,
  Input,
  Empty,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import styled from 'styled-components';
import ReloadOutlined from '@ant-design/icons/ReloadOutlined';
import SettingsLayout from '@/components/layouts/SettingsLayout';
import useOrganization from '@/hooks/useOrganization';
import { useQuery } from '@apollo/client';
import { AUDIT_LOGS } from '@/apollo/client/graphql/auditLog';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const PageContainer = styled.div`
  max-width: 1100px;
  padding: 24px 32px;
`;

const HeaderRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
`;

const FilterRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
`;

const DetailBlock = styled.pre`
  background-color: var(--gray-2);
  border: 1px solid var(--gray-4);
  border-radius: 6px;
  padding: 12px 16px;
  font-size: 12px;
  line-height: 1.6;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-all;
`;

// ── Types ──────────────────────────────────────────────────────

interface AuditLogEntry {
  id: number;
  timestamp: string;
  userId: number | null;
  userEmail: string | null;
  clientIp: string | null;
  organizationId: number | null;
  projectId: number | null;
  category: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  result: string;
  detail: Record<string, unknown> | null;
  createdAt: string;
}

// ── Constants ──────────────────────────────────────────────────

const CATEGORY_OPTIONS = [
  { label: 'Auth', value: 'auth' },
  { label: 'Profile', value: 'profile' },
  { label: 'Organization', value: 'org' },
  { label: 'Org Member', value: 'org_member' },
  { label: 'Project', value: 'project' },
  { label: 'Project Member', value: 'project_member' },
  { label: 'Project Permission', value: 'project_permission' },
  { label: 'API Key', value: 'api_key' },
  { label: 'Deploy', value: 'deploy' },
];

const RESULT_COLORS: Record<string, string> = {
  success: 'green',
  failure: 'red',
  error: 'volcano',
};

const PAGE_SIZE = 20;

// ── Component ──────────────────────────────────────────────────

export default function SettingsAuditLog() {
  const { currentOrganization, isAdmin } = useOrganization();

  // Filters
  const [category, setCategory] = useState<string | undefined>();
  const [resultFilter, setResultFilter] = useState<string | undefined>();
  const [emailSearch, setEmailSearch] = useState('');
  const [dateRange, setDateRange] = useState<[string, string] | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Detail drawer
  const [drawerEntry, setDrawerEntry] = useState<AuditLogEntry | null>(null);

  const filterVars = useMemo(() => {
    const f: Record<string, unknown> = {};
    if (category) f.category = category;
    if (resultFilter) f.result = resultFilter;
    if (dateRange) {
      f.startTime = dateRange[0];
      f.endTime = dateRange[1];
    }
    return Object.keys(f).length > 0 ? f : undefined;
  }, [category, resultFilter, dateRange]);

  const { data, loading, refetch } = useQuery(AUDIT_LOGS, {
    variables: {
      filter: filterVars,
      pagination: {
        limit: PAGE_SIZE,
        offset: (currentPage - 1) * PAGE_SIZE,
      },
    },
    fetchPolicy: 'network-only',
    skip: !isAdmin,
  });

  const entries: AuditLogEntry[] = data?.auditLogs?.data ?? [];
  const total: number = data?.auditLogs?.total ?? 0;

  // Client-side email filter (backend doesn't support text search on email)
  const filteredEntries = useMemo(() => {
    if (!emailSearch.trim()) return entries;
    const needle = emailSearch.toLowerCase();
    return entries.filter((e) =>
      e.userEmail?.toLowerCase().includes(needle),
    );
  }, [entries, emailSearch]);

  const handleClearFilters = useCallback(() => {
    setCategory(undefined);
    setResultFilter(undefined);
    setEmailSearch('');
    setDateRange(null);
    setCurrentPage(1);
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const handleDateChange = useCallback((_: unknown, dateStrings: [string, string]) => {
    if (dateStrings[0] && dateStrings[1]) {
      setDateRange(dateStrings);
    } else {
      setDateRange(null);
    }
    setCurrentPage(1);
  }, []);

  // ── Table columns ──────────────────────────────────────────

  const columns: ColumnsType<AuditLogEntry> = useMemo(
    () => [
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
        ellipsis: true,
        render: (email: string | null) => email || '—',
      },
      {
        title: 'Category',
        dataIndex: 'category',
        key: 'category',
        width: 120,
        render: (cat: string) => (
          <Tag>{cat.replace(/_/g, ' ')}</Tag>
        ),
      },
      {
        title: 'Action',
        dataIndex: 'action',
        key: 'action',
        width: 140,
        render: (action: string) => action.replace(/_/g, ' '),
      },
      {
        title: 'Target',
        key: 'target',
        width: 140,
        render: (_: unknown, record: AuditLogEntry) => {
          if (!record.targetType) return '—';
          return (
            <span>
              {record.targetType}
              {record.targetId ? ` #${record.targetId}` : ''}
            </span>
          );
        },
      },
      {
        title: 'Result',
        dataIndex: 'result',
        key: 'result',
        width: 90,
        render: (result: string) => (
          <Tag color={RESULT_COLORS[result] || 'default'}>{result}</Tag>
        ),
      },
      {
        title: 'IP',
        dataIndex: 'clientIp',
        key: 'clientIp',
        width: 130,
        render: (ip: string | null) => ip || '—',
      },
      {
        title: '',
        key: 'detail',
        width: 70,
        render: (_: unknown, record: AuditLogEntry) =>
          record.detail ? (
            <Button
              type="link"
              size="small"
              onClick={() => setDrawerEntry(record)}
            >
              Detail
            </Button>
          ) : null,
      },
    ],
    [],
  );

  // ── Access guard ──────────────────────────────────────────

  if (!isAdmin) {
    return (
      <SettingsLayout>
        <PageContainer>
          <Empty description="You don't have permission to view audit logs." />
        </PageContainer>
      </SettingsLayout>
    );
  }

  if (!currentOrganization) {
    return <SettingsLayout loading><div /></SettingsLayout>;
  }

  // ── Render ──────────────────────────────────────────────────

  return (
    <SettingsLayout>
      <PageContainer>
        <HeaderRow>
          <div>
            <Title level={4} className="gray-9 mb-1">
              Audit Activity
            </Title>
            <Text className="gray-6">
              View security and administrative events for{' '}
              <Text strong>{currentOrganization.displayName}</Text>.
            </Text>
          </div>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => refetch()}
            loading={loading}
          >
            Refresh
          </Button>
        </HeaderRow>

        <FilterRow>
          <Select
            placeholder="Category"
            allowClear
            style={{ width: 160 }}
            options={CATEGORY_OPTIONS}
            value={category}
            onChange={(val) => {
              setCategory(val);
              setCurrentPage(1);
            }}
          />
          <Select
            placeholder="Result"
            allowClear
            style={{ width: 120 }}
            options={[
              { label: 'Success', value: 'success' },
              { label: 'Failure', value: 'failure' },
              { label: 'Error', value: 'error' },
            ]}
            value={resultFilter}
            onChange={(val) => {
              setResultFilter(val);
              setCurrentPage(1);
            }}
          />
          <RangePicker
            showTime
            onChange={handleDateChange}
            style={{ width: 340 }}
          />
          <Input.Search
            placeholder="Search email..."
            allowClear
            style={{ width: 200 }}
            value={emailSearch}
            onChange={(e) => setEmailSearch(e.target.value)}
          />
          <Button onClick={handleClearFilters}>Clear</Button>
        </FilterRow>

        <Table
          dataSource={filteredEntries}
          columns={columns}
          rowKey="id"
          loading={loading}
          size="small"
          scroll={{ x: 1060 }}
          pagination={{
            current: currentPage,
            pageSize: PAGE_SIZE,
            total,
            onChange: handlePageChange,
            showSizeChanger: false,
            showTotal: (t) => `${t} events`,
          }}
          locale={{
            emptyText: (
              <Empty
                description="No audit events found"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            ),
          }}
        />

        {/* Detail Drawer */}
        <Drawer
          title="Event Detail"
          placement="right"
          width={480}
          open={!!drawerEntry}
          onClose={() => setDrawerEntry(null)}
        >
          {drawerEntry && (
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <div>
                <Text type="secondary">Event ID</Text>
                <br />
                <Text strong>{drawerEntry.id}</Text>
              </div>
              <div>
                <Text type="secondary">Time</Text>
                <br />
                <Text strong>
                  {new Date(drawerEntry.timestamp).toLocaleString()}
                </Text>
              </div>
              <div>
                <Text type="secondary">User</Text>
                <br />
                <Text strong>{drawerEntry.userEmail || '—'}</Text>
              </div>
              <div>
                <Text type="secondary">Category / Action</Text>
                <br />
                <Tag>{drawerEntry.category}</Tag>
                <Tag color="blue">{drawerEntry.action}</Tag>
              </div>
              <div>
                <Text type="secondary">Result</Text>
                <br />
                <Tag color={RESULT_COLORS[drawerEntry.result] || 'default'}>
                  {drawerEntry.result}
                </Tag>
              </div>
              {drawerEntry.targetType && (
                <div>
                  <Text type="secondary">Target</Text>
                  <br />
                  <Text strong>
                    {drawerEntry.targetType}
                    {drawerEntry.targetId
                      ? ` #${drawerEntry.targetId}`
                      : ''}
                  </Text>
                </div>
              )}
              <div>
                <Text type="secondary">IP Address</Text>
                <br />
                <Text strong>{drawerEntry.clientIp || '—'}</Text>
              </div>
              {drawerEntry.detail && (
                <div>
                  <Text type="secondary">Detail</Text>
                  <DetailBlock>
                    {JSON.stringify(drawerEntry.detail, null, 2)}
                  </DetailBlock>
                </div>
              )}
            </Space>
          )}
        </Drawer>
      </PageContainer>
    </SettingsLayout>
  );
}
