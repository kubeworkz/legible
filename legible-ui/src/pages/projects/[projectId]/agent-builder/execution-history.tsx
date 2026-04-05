import { useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import {
  Table,
  Tag,
  Input,
  Space,
  Typography,
  Button,
  Drawer,
} from 'antd';
import type { TableColumnsType } from 'antd';
import HistoryOutlined from '@ant-design/icons/HistoryOutlined';
import EyeOutlined from '@ant-design/icons/EyeOutlined';
import SiderLayout from '@/components/layouts/SiderLayout';
import PageLayout from '@/components/layouts/PageLayout';
import {
  useWorkflowExecutionsQuery,
  useWorkflowExecutionStepsQuery,
  WorkflowExecutionFieldsFragment,
  WorkflowExecutionStepFieldsFragment,
} from '@/apollo/client/graphql/workflowExecutions.generated';
import { useWorkflowsQuery } from '@/apollo/client/graphql/workflows.generated';

const { Text, Title } = Typography;

const STATUS_COLORS: Record<string, string> = {
  pending: 'default',
  running: 'processing',
  completed: 'success',
  failed: 'error',
  cancelled: 'warning',
  skipped: 'warning',
};

export default function ExecutionHistoryPage() {
  const router = useRouter();
  const [searchText, setSearchText] = useState('');
  const [selectedExec, setSelectedExec] =
    useState<WorkflowExecutionFieldsFragment | null>(null);

  const { data: workflowsData } = useWorkflowsQuery({
    fetchPolicy: 'cache-and-network',
  });

  // Get first workflow for now; in the future, allow filtering by workflow
  const workflows = workflowsData?.workflows || [];
  const firstWorkflowId = workflows[0]?.id;

  const { data: execsData, loading } = useWorkflowExecutionsQuery({
    variables: { workflowId: firstWorkflowId || 0 },
    skip: !firstWorkflowId,
    pollInterval: 5000,
  });

  const { data: stepsData } = useWorkflowExecutionStepsQuery({
    variables: { executionId: selectedExec?.id || 0 },
    skip: !selectedExec,
  });

  const workflowNameMap = useMemo(() => {
    const m = new Map<number, string>();
    workflows.forEach((w) => m.set(w.id, w.name));
    return m;
  }, [workflows]);

  const executions = useMemo(() => {
    const list = execsData?.workflowExecutions ?? [];
    if (!searchText) return list;
    const lower = searchText.toLowerCase();
    return list.filter(
      (e) =>
        e.status.toLowerCase().includes(lower) ||
        String(e.id).includes(lower) ||
        workflowNameMap.get(e.workflowId)?.toLowerCase().includes(lower),
    );
  }, [execsData, searchText, workflowNameMap]);

  const columns: TableColumnsType<WorkflowExecutionFieldsFragment> = [
    {
      title: 'ID',
      dataIndex: 'id',
      width: 60,
    },
    {
      title: 'Workflow',
      dataIndex: 'workflowId',
      render: (id: number) => workflowNameMap.get(id) || `#${id}`,
    },
    {
      title: 'Version',
      dataIndex: 'workflowVersion',
      width: 80,
      render: (v: number | null) => (v != null ? `v${v}` : '-'),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 100,
      render: (status: string) => (
        <Tag color={STATUS_COLORS[status] || 'default'}>{status}</Tag>
      ),
    },
    {
      title: 'Duration',
      dataIndex: 'durationMs',
      width: 100,
      render: (ms: number | null) => (ms != null ? `${ms}ms` : '-'),
    },
    {
      title: 'Started',
      dataIndex: 'startedAt',
      width: 170,
      render: (v: string | null) =>
        v ? new Date(v).toLocaleString() : '-',
    },
    {
      title: 'Actions',
      width: 80,
      render: (_, record) => (
        <Button
          type="link"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => setSelectedExec(record)}
        >
          Details
        </Button>
      ),
    },
  ];

  return (
    <SiderLayout>
      <PageLayout title="Execution History">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: 16,
          }}
        >
          <Space>
            <HistoryOutlined style={{ fontSize: 20 }} />
            <Title level={4} style={{ margin: 0 }}>
              Execution History
            </Title>
          </Space>
          <Input.Search
            placeholder="Search executions..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 260 }}
            allowClear
          />
        </div>

        <Table
          columns={columns}
          dataSource={executions}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 20 }}
          size="small"
        />

        {/* Step details drawer */}
        <Drawer
          title={`Execution #${selectedExec?.id} Details`}
          open={!!selectedExec}
          onClose={() => setSelectedExec(null)}
          width={520}
        >
          {selectedExec && (
            <>
              <Space
                direction="vertical"
                style={{ width: '100%', marginBottom: 16 }}
              >
                <div>
                  <Text type="secondary">Status: </Text>
                  <Tag color={STATUS_COLORS[selectedExec.status]}>
                    {selectedExec.status}
                  </Tag>
                </div>
                {selectedExec.error && (
                  <div>
                    <Text type="secondary">Error: </Text>
                    <Text type="danger">{selectedExec.error}</Text>
                  </div>
                )}
                {selectedExec.durationMs != null && (
                  <div>
                    <Text type="secondary">Duration: </Text>
                    <Text>{selectedExec.durationMs}ms</Text>
                  </div>
                )}
                {selectedExec.input && (
                  <div>
                    <Text type="secondary">Input:</Text>
                    <pre
                      style={{
                        fontSize: 11,
                        background: '#f5f5f5',
                        padding: 8,
                        borderRadius: 4,
                        maxHeight: 120,
                        overflow: 'auto',
                      }}
                    >
                      {JSON.stringify(selectedExec.input, null, 2)}
                    </pre>
                  </div>
                )}
                {selectedExec.output && (
                  <div>
                    <Text type="secondary">Output:</Text>
                    <pre
                      style={{
                        fontSize: 11,
                        background: '#f5f5f5',
                        padding: 8,
                        borderRadius: 4,
                        maxHeight: 120,
                        overflow: 'auto',
                      }}
                    >
                      {JSON.stringify(selectedExec.output, null, 2)}
                    </pre>
                  </div>
                )}
              </Space>

              <Title level={5}>Steps</Title>
              {(stepsData?.workflowExecutionSteps || []).map(
                (step: WorkflowExecutionStepFieldsFragment) => (
                  <div
                    key={step.id}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 6,
                      marginBottom: 6,
                      background: '#fafafa',
                      border: '1px solid #f0f0f0',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: 4,
                      }}
                    >
                      <Space>
                        <Text strong style={{ fontSize: 12 }}>
                          {step.nodeId}
                        </Text>
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          ({step.nodeType})
                        </Text>
                      </Space>
                      <Tag
                        color={STATUS_COLORS[step.status] || 'default'}
                        style={{ fontSize: 11 }}
                      >
                        {step.status}
                      </Tag>
                    </div>
                    {step.error && (
                      <Text
                        type="danger"
                        style={{ fontSize: 11, display: 'block' }}
                      >
                        {step.error}
                      </Text>
                    )}
                    {step.output && (
                      <pre
                        style={{
                          fontSize: 11,
                          background: '#f5f5f5',
                          padding: 4,
                          borderRadius: 4,
                          maxHeight: 80,
                          overflow: 'auto',
                          margin: '4px 0 0',
                        }}
                      >
                        {JSON.stringify(step.output, null, 2)}
                      </pre>
                    )}
                    {step.durationMs != null && (
                      <Text type="secondary" style={{ fontSize: 10 }}>
                        {step.durationMs}ms
                      </Text>
                    )}
                  </div>
                ),
              )}
            </>
          )}
        </Drawer>
      </PageLayout>
    </SiderLayout>
  );
}
