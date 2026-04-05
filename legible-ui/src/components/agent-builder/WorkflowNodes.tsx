/**
 * Custom React Flow node components for the workflow canvas.
 * Each node type renders with its own color, icon, ports, and config preview.
 */
import React, { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Tag, Typography, Tooltip } from 'antd';
import ThunderboltOutlined from '@ant-design/icons/ThunderboltOutlined';
import RobotOutlined from '@ant-design/icons/RobotOutlined';
import ToolOutlined from '@ant-design/icons/ToolOutlined';
import BranchesOutlined from '@ant-design/icons/BranchesOutlined';
import CodeOutlined from '@ant-design/icons/CodeOutlined';
import ExportOutlined from '@ant-design/icons/ExportOutlined';

const { Text } = Typography;

// ─── Shared Styles ─────────────────────────────────────────

const nodeBase: React.CSSProperties = {
  padding: '12px 16px',
  borderRadius: 8,
  border: '2px solid',
  minWidth: 180,
  maxWidth: 260,
  background: '#fff',
  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  marginBottom: 6,
};

const labelStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
};

const previewStyle: React.CSSProperties = {
  fontSize: 11,
  color: '#666',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

// ─── Status indicator ──────────────────────────────────────

interface ExecutionStatus {
  status?: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
}

const statusColors: Record<string, string> = {
  pending: '#d9d9d9',
  running: '#1890ff',
  completed: '#52c41a',
  failed: '#ff4d4f',
  skipped: '#faad14',
};

function StatusDot({ status }: { status?: string }) {
  if (!status) return null;
  return (
    <Tooltip title={status}>
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: statusColors[status] || '#d9d9d9',
          display: 'inline-block',
          marginLeft: 'auto',
        }}
      />
    </Tooltip>
  );
}

// ─── Trigger Node ──────────────────────────────────────────

export const TriggerNode = memo(({ data }: NodeProps) => {
  const execStatus = (data as any)?.executionStatus as ExecutionStatus | undefined;
  return (
    <div style={{ ...nodeBase, borderColor: '#52c41a' }}>
      <div style={headerStyle}>
        <ThunderboltOutlined style={{ color: '#52c41a', fontSize: 16 }} />
        <span style={labelStyle}>{(data as any).label || 'Trigger'}</span>
        <StatusDot status={execStatus?.status} />
      </div>
      <Text style={previewStyle}>Workflow entry point</Text>
      <Handle type="source" position={Position.Bottom} id="output" />
    </div>
  );
});
TriggerNode.displayName = 'TriggerNode';

// ─── LLM Node ──────────────────────────────────────────────

export const LLMNode = memo(({ data }: NodeProps) => {
  const d = data as any;
  const execStatus = d?.executionStatus as ExecutionStatus | undefined;
  return (
    <div style={{ ...nodeBase, borderColor: '#722ed1' }}>
      <Handle type="target" position={Position.Top} id="input" />
      <div style={headerStyle}>
        <RobotOutlined style={{ color: '#722ed1', fontSize: 16 }} />
        <span style={labelStyle}>{d.label || 'LLM'}</span>
        <StatusDot status={execStatus?.status} />
      </div>
      {d.promptTemplateName && (
        <Tag color="purple" style={{ fontSize: 11 }}>
          {d.promptTemplateName}
        </Tag>
      )}
      {d.model && <Text style={previewStyle}>Model: {d.model}</Text>}
      <Handle type="source" position={Position.Bottom} id="output" />
    </div>
  );
});
LLMNode.displayName = 'LLMNode';

// ─── Tool Node ─────────────────────────────────────────────

export const ToolNode = memo(({ data }: NodeProps) => {
  const d = data as any;
  const execStatus = d?.executionStatus as ExecutionStatus | undefined;
  return (
    <div style={{ ...nodeBase, borderColor: '#1890ff' }}>
      <Handle type="target" position={Position.Top} id="input" />
      <div style={headerStyle}>
        <ToolOutlined style={{ color: '#1890ff', fontSize: 16 }} />
        <span style={labelStyle}>{d.label || 'Tool'}</span>
        <StatusDot status={execStatus?.status} />
      </div>
      {d.toolName && (
        <Tag color="blue" style={{ fontSize: 11 }}>
          {d.toolName}
        </Tag>
      )}
      <Handle type="source" position={Position.Bottom} id="output" />
    </div>
  );
});
ToolNode.displayName = 'ToolNode';

// ─── Condition Node ────────────────────────────────────────

export const ConditionNode = memo(({ data }: NodeProps) => {
  const d = data as any;
  const execStatus = d?.executionStatus as ExecutionStatus | undefined;
  return (
    <div style={{ ...nodeBase, borderColor: '#fa8c16' }}>
      <Handle type="target" position={Position.Top} id="input" />
      <div style={headerStyle}>
        <BranchesOutlined style={{ color: '#fa8c16', fontSize: 16 }} />
        <span style={labelStyle}>{d.label || 'Condition'}</span>
        <StatusDot status={execStatus?.status} />
      </div>
      {d.expression && (
        <Text style={previewStyle} title={d.expression}>
          {d.expression}
        </Text>
      )}
      <Handle
        type="source"
        position={Position.Bottom}
        id="true"
        style={{ left: '30%' }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="false"
        style={{ left: '70%' }}
      />
    </div>
  );
});
ConditionNode.displayName = 'ConditionNode';

// ─── Code Node ─────────────────────────────────────────────

export const CodeNode = memo(({ data }: NodeProps) => {
  const d = data as any;
  const execStatus = d?.executionStatus as ExecutionStatus | undefined;
  return (
    <div style={{ ...nodeBase, borderColor: '#13c2c2' }}>
      <Handle type="target" position={Position.Top} id="input" />
      <div style={headerStyle}>
        <CodeOutlined style={{ color: '#13c2c2', fontSize: 16 }} />
        <span style={labelStyle}>{d.label || 'Code'}</span>
        <StatusDot status={execStatus?.status} />
      </div>
      {d.code && (
        <Text
          style={{ ...previewStyle, fontFamily: 'monospace' }}
          title={d.code}
        >
          {d.code.substring(0, 60)}
          {d.code.length > 60 ? '…' : ''}
        </Text>
      )}
      <Handle type="source" position={Position.Bottom} id="output" />
    </div>
  );
});
CodeNode.displayName = 'CodeNode';

// ─── Output Node ───────────────────────────────────────────

export const OutputNode = memo(({ data }: NodeProps) => {
  const execStatus = (data as any)?.executionStatus as ExecutionStatus | undefined;
  return (
    <div style={{ ...nodeBase, borderColor: '#f5222d' }}>
      <Handle type="target" position={Position.Top} id="input" />
      <div style={headerStyle}>
        <ExportOutlined style={{ color: '#f5222d', fontSize: 16 }} />
        <span style={labelStyle}>{(data as any).label || 'Output'}</span>
        <StatusDot status={execStatus?.status} />
      </div>
      <Text style={previewStyle}>Workflow result</Text>
    </div>
  );
});
OutputNode.displayName = 'OutputNode';

// ─── Node type map for ReactFlow ───────────────────────────

export const workflowNodeTypes = {
  trigger: TriggerNode,
  llm: LLMNode,
  tool: ToolNode,
  condition: ConditionNode,
  code: CodeNode,
  output: OutputNode,
};
