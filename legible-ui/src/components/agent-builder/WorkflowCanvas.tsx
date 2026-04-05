/**
 * WorkflowCanvas — visual workflow editor built with React Flow.
 * Supports drag-and-drop node placement, edge connections,
 * node config editing, and execution status overlay.
 */
import React, { useCallback, useMemo, useState, useRef } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Edge,
  type Node,
  BackgroundVariant,
  Panel,
  ReactFlowProvider,
} from '@xyflow/react';
// @ts-ignore - CSS side-effect import
import '@xyflow/react/dist/style.css';
import {
  Button,
  Card,
  Drawer,
  Form,
  Input,
  Select,
  InputNumber,
  Space,
  Typography,
  Tag,
  Divider,
  message,
} from 'antd';
import PlusOutlined from '@ant-design/icons/PlusOutlined';
import PlayCircleOutlined from '@ant-design/icons/PlayCircleOutlined';
import SaveOutlined from '@ant-design/icons/SaveOutlined';
import { workflowNodeTypes } from './WorkflowNodes';
import type { NodeTypeDefinitionFieldsFragment } from '@/apollo/client/graphql/workflowExecutions.generated';

const { Text, Title } = Typography;
const { TextArea } = Input;

// ─── Node palette ──────────────────────────────────────────

interface NodePaletteProps {
  nodeTypes: NodeTypeDefinitionFieldsFragment[];
  onAddNode: (type: string) => void;
}

function NodePalette({ nodeTypes, onAddNode }: NodePaletteProps) {
  return (
    <Card
      size="small"
      title="Node Types"
      style={{ width: 200 }}
      bodyStyle={{ padding: '8px 12px' }}
    >
      {nodeTypes.map((nt) => (
        <Button
          key={nt.type}
          size="small"
          block
          style={{
            marginBottom: 4,
            borderColor: nt.color,
            color: nt.color,
            textAlign: 'left',
          }}
          onClick={() => onAddNode(nt.type)}
        >
          {nt.label}
        </Button>
      ))}
    </Card>
  );
}

// ─── Node config drawer ────────────────────────────────────

interface NodeConfigDrawerProps {
  node: Node | null;
  nodeTypeDefs: NodeTypeDefinitionFieldsFragment[];
  onClose: () => void;
  onSave: (nodeId: string, data: Record<string, any>) => void;
  onDelete: (nodeId: string) => void;
}

function NodeConfigDrawer({
  node,
  nodeTypeDefs,
  onClose,
  onSave,
  onDelete,
}: NodeConfigDrawerProps) {
  const [form] = Form.useForm();

  const typeDef = useMemo(
    () => nodeTypeDefs.find((t) => t.type === node?.type),
    [node, nodeTypeDefs],
  );

  React.useEffect(() => {
    if (node) {
      form.setFieldsValue({
        label: (node.data as any)?.label || typeDef?.label || '',
        ...(node.data as any),
      });
    }
  }, [node, typeDef, form]);

  if (!node || !typeDef) return null;

  const handleSave = async () => {
    const values = await form.validateFields();
    onSave(node.id, values);
    onClose();
  };

  return (
    <Drawer
      title={
        <Space>
          <Tag color={typeDef.color}>{typeDef.label}</Tag>
          <Text>Configure Node</Text>
        </Space>
      }
      open={!!node}
      onClose={onClose}
      width={400}
      extra={
        <Space>
          <Button danger size="small" onClick={() => onDelete(node.id)}>
            Delete
          </Button>
          <Button type="primary" size="small" onClick={handleSave}>
            Save
          </Button>
        </Space>
      }
    >
      <Form form={form} layout="vertical" size="small">
        <Form.Item label="Label" name="label">
          <Input />
        </Form.Item>
        {typeDef.configFields.map((field) => (
          <Form.Item
            key={field.name}
            label={field.label}
            name={field.name}
            rules={
              field.required ? [{ required: true, message: `${field.label} is required` }] : []
            }
          >
            {field.type === 'select' && field.options ? (
              <Select>
                {field.options.map((opt) => (
                  <Select.Option key={opt.value} value={opt.value}>
                    {opt.label}
                  </Select.Option>
                ))}
              </Select>
            ) : field.type === 'number' ? (
              <InputNumber style={{ width: '100%' }} />
            ) : field.type === 'code' || field.type === 'json' ? (
              <TextArea rows={6} style={{ fontFamily: 'monospace' }} />
            ) : field.type === 'textarea' ? (
              <TextArea rows={4} />
            ) : (
              <Input />
            )}
          </Form.Item>
        ))}
      </Form>
    </Drawer>
  );
}

// ─── Main Canvas ───────────────────────────────────────────

export interface WorkflowCanvasProps {
  initialGraph?: { nodes: Node[]; edges: Edge[] };
  nodeTypeDefs: NodeTypeDefinitionFieldsFragment[];
  executionSteps?: Array<{
    nodeId: string;
    status: string;
    output?: any;
    error?: string;
  }>;
  onSave?: (graph: { nodes: Node[]; edges: Edge[] }) => void;
  onExecute?: () => void;
  saving?: boolean;
  executing?: boolean;
}

let nodeIdCounter = 0;

function WorkflowCanvasInner({
  initialGraph,
  nodeTypeDefs,
  executionSteps,
  onSave,
  onExecute,
  saving,
  executing,
}: WorkflowCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(
    initialGraph?.nodes || [],
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    initialGraph?.edges || [],
  );
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  // Merge execution status into node data
  const displayNodes = useMemo(() => {
    if (!executionSteps || executionSteps.length === 0) return nodes;
    const statusMap = new Map(executionSteps.map((s) => [s.nodeId, s]));
    return nodes.map((n) => {
      const step = statusMap.get(n.id);
      if (!step) return n;
      return {
        ...n,
        data: {
          ...n.data,
          executionStatus: {
            status: step.status,
            output: step.output,
            error: step.error,
          },
        },
      };
    });
  }, [nodes, executionSteps]);

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => addEdge(connection, eds));
    },
    [setEdges],
  );

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      setSelectedNode(node);
    },
    [],
  );

  const handleAddNode = useCallback(
    (type: string) => {
      const typeDef = nodeTypeDefs.find((t) => t.type === type);
      if (!typeDef) return;

      // Check maxInstances constraint
      if (typeDef.maxInstances) {
        const existing = nodes.filter((n) => n.type === type);
        if (existing.length >= typeDef.maxInstances) {
          message.warning(
            `Maximum ${typeDef.maxInstances} ${typeDef.label} node(s) allowed`,
          );
          return;
        }
      }

      nodeIdCounter++;
      const newNode: Node = {
        id: `${type}_${nodeIdCounter}_${Date.now()}`,
        type,
        position: { x: 250 + Math.random() * 100, y: 100 + nodes.length * 120 },
        data: { label: typeDef.label },
      };
      setNodes((nds) => [...nds, newNode]);
    },
    [nodeTypeDefs, nodes, setNodes],
  );

  const handleNodeConfigSave = useCallback(
    (nodeId: string, data: Record<string, any>) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n,
        ),
      );
      setSelectedNode(null);
    },
    [setNodes],
  );

  const handleNodeDelete = useCallback(
    (nodeId: string) => {
      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      setEdges((eds) =>
        eds.filter((e) => e.source !== nodeId && e.target !== nodeId),
      );
      setSelectedNode(null);
    },
    [setNodes, setEdges],
  );

  const handleSave = useCallback(() => {
    onSave?.({ nodes, edges });
  }, [nodes, edges, onSave]);

  return (
    <div ref={reactFlowWrapper} style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={displayNodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        nodeTypes={workflowNodeTypes}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            const typeDef = nodeTypeDefs.find((t) => t.type === node.type);
            return typeDef?.color || '#eee';
          }}
          style={{ height: 100 }}
        />
        <Panel position="top-left">
          <NodePalette nodeTypes={nodeTypeDefs} onAddNode={handleAddNode} />
        </Panel>
        <Panel position="top-right">
          <Space>
            {onExecute && (
              <Button
                type="primary"
                icon={<PlayCircleOutlined />}
                onClick={onExecute}
                loading={executing}
              >
                Run
              </Button>
            )}
            {onSave && (
              <Button
                icon={<SaveOutlined />}
                onClick={handleSave}
                loading={saving}
              >
                Save
              </Button>
            )}
          </Space>
        </Panel>
      </ReactFlow>
      <NodeConfigDrawer
        node={selectedNode}
        nodeTypeDefs={nodeTypeDefs}
        onClose={() => setSelectedNode(null)}
        onSave={handleNodeConfigSave}
        onDelete={handleNodeDelete}
      />
    </div>
  );
}

export default function WorkflowCanvas(props: WorkflowCanvasProps) {
  return (
    <ReactFlowProvider>
      <WorkflowCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
