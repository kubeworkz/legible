import { useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import { Button, Spin, Typography, Space, Modal, Input, message, Tabs } from 'antd';
import ArrowLeftOutlined from '@ant-design/icons/ArrowLeftOutlined';
import HistoryOutlined from '@ant-design/icons/HistoryOutlined';
import SiderLayout from '@/components/layouts/SiderLayout';
import PageLayout from '@/components/layouts/PageLayout';
import {
  useWorkflowQuery,
  useUpdateWorkflowMutation,
} from '@/apollo/client/graphql/workflows.generated';
import {
  useNodeTypeDefinitionsQuery,
  useExecuteWorkflowMutation,
  useWorkflowExecutionsQuery,
  useWorkflowExecutionStepsQuery,
  WorkflowExecutionFieldsFragment,
} from '@/apollo/client/graphql/workflowExecutions.generated';
import { Path } from '@/utils/enum';

const { Title, Text } = Typography;
const { TextArea } = Input;

// Dynamic import to avoid SSR issues with React Flow
const WorkflowCanvas = dynamic(
  () => import('@/components/agent-builder/WorkflowCanvas'),
  { ssr: false, loading: () => <Spin style={{ marginTop: 100 }} /> },
);

const STATUS_COLORS: Record<string, string> = {
  pending: '#d9d9d9',
  running: '#1890ff',
  completed: '#52c41a',
  failed: '#ff4d4f',
  cancelled: '#faad14',
};

export default function WorkflowCanvasPage() {
  const router = useRouter();
  const workflowId = Number(router.query.workflowId);
  const projectId = router.query.projectId as string;
  const [inputModalOpen, setInputModalOpen] = useState(false);
  const [executionInput, setExecutionInput] = useState('{}');
  const [selectedExecution, setSelectedExecution] =
    useState<WorkflowExecutionFieldsFragment | null>(null);
  const [activeTab, setActiveTab] = useState('canvas');

  const { data: workflowData, loading: workflowLoading } = useWorkflowQuery({
    variables: { where: { id: workflowId } },
    skip: !workflowId,
  });

  const { data: nodeTypesData } = useNodeTypeDefinitionsQuery();

  const [updateWorkflow, { loading: saving }] = useUpdateWorkflowMutation({
    refetchQueries: ['Workflow'],
  });

  const [executeWorkflow, { loading: executing }] = useExecuteWorkflowMutation({
    refetchQueries: ['WorkflowExecutions'],
  });

  const { data: executionsData } = useWorkflowExecutionsQuery({
    variables: { workflowId },
    skip: !workflowId,
    pollInterval: selectedExecution?.status === 'running' ? 2000 : 0,
  });

  const { data: stepsData } = useWorkflowExecutionStepsQuery({
    variables: { executionId: selectedExecution?.id || 0 },
    skip: !selectedExecution,
    pollInterval: selectedExecution?.status === 'running' ? 2000 : 0,
  });

  const workflow = workflowData?.workflow;
  const nodeTypeDefs = nodeTypesData?.nodeTypeDefinitions || [];

  const initialGraph = useMemo(() => {
    if (!workflow?.graph) return { nodes: [], edges: [] };
    const g = workflow.graph as any;
    return {
      nodes: g.nodes || [],
      edges: g.edges || [],
    };
  }, [workflow]);

  const executionSteps = useMemo(() => {
    if (!stepsData?.workflowExecutionSteps) return undefined;
    return stepsData.workflowExecutionSteps.map((s) => ({
      nodeId: s.nodeId,
      status: s.status,
      output: s.output,
      error: s.error || undefined,
    }));
  }, [stepsData]);

  const handleSave = async (graph: any) => {
    try {
      await updateWorkflow({
        variables: {
          where: { id: workflowId },
          data: { graph },
        },
      });
      message.success('Workflow saved');
    } catch (e: any) {
      message.error(e.message);
    }
  };

  const handleExecute = () => {
    setInputModalOpen(true);
  };

  const handleRunExecution = async () => {
    try {
      const input = JSON.parse(executionInput);
      const result = await executeWorkflow({
        variables: { data: { workflowId, input } },
      });
      setInputModalOpen(false);
      if (result.data?.executeWorkflow) {
        setSelectedExecution(result.data.executeWorkflow);
        message.success('Workflow execution started');
      }
    } catch (e: any) {
      message.error(e.message);
    }
  };

  const goBack = () => {
    router.push(
      Path.AgentBuilderWorkflows.replace('[projectId]', projectId),
    );
  };

  if (workflowLoading) {
    return (
      <SiderLayout>
        <PageLayout title="Loading Workflow...">
          <Spin style={{ marginTop: 100 }} />
        </PageLayout>
      </SiderLayout>
    );
  }

  return (
    <SiderLayout>
      <PageLayout title={workflow?.name || 'Workflow Canvas'}>
        <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 12,
            }}
          >
            <Space>
              <Button
                icon={<ArrowLeftOutlined />}
                size="small"
                onClick={goBack}
              />
              <Title level={4} style={{ margin: 0 }}>
                {workflow?.name || 'Workflow'}
              </Title>
            </Space>
          </div>

          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            size="small"
            items={[
              {
                key: 'canvas',
                label: 'Canvas',
                children: (
                  <div style={{ flex: 1, minHeight: 500 }}>
                    <WorkflowCanvas
                      initialGraph={initialGraph}
                      nodeTypeDefs={nodeTypeDefs}
                      executionSteps={executionSteps}
                      onSave={handleSave}
                      onExecute={handleExecute}
                      saving={saving}
                      executing={executing}
                    />
                  </div>
                ),
              },
              {
                key: 'history',
                label: (
                  <Space>
                    <HistoryOutlined />
                    Execution History
                  </Space>
                ),
                children: (
                  <ExecutionHistoryPanel
                    executions={executionsData?.workflowExecutions || []}
                    selected={selectedExecution}
                    onSelect={setSelectedExecution}
                    steps={stepsData?.workflowExecutionSteps || []}
                  />
                ),
              },
            ]}
          />
        </div>

        {/* Input modal for execution */}
        <Modal
          title="Run Workflow"
          open={inputModalOpen}
          onCancel={() => setInputModalOpen(false)}
          onOk={handleRunExecution}
          okText="Run"
          confirmLoading={executing}
        >
          <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
            Provide JSON input for the workflow:
          </Text>
          <TextArea
            rows={6}
            value={executionInput}
            onChange={(e) => setExecutionInput(e.target.value)}
            style={{ fontFamily: 'monospace' }}
          />
        </Modal>
      </PageLayout>
    </SiderLayout>
  );
}

// ─── Execution History Panel ───────────────────────────────

interface ExecutionHistoryPanelProps {
  executions: WorkflowExecutionFieldsFragment[];
  selected: WorkflowExecutionFieldsFragment | null;
  onSelect: (exec: WorkflowExecutionFieldsFragment) => void;
  steps: Array<{
    id: number;
    nodeId: string;
    nodeType: string;
    status: string;
    input: any;
    output: any;
    error: string | null;
    durationMs: number | null;
    startedAt: string | null;
    completedAt: string | null;
  }>;
}

function ExecutionHistoryPanel({
  executions,
  selected,
  onSelect,
  steps,
}: ExecutionHistoryPanelProps) {
  return (
    <div style={{ display: 'flex', gap: 16, minHeight: 400 }}>
      {/* Execution list */}
      <div style={{ width: 320, borderRight: '1px solid #f0f0f0', paddingRight: 16 }}>
        <Text strong style={{ display: 'block', marginBottom: 8 }}>
          Runs ({executions.length})
        </Text>
        {executions.map((exec) => (
          <div
            key={exec.id}
            onClick={() => onSelect(exec)}
            style={{
              padding: '8px 12px',
              borderRadius: 6,
              marginBottom: 4,
              cursor: 'pointer',
              background: selected?.id === exec.id ? '#e6f7ff' : '#fafafa',
              border: selected?.id === exec.id ? '1px solid #91d5ff' : '1px solid #f0f0f0',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Text strong style={{ fontSize: 12 }}>
                Run #{exec.id}
              </Text>
              <span
                style={{
                  fontSize: 11,
                  color: STATUS_COLORS[exec.status] || '#666',
                  fontWeight: 600,
                }}
              >
                {exec.status}
              </span>
            </div>
            <Text type="secondary" style={{ fontSize: 11 }}>
              {new Date(exec.createdAt).toLocaleString()}
              {exec.durationMs != null && ` · ${exec.durationMs}ms`}
            </Text>
          </div>
        ))}
        {executions.length === 0 && (
          <Text type="secondary">No executions yet</Text>
        )}
      </div>

      {/* Step details */}
      <div style={{ flex: 1 }}>
        {selected ? (
          <>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>
              Steps for Run #{selected.id}
            </Text>
            {steps.map((step) => (
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
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Space>
                    <Text strong style={{ fontSize: 12 }}>
                      {step.nodeId}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      ({step.nodeType})
                    </Text>
                  </Space>
                  <span
                    style={{
                      fontSize: 11,
                      color: STATUS_COLORS[step.status] || '#666',
                      fontWeight: 600,
                    }}
                  >
                    {step.status}
                  </span>
                </div>
                {step.error && (
                  <Text type="danger" style={{ fontSize: 11, display: 'block' }}>
                    Error: {step.error}
                  </Text>
                )}
                {step.output && (
                  <pre
                    style={{
                      fontSize: 11,
                      background: '#f5f5f5',
                      padding: 4,
                      borderRadius: 4,
                      maxHeight: 100,
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
            ))}
            {steps.length === 0 && (
              <Text type="secondary">No steps recorded</Text>
            )}
          </>
        ) : (
          <Text type="secondary">Select an execution to view details</Text>
        )}
      </div>
    </div>
  );
}
