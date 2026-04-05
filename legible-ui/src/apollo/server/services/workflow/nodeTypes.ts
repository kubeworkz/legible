/**
 * Node Type Registry — defines the catalog of available node types
 * for the workflow builder canvas.
 *
 * Each node type has: metadata, input/output port schemas,
 * a configuration schema, and validation rules.
 */

// ─── Port types ────────────────────────────────────────────────

export interface PortDefinition {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'json' | 'any';
  description?: string;
  required?: boolean;
}

// ─── Configuration field definitions ───────────────────────────

export interface ConfigField {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'select' | 'json' | 'boolean' | 'template_ref' | 'tool_ref';
  required?: boolean;
  default?: any;
  description?: string;
  options?: Array<{ label: string; value: string }>;
}

// ─── Node type definition ──────────────────────────────────────

export interface NodeTypeDefinition {
  type: string;
  label: string;
  description: string;
  category: 'control' | 'ai' | 'tools' | 'logic' | 'code';
  color: string;
  icon: string; // ant-design icon name
  inputs: PortDefinition[];
  outputs: PortDefinition[];
  configFields: ConfigField[];
  maxInstances?: number; // e.g. trigger = 1
  validate?: (config: Record<string, any>) => string | null;
}

// ─── Built-in node types ───────────────────────────────────────

export const TRIGGER_NODE: NodeTypeDefinition = {
  type: 'trigger',
  label: 'Trigger',
  description: 'Entry point of the workflow. Receives input variables.',
  category: 'control',
  color: '#52c41a',
  icon: 'PlayCircleOutlined',
  inputs: [],
  outputs: [
    { name: 'output', type: 'json', description: 'Workflow input variables' },
  ],
  configFields: [
    {
      key: 'inputVariables',
      label: 'Input Variables',
      type: 'json',
      description: 'Define variables the workflow accepts',
      default: [],
    },
  ],
  maxInstances: 1,
};

export const LLM_NODE: NodeTypeDefinition = {
  type: 'llm',
  label: 'LLM',
  description: 'Call a language model with a prompt template.',
  category: 'ai',
  color: '#722ed1',
  icon: 'ThunderboltOutlined',
  inputs: [
    { name: 'input', type: 'any', description: 'Context data for the prompt' },
  ],
  outputs: [
    { name: 'output', type: 'string', description: 'Model response text' },
    { name: 'usage', type: 'json', description: 'Token usage metadata' },
  ],
  configFields: [
    {
      key: 'promptTemplateId',
      label: 'Prompt Template',
      type: 'template_ref',
      required: true,
      description: 'Select a prompt template to use',
    },
    {
      key: 'model',
      label: 'Model Override',
      type: 'text',
      description: 'Override the template model (optional)',
    },
    {
      key: 'temperature',
      label: 'Temperature Override',
      type: 'number',
      description: 'Override the template temperature (optional)',
    },
    {
      key: 'variableMapping',
      label: 'Variable Mapping',
      type: 'json',
      description: 'Map input fields to prompt template variables',
      default: {},
    },
  ],
  validate: (config) => {
    if (!config.promptTemplateId) return 'Prompt template is required';
    return null;
  },
};

export const TOOL_NODE: NodeTypeDefinition = {
  type: 'tool',
  label: 'Tool',
  description: 'Invoke a registered tool (MCP, API, or built-in).',
  category: 'tools',
  color: '#1890ff',
  icon: 'ApiOutlined',
  inputs: [
    { name: 'input', type: 'json', description: 'Tool input parameters' },
  ],
  outputs: [
    { name: 'output', type: 'json', description: 'Tool response' },
    { name: 'error', type: 'string', description: 'Error message if failed' },
  ],
  configFields: [
    {
      key: 'toolDefinitionId',
      label: 'Tool',
      type: 'tool_ref',
      required: true,
      description: 'Select a tool from the registry',
    },
    {
      key: 'parameterMapping',
      label: 'Parameter Mapping',
      type: 'json',
      description: 'Map input fields to tool parameters',
      default: {},
    },
    {
      key: 'timeout',
      label: 'Timeout (ms)',
      type: 'number',
      default: 30000,
      description: 'Maximum execution time in milliseconds',
    },
  ],
  validate: (config) => {
    if (!config.toolDefinitionId) return 'Tool is required';
    return null;
  },
};

export const CONDITION_NODE: NodeTypeDefinition = {
  type: 'condition',
  label: 'Condition',
  description: 'Branch the workflow based on a condition.',
  category: 'logic',
  color: '#fa8c16',
  icon: 'BranchesOutlined',
  inputs: [
    { name: 'input', type: 'any', description: 'Data to evaluate' },
  ],
  outputs: [
    { name: 'true', type: 'any', description: 'When condition is true' },
    { name: 'false', type: 'any', description: 'When condition is false' },
  ],
  configFields: [
    {
      key: 'expression',
      label: 'Condition Expression',
      type: 'text',
      required: true,
      description: 'JavaScript expression, e.g. input.score > 0.8',
    },
  ],
  validate: (config) => {
    if (!config.expression) return 'Condition expression is required';
    return null;
  },
};

export const CODE_NODE: NodeTypeDefinition = {
  type: 'code',
  label: 'Code',
  description: 'Run a JavaScript code snippet to transform data.',
  category: 'code',
  color: '#13c2c2',
  icon: 'CodeOutlined',
  inputs: [
    { name: 'input', type: 'any', description: 'Input data' },
  ],
  outputs: [
    { name: 'output', type: 'any', description: 'Transformed output' },
  ],
  configFields: [
    {
      key: 'code',
      label: 'Code',
      type: 'textarea',
      required: true,
      description: 'JavaScript function body. Use `input` variable. Return the result.',
      default: '// Access input data via `input`\nreturn input;',
    },
  ],
  validate: (config) => {
    if (!config.code) return 'Code is required';
    return null;
  },
};

export const OUTPUT_NODE: NodeTypeDefinition = {
  type: 'output',
  label: 'Output',
  description: 'Terminal node that collects the workflow result.',
  category: 'control',
  color: '#f5222d',
  icon: 'ExportOutlined',
  inputs: [
    { name: 'input', type: 'any', description: 'Final result data' },
  ],
  outputs: [],
  configFields: [
    {
      key: 'outputMapping',
      label: 'Output Mapping',
      type: 'json',
      description: 'Map input fields to workflow output variables',
      default: {},
    },
  ],
  maxInstances: 1,
};

// ─── Registry ──────────────────────────────────────────────────

const NODE_TYPES: Record<string, NodeTypeDefinition> = {
  trigger: TRIGGER_NODE,
  llm: LLM_NODE,
  tool: TOOL_NODE,
  condition: CONDITION_NODE,
  code: CODE_NODE,
  output: OUTPUT_NODE,
};

export function getNodeType(type: string): NodeTypeDefinition | undefined {
  return NODE_TYPES[type];
}

export function getAllNodeTypes(): NodeTypeDefinition[] {
  return Object.values(NODE_TYPES);
}

export function getNodeTypesByCategory(
  category: NodeTypeDefinition['category'],
): NodeTypeDefinition[] {
  return Object.values(NODE_TYPES).filter((n) => n.category === category);
}

/**
 * Validate a workflow graph against the node type registry.
 * Returns an array of validation errors (empty = valid).
 */
export function validateWorkflowGraph(
  graph: { nodes: any[]; edges: any[] },
): string[] {
  const errors: string[] = [];

  if (!graph.nodes || graph.nodes.length === 0) {
    errors.push('Workflow must have at least one node');
    return errors;
  }

  // Check required node types
  const triggerNodes = graph.nodes.filter((n: any) => n.type === 'trigger');
  const outputNodes = graph.nodes.filter((n: any) => n.type === 'output');

  if (triggerNodes.length === 0) {
    errors.push('Workflow must have a Trigger node');
  }
  if (triggerNodes.length > 1) {
    errors.push('Workflow can only have one Trigger node');
  }
  if (outputNodes.length === 0) {
    errors.push('Workflow must have an Output node');
  }
  if (outputNodes.length > 1) {
    errors.push('Workflow can only have one Output node');
  }

  // Validate each node
  const nodeIds = new Set(graph.nodes.map((n: any) => n.id));

  for (const node of graph.nodes) {
    const typeDef = getNodeType(node.type);
    if (!typeDef) {
      errors.push(`Unknown node type: ${node.type} (node ${node.id})`);
      continue;
    }

    // Run type-specific validation
    if (typeDef.validate) {
      const err = typeDef.validate(node.data || {});
      if (err) errors.push(`Node "${node.id}": ${err}`);
    }
  }

  // Validate edges reference existing nodes
  for (const edge of graph.edges || []) {
    if (!nodeIds.has(edge.source)) {
      errors.push(`Edge source "${edge.source}" does not exist`);
    }
    if (!nodeIds.has(edge.target)) {
      errors.push(`Edge target "${edge.target}" does not exist`);
    }
  }

  // Check for cycles (topological sort attempt)
  const adj = new Map<string, string[]>();
  const inDegree = new Map<string, number>();
  for (const id of nodeIds) {
    adj.set(id, []);
    inDegree.set(id, 0);
  }
  for (const edge of graph.edges || []) {
    if (nodeIds.has(edge.source) && nodeIds.has(edge.target)) {
      adj.get(edge.source)!.push(edge.target);
      inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
    }
  }
  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }
  let visited = 0;
  while (queue.length > 0) {
    const current = queue.shift()!;
    visited++;
    for (const neighbor of adj.get(current) || []) {
      const newDeg = (inDegree.get(neighbor) || 0) - 1;
      inDegree.set(neighbor, newDeg);
      if (newDeg === 0) queue.push(neighbor);
    }
  }
  if (visited !== nodeIds.size) {
    errors.push('Workflow graph contains a cycle');
  }

  return errors;
}
