/**
 * VariableMapper — visual variable binding between upstream node outputs
 * and the current node's expected input fields.
 *
 * Replaces raw JSON editing of variableMapping / parameterMapping / outputMapping
 * with a row-based UI: each row maps a source path (from upstream output) to a target field.
 */
import React, { useMemo } from 'react';
import { Select, Button, Typography, Space, Tag, Tooltip } from 'antd';
import PlusOutlined from '@ant-design/icons/PlusOutlined';
import DeleteOutlined from '@ant-design/icons/DeleteOutlined';
import ArrowRightOutlined from '@ant-design/icons/ArrowRightOutlined';
import type { Edge, Node } from '@xyflow/react';
import type { NodeTypeDefinitionFieldsFragment } from '@/apollo/client/graphql/workflowExecutions.generated';

const { Text } = Typography;

// ─── Known output fields per node type ─────────────────────

const NODE_OUTPUT_FIELDS: Record<string, string[]> = {
  trigger: ['*'], // dynamic — user-defined input variables
  llm: [
    'response',
    'model',
    'renderedSystemPrompt',
    'renderedUserPrompt',
    'temperature',
    'usage.promptTokens',
    'usage.completionTokens',
    'usage.totalTokens',
    'finishReason',
  ],
  tool: [
    'toolId',
    'toolName',
    'source',
    'response',
    'response.data',
    'response.statusCode',
    'durationMs',
  ],
  condition: ['result', 'branch', 'input'],
  code: ['*'], // dynamic — depends on the code
  output: [],
};

// ─── Types ─────────────────────────────────────────────────

export interface MappingRow {
  target: string;
  source: string; // format: "nodeId.fieldPath"
}

interface VariableMapperProps {
  /** Current mapping value (target→source object) */
  value?: Record<string, string>;
  /** Callback when mapping changes */
  onChange?: (value: Record<string, string>) => void;
  /** Current node being configured */
  currentNodeId: string;
  /** All nodes in the graph */
  nodes: Node[];
  /** All edges in the graph */
  edges: Edge[];
  /** Node type definitions for output schema info */
  nodeTypeDefs: NodeTypeDefinitionFieldsFragment[];
  /** Optional list of known target field names (e.g., prompt template variables) */
  targetFields?: string[];
  /** Label for the source column */
  sourceLabel?: string;
  /** Label for the target column */
  targetLabel?: string;
}

// ─── Component ─────────────────────────────────────────────

export default function VariableMapper({
  value = {},
  onChange,
  currentNodeId,
  nodes,
  edges,
  nodeTypeDefs,
  targetFields,
  sourceLabel = 'Source (upstream output)',
  targetLabel = 'Target field',
}: VariableMapperProps) {
  // Find all upstream nodes connected to the current node
  const upstreamNodes = useMemo(() => {
    const upstream: Array<{ node: Node; handleId?: string }> = [];
    const visited = new Set<string>();
    const queue: string[] = [];

    // Direct parents via edges
    for (const edge of edges) {
      if (edge.target === currentNodeId && !visited.has(edge.source)) {
        visited.add(edge.source);
        queue.push(edge.source);
        const node = nodes.find((n) => n.id === edge.source);
        if (node) upstream.push({ node, handleId: edge.sourceHandle || undefined });
      }
    }

    // Transitive upstream (grandparents, etc.)
    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      for (const edge of edges) {
        if (edge.target === nodeId && !visited.has(edge.source)) {
          visited.add(edge.source);
          queue.push(edge.source);
          const node = nodes.find((n) => n.id === edge.source);
          if (node) upstream.push({ node, handleId: edge.sourceHandle || undefined });
        }
      }
    }

    return upstream;
  }, [currentNodeId, nodes, edges]);

  // Build available source options grouped by upstream node
  const sourceOptions = useMemo(() => {
    const options: Array<{
      label: string;
      options: Array<{ label: string; value: string }>;
    }> = [];

    for (const { node } of upstreamNodes) {
      const nodeLabel = (node.data as any)?.label || node.type || node.id;
      const nodeType = node.type || '';
      const typeDef = nodeTypeDefs.find((t) => t.type === nodeType);
      const color = typeDef?.color || '#999';

      // Get known output fields for this node type
      const outputFields = NODE_OUTPUT_FIELDS[nodeType] || ['*'];

      const groupOptions: Array<{ label: string; value: string }> = [];

      if (outputFields.includes('*')) {
        // Dynamic output — allow typing custom paths
        groupOptions.push({
          label: `${nodeLabel} → (entire output)`,
          value: `${node.id}`,
        });
        // Also suggest common nested paths
        groupOptions.push({
          label: `${nodeLabel} → (custom path...)`,
          value: `${node.id}.`,
        });
      } else {
        for (const field of outputFields) {
          groupOptions.push({
            label: `${nodeLabel} → ${field}`,
            value: `${node.id}.${field}`,
          });
        }
      }

      // Also add a "whole output" option
      if (!outputFields.includes('*')) {
        groupOptions.unshift({
          label: `${nodeLabel} → (entire output)`,
          value: `${node.id}`,
        });
      }

      options.push({
        label: nodeLabel,
        options: groupOptions,
      });
    }

    return options;
  }, [upstreamNodes, nodeTypeDefs]);

  // Convert value object to rows
  const rows: MappingRow[] = useMemo(() => {
    return Object.entries(value).map(([target, source]) => ({
      target,
      source: source as string,
    }));
  }, [value]);

  const updateRow = (index: number, field: 'target' | 'source', newVal: string) => {
    const newRows = [...rows];
    newRows[index] = { ...newRows[index], [field]: newVal };
    emitChange(newRows);
  };

  const addRow = () => {
    const newRows = [...rows, { target: '', source: '' }];
    emitChange(newRows);
  };

  const removeRow = (index: number) => {
    const newRows = rows.filter((_, i) => i !== index);
    emitChange(newRows);
  };

  const emitChange = (newRows: MappingRow[]) => {
    const obj: Record<string, string> = {};
    for (const row of newRows) {
      if (row.target) {
        obj[row.target] = row.source;
      }
    }
    onChange?.(obj);
  };

  const hasUpstream = upstreamNodes.length > 0;

  return (
    <div style={{ marginBottom: 8 }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          marginBottom: 6,
          fontSize: 11,
          color: '#999',
          fontWeight: 600,
          textTransform: 'uppercase',
        }}
      >
        <div style={{ flex: 1 }}>{targetLabel}</div>
        <div style={{ width: 20 }} />
        <div style={{ flex: 2 }}>{sourceLabel}</div>
        <div style={{ width: 24 }} />
      </div>

      {/* Mapping rows */}
      {rows.map((row, index) => (
        <div
          key={index}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 8,
          }}
        >
          {/* Target field */}
          {targetFields && targetFields.length > 0 ? (
            <Select
              size="small"
              style={{ flex: 1 }}
              value={row.target || undefined}
              placeholder="Select field"
              onChange={(val) => updateRow(index, 'target', val)}
              showSearch
              optionFilterProp="children"
            >
              {targetFields.map((f) => (
                <Select.Option key={f} value={f}>
                  {f}
                </Select.Option>
              ))}
            </Select>
          ) : (
            <Select
              size="small"
              style={{ flex: 1 }}
              value={row.target || undefined}
              placeholder="Field name"
              onChange={(val) => updateRow(index, 'target', val)}
              mode="tags"
              maxCount={1}
            />
          )}

          {/* Arrow icon */}
          <ArrowRightOutlined style={{ color: '#bbb', fontSize: 12 }} />

          {/* Source selector */}
          {hasUpstream ? (
            <Select
              size="small"
              style={{ flex: 2 }}
              value={row.source || undefined}
              placeholder="Select source"
              onChange={(val) => updateRow(index, 'source', val)}
              showSearch
              optionFilterProp="label"
              options={sourceOptions}
              allowClear
            />
          ) : (
            <Select
              size="small"
              style={{ flex: 2 }}
              value={row.source || undefined}
              placeholder="No upstream nodes"
              disabled
            />
          )}

          {/* Remove button */}
          <Button
            type="text"
            size="small"
            icon={<DeleteOutlined />}
            onClick={() => removeRow(index)}
            style={{ color: '#ff4d4f' }}
          />
        </div>
      ))}

      {/* Add mapping button */}
      <Button
        type="dashed"
        size="small"
        icon={<PlusOutlined />}
        onClick={addRow}
        block
        style={{ marginTop: 4 }}
      >
        Add mapping
      </Button>

      {/* Helper info */}
      {!hasUpstream && rows.length === 0 && (
        <Text
          type="secondary"
          style={{ fontSize: 11, display: 'block', marginTop: 8 }}
        >
          Connect an upstream node first to map its outputs here.
        </Text>
      )}
    </div>
  );
}
