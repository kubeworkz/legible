/**
 * Workflow Execution Engine — traverses a workflow DAG and executes
 * each node in topological order, passing outputs between nodes.
 */
import { getLogger } from '@server/utils';
import {
  WorkflowExecution,
  WorkflowExecutionStep,
  IWorkflowExecutionRepository,
  IWorkflowExecutionStepRepository,
} from '@server/repositories/workflowExecutionRepository';
import {
  Workflow,
  IWorkflowRepository,
} from '@server/repositories/workflowRepository';
import { IPromptTemplateService } from '@server/services/promptTemplateService';
import { ILLMService, ChatMessage } from '@server/services/llmService';
import { IToolExecutionService } from '@server/services/toolExecutionService';
import { getNodeType, validateWorkflowGraph } from './nodeTypes';

const logger = getLogger('WorkflowEngine');

// ─── Types ─────────────────────────────────────────────────────

interface GraphNode {
  id: string;
  type: string;
  data: Record<string, any>;
  position?: { x: number; y: number };
}

interface GraphEdge {
  id?: string;
  source: string;
  target: string;
  sourceHandle?: string; // output port name
  targetHandle?: string; // input port name
}

interface WorkflowGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface ExecutionContext {
  /** Per-node outputs keyed by nodeId */
  nodeOutputs: Map<string, any>;
  /** Global workflow variables */
  variables: Record<string, any>;
  /** Execution run record */
  execution: WorkflowExecution;
  /** Step records keyed by nodeId */
  steps: Map<string, WorkflowExecutionStep>;
  /** Cancellation flag */
  cancelled: boolean;
}

export interface IWorkflowExecutionService {
  executeWorkflow(
    workflowId: number,
    input: Record<string, any>,
    userId?: number,
  ): Promise<WorkflowExecution>;
  getExecution(id: number): Promise<WorkflowExecution>;
  getExecutionSteps(executionId: number): Promise<WorkflowExecutionStep[]>;
  listExecutions(workflowId: number, limit?: number): Promise<WorkflowExecution[]>;
  listProjectExecutions(projectId: number, limit?: number): Promise<WorkflowExecution[]>;
  cancelExecution(id: number): Promise<WorkflowExecution>;
}

// ─── Execution Engine ──────────────────────────────────────────

export class WorkflowExecutionService implements IWorkflowExecutionService {
  private readonly workflowRepo: IWorkflowRepository;
  private readonly executionRepo: IWorkflowExecutionRepository;
  private readonly stepRepo: IWorkflowExecutionStepRepository;
  private readonly promptTemplateService: IPromptTemplateService;
  private readonly llmService: ILLMService;
  private readonly toolExecutionService: IToolExecutionService;

  /** Track running executions for cancellation */
  private readonly runningExecutions = new Map<number, ExecutionContext>();

  constructor({
    workflowRepository,
    workflowExecutionRepository,
    workflowExecutionStepRepository,
    promptTemplateService,
    llmService,
    toolExecutionService,
  }: {
    workflowRepository: IWorkflowRepository;
    workflowExecutionRepository: IWorkflowExecutionRepository;
    workflowExecutionStepRepository: IWorkflowExecutionStepRepository;
    promptTemplateService: IPromptTemplateService;
    llmService: ILLMService;
    toolExecutionService: IToolExecutionService;
  }) {
    this.workflowRepo = workflowRepository;
    this.executionRepo = workflowExecutionRepository;
    this.stepRepo = workflowExecutionStepRepository;
    this.promptTemplateService = promptTemplateService;
    this.llmService = llmService;
    this.toolExecutionService = toolExecutionService;
  }

  // ─── Public API ────────────────────────────────────────────

  public async executeWorkflow(
    workflowId: number,
    input: Record<string, any>,
    userId?: number,
  ): Promise<WorkflowExecution> {
    // 1. Load workflow
    const workflow = await this.workflowRepo.findOneBy({ id: workflowId } as any);
    if (!workflow) throw new Error(`Workflow not found: ${workflowId}`);

    const graph = workflow.graph as WorkflowGraph;

    // 2. Validate
    const errors = validateWorkflowGraph(graph);
    if (errors.length > 0) {
      throw new Error(`Invalid workflow: ${errors.join('; ')}`);
    }

    // 3. Create execution record
    const now = new Date().toISOString();
    const execution = await this.executionRepo.createOne({
      workflowId,
      projectId: workflow.projectId,
      workflowVersion: workflow.currentVersion,
      status: 'pending',
      input,
      createdBy: userId || null,
      createdAt: now,
    });

    // 4. Create step records for each node
    const stepMap = new Map<string, WorkflowExecutionStep>();
    for (const node of graph.nodes) {
      const step = await this.stepRepo.createOne({
        executionId: execution.id,
        nodeId: node.id,
        nodeType: node.type,
        status: 'pending',
      });
      stepMap.set(node.id, step);
    }

    // 5. Build execution context
    const ctx: ExecutionContext = {
      nodeOutputs: new Map(),
      variables: { ...input },
      execution,
      steps: stepMap,
      cancelled: false,
    };

    this.runningExecutions.set(execution.id, ctx);

    // 6. Execute asynchronously
    this.runExecution(ctx, graph, workflow).catch((err) => {
      logger.error(`Execution ${execution.id} unhandled error: ${err.message}`);
    });

    return execution;
  }

  public async getExecution(id: number): Promise<WorkflowExecution> {
    const exec = await this.executionRepo.findOneBy({ id } as any);
    if (!exec) throw new Error(`Execution not found: ${id}`);
    return exec;
  }

  public async getExecutionSteps(
    executionId: number,
  ): Promise<WorkflowExecutionStep[]> {
    return this.stepRepo.findByExecutionId(executionId);
  }

  public async listExecutions(
    workflowId: number,
    limit = 50,
  ): Promise<WorkflowExecution[]> {
    return this.executionRepo.findByWorkflowId(workflowId, limit);
  }

  public async listProjectExecutions(
    projectId: number,
    limit = 50,
  ): Promise<WorkflowExecution[]> {
    return this.executionRepo.findByProjectId(projectId, limit);
  }

  public async cancelExecution(id: number): Promise<WorkflowExecution> {
    const ctx = this.runningExecutions.get(id);
    if (ctx) {
      ctx.cancelled = true;
    }
    return this.executionRepo.updateOne(id, {
      status: 'cancelled',
      completedAt: new Date().toISOString(),
    });
  }

  // ─── Execution Loop ───────────────────────────────────────

  private async runExecution(
    ctx: ExecutionContext,
    graph: WorkflowGraph,
    workflow: Workflow,
  ): Promise<void> {
    const startTime = Date.now();
    const now = () => new Date().toISOString();

    try {
      // Mark as running
      await this.executionRepo.updateOne(ctx.execution.id, {
        status: 'running',
        startedAt: now(),
      });

      // Get topological order
      const order = this.topologicalSort(graph);

      // Build adjacency for input resolution
      const incomingEdges = new Map<string, GraphEdge[]>();
      for (const edge of graph.edges) {
        if (!incomingEdges.has(edge.target)) {
          incomingEdges.set(edge.target, []);
        }
        incomingEdges.get(edge.target)!.push(edge);
      }

      // Execute each node in order
      for (const nodeId of order) {
        if (ctx.cancelled) {
          // Mark remaining steps as skipped
          const step = ctx.steps.get(nodeId);
          if (step && step.status === 'pending') {
            await this.stepRepo.updateOne(step.id, { status: 'skipped' });
          }
          continue;
        }

        const node = graph.nodes.find((n) => n.id === nodeId)!;
        const step = ctx.steps.get(nodeId)!;

        // Resolve input from upstream nodes
        const inputData = this.resolveNodeInput(
          node,
          incomingEdges.get(nodeId) || [],
          ctx,
        );

        // Execute the node
        await this.executeNode(ctx, node, step, inputData);
      }

      if (ctx.cancelled) {
        return; // already marked as cancelled
      }

      // Collect output from the output node
      const outputNode = graph.nodes.find((n) => n.type === 'output');
      const finalOutput = outputNode
        ? ctx.nodeOutputs.get(outputNode.id)
        : null;

      // Mark execution as completed
      const durationMs = Date.now() - startTime;
      await this.executionRepo.updateOne(ctx.execution.id, {
        status: 'completed',
        output: finalOutput,
        durationMs,
        completedAt: now(),
      });

      logger.info(
        `Execution ${ctx.execution.id} completed in ${durationMs}ms`,
      );
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      await this.executionRepo.updateOne(ctx.execution.id, {
        status: 'failed',
        error: err.message,
        durationMs,
        completedAt: now(),
      });
      logger.error(`Execution ${ctx.execution.id} failed: ${err.message}`);
    } finally {
      this.runningExecutions.delete(ctx.execution.id);
    }
  }

  // ─── Node Execution ───────────────────────────────────────

  private async executeNode(
    ctx: ExecutionContext,
    node: GraphNode,
    step: WorkflowExecutionStep,
    inputData: any,
  ): Promise<void> {
    const stepStart = Date.now();
    const now = () => new Date().toISOString();

    try {
      // Mark step as running
      await this.stepRepo.updateOne(step.id, {
        status: 'running',
        input: inputData,
        startedAt: now(),
      });

      let output: any;

      switch (node.type) {
        case 'trigger':
          output = await this.executeTrigger(ctx, node, inputData);
          break;
        case 'llm':
          output = await this.executeLlm(ctx, node, inputData);
          break;
        case 'tool':
          output = await this.executeTool(ctx, node, inputData);
          break;
        case 'condition':
          output = await this.executeCondition(ctx, node, inputData);
          break;
        case 'code':
          output = await this.executeCode(ctx, node, inputData);
          break;
        case 'output':
          output = await this.executeOutput(ctx, node, inputData);
          break;
        default:
          throw new Error(`Unknown node type: ${node.type}`);
      }

      // Store output
      ctx.nodeOutputs.set(node.id, output);

      const durationMs = Date.now() - stepStart;
      await this.stepRepo.updateOne(step.id, {
        status: 'completed',
        output,
        durationMs,
        completedAt: now(),
      });
    } catch (err: any) {
      const durationMs = Date.now() - stepStart;
      await this.stepRepo.updateOne(step.id, {
        status: 'failed',
        error: err.message,
        durationMs,
        completedAt: now(),
      });
      throw err; // propagate to fail the whole execution
    }
  }

  // ─── Node Type Handlers ───────────────────────────────────

  private async executeTrigger(
    ctx: ExecutionContext,
    node: GraphNode,
    _inputData: any,
  ): Promise<any> {
    // Trigger simply passes through the workflow input variables
    return ctx.variables;
  }

  private async executeLlm(
    ctx: ExecutionContext,
    node: GraphNode,
    inputData: any,
  ): Promise<any> {
    const config = node.data || {};
    const templateId = config.promptTemplateId;

    if (!templateId) {
      throw new Error('LLM node requires a promptTemplateId');
    }

    // Load the prompt template
    const template = await this.promptTemplateService.getTemplate(templateId);

    // Build variable values from input data + variable mapping
    const variableMapping = config.variableMapping || {};
    const variables: Record<string, string> = {};

    for (const [templateVar, inputPath] of Object.entries(variableMapping)) {
      variables[templateVar] = this.resolvePath(inputData, inputPath as string);
    }

    // If no explicit mapping, try to pass input data as-is
    if (Object.keys(variableMapping).length === 0 && typeof inputData === 'object') {
      for (const [key, value] of Object.entries(inputData || {})) {
        variables[key] = String(value);
      }
    }

    // Render prompts
    const renderedSystem = template.systemPrompt
      ? this.promptTemplateService.renderPrompt(template.systemPrompt, variables)
      : null;
    const renderedUser = template.userPrompt
      ? this.promptTemplateService.renderPrompt(template.userPrompt, variables)
      : null;

    // Build messages array for LLM
    const messages: ChatMessage[] = [];
    if (renderedSystem) {
      messages.push({ role: 'system', content: renderedSystem });
    }
    if (renderedUser) {
      messages.push({ role: 'user', content: renderedUser });
    }
    if (messages.length === 0) {
      throw new Error('LLM node: Both system and user prompts are empty');
    }

    // Call the real LLM API via the project's BYOK key
    const llmResponse = await this.llmService.chatCompletion(
      ctx.execution.projectId,
      messages,
      {
        model: config.model || template.model || undefined,
        temperature: config.temperature ?? template.temperature ?? undefined,
        maxTokens: config.maxTokens ?? undefined,
      },
    );

    return {
      renderedSystemPrompt: renderedSystem,
      renderedUserPrompt: renderedUser,
      model: llmResponse.model,
      temperature: config.temperature ?? template.temperature,
      response: llmResponse.content,
      usage: llmResponse.usage,
      finishReason: llmResponse.finishReason,
    };
  }

  private async executeTool(
    ctx: ExecutionContext,
    node: GraphNode,
    inputData: any,
  ): Promise<any> {
    const config = node.data || {};
    const toolId = config.toolDefinitionId;

    if (!toolId) {
      throw new Error('Tool node requires a toolDefinitionId');
    }

    // Apply parameter mapping
    const paramMapping = config.parameterMapping || {};
    const params: Record<string, any> = {};

    for (const [toolParam, inputPath] of Object.entries(paramMapping)) {
      params[toolParam] = this.resolvePath(inputData, inputPath as string);
    }

    // If no explicit mapping, pass input as-is
    const finalParams =
      Object.keys(paramMapping).length === 0 ? inputData : params;

    // Invoke the tool via the ToolExecutionService
    const result = await this.toolExecutionService.executeTool(
      ctx.execution.projectId,
      toolId,
      finalParams,
    );

    return result;
  }

  private async executeCondition(
    _ctx: ExecutionContext,
    node: GraphNode,
    inputData: any,
  ): Promise<any> {
    const config = node.data || {};
    const expression = config.expression;

    if (!expression) {
      throw new Error('Condition node requires an expression');
    }

    // Evaluate expression in a sandboxed scope
    // Only expose `input` variable — no access to globals
    let result: boolean;
    try {
      const fn = new Function('input', `'use strict'; return !!(${expression});`);
      result = fn(inputData);
    } catch (err: any) {
      throw new Error(`Condition expression error: ${err.message}`);
    }

    return {
      condition: expression,
      result,
      input: inputData,
      // The output will be checked by downstream edge resolution
      branch: result ? 'true' : 'false',
    };
  }

  private async executeCode(
    _ctx: ExecutionContext,
    node: GraphNode,
    inputData: any,
  ): Promise<any> {
    const config = node.data || {};
    const code = config.code;

    if (!code) {
      throw new Error('Code node requires code');
    }

    // Execute code in an isolated function scope
    try {
      const fn = new Function('input', `'use strict'; ${code}`);
      const result = fn(inputData);
      return result;
    } catch (err: any) {
      throw new Error(`Code execution error: ${err.message}`);
    }
  }

  private async executeOutput(
    _ctx: ExecutionContext,
    node: GraphNode,
    inputData: any,
  ): Promise<any> {
    const config = node.data || {};
    const mapping = config.outputMapping;

    if (mapping && Object.keys(mapping).length > 0) {
      const result: Record<string, any> = {};
      for (const [outputKey, inputPath] of Object.entries(mapping)) {
        result[outputKey] = this.resolvePath(inputData, inputPath as string);
      }
      return result;
    }

    // Pass through input as output
    return inputData;
  }

  // ─── Helpers ──────────────────────────────────────────────

  /**
   * Resolve the input for a node from its upstream edges.
   * If multiple edges feed into the node, merge their outputs.
   */
  private resolveNodeInput(
    node: GraphNode,
    incomingEdges: GraphEdge[],
    ctx: ExecutionContext,
  ): any {
    if (incomingEdges.length === 0) {
      return ctx.variables; // root node gets workflow variables
    }

    if (incomingEdges.length === 1) {
      const edge = incomingEdges[0];
      const upstreamOutput = ctx.nodeOutputs.get(edge.source);

      // For condition nodes, check if we should follow this branch
      const sourceNode = ctx.execution; // we check the output's branch field
      const upstreamData = upstreamOutput;
      if (upstreamData?.branch && edge.sourceHandle) {
        // Only pass data if the branch matches
        if (upstreamData.branch !== edge.sourceHandle) {
          return undefined; // this branch is not taken
        }
      }

      return upstreamOutput;
    }

    // Multiple inputs — merge into a single object
    const merged: Record<string, any> = {};
    for (const edge of incomingEdges) {
      const sourceOutput = ctx.nodeOutputs.get(edge.source);
      const key = edge.sourceHandle || edge.source;
      merged[key] = sourceOutput;
    }
    return merged;
  }

  /**
   * Resolve a dot-path on an object: "response.data.name" → obj.response.data.name
   */
  private resolvePath(obj: any, path: string): any {
    if (!path || !obj) return obj;
    const parts = path.split('.');
    let current = obj;
    for (const part of parts) {
      if (current == null) return undefined;
      current = current[part];
    }
    return current;
  }

  /**
   * Topological sort of graph nodes using Kahn's algorithm.
   * Returns node IDs in execution order.
   */
  private topologicalSort(graph: WorkflowGraph): string[] {
    const nodeIds = new Set(graph.nodes.map((n) => n.id));
    const adj = new Map<string, string[]>();
    const inDegree = new Map<string, number>();

    for (const id of nodeIds) {
      adj.set(id, []);
      inDegree.set(id, 0);
    }

    for (const edge of graph.edges) {
      if (nodeIds.has(edge.source) && nodeIds.has(edge.target)) {
        adj.get(edge.source)!.push(edge.target);
        inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
      }
    }

    const queue: string[] = [];
    for (const [id, deg] of inDegree) {
      if (deg === 0) queue.push(id);
    }

    const order: string[] = [];
    while (queue.length > 0) {
      const current = queue.shift()!;
      order.push(current);
      for (const neighbor of adj.get(current) || []) {
        const newDeg = (inDegree.get(neighbor) || 0) - 1;
        inDegree.set(neighbor, newDeg);
        if (newDeg === 0) queue.push(neighbor);
      }
    }

    if (order.length !== nodeIds.size) {
      throw new Error('Cannot execute workflow: graph contains a cycle');
    }

    return order;
  }
}
