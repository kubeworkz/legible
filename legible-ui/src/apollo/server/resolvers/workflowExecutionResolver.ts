import { IContext } from '@server/types/context';
import { getAllNodeTypes } from '@server/services/workflow/nodeTypes';

export class WorkflowExecutionResolver {
  public async listWorkflowExecutions(
    _root: any,
    args: { workflowId: number },
    ctx: IContext,
  ) {
    return ctx.workflowExecutionService.listExecutions(args.workflowId);
  }

  public async getWorkflowExecution(
    _root: any,
    args: { where: { id: number } },
    ctx: IContext,
  ) {
    return ctx.workflowExecutionService.getExecution(args.where.id);
  }

  public async getWorkflowExecutionSteps(
    _root: any,
    args: { executionId: number },
    ctx: IContext,
  ) {
    return ctx.workflowExecutionService.getExecutionSteps(args.executionId);
  }

  public async getNodeTypeDefinitions() {
    const types = getAllNodeTypes();
    return types.map((t) => ({
      type: t.type,
      label: t.label,
      description: t.description,
      category: t.category,
      color: t.color,
      icon: t.icon,
      inputs: t.inputs,
      outputs: t.outputs,
      configFields: t.configFields.map((f) => ({
        name: f.key,
        type: f.type,
        label: f.label,
        required: f.required ?? false,
        defaultValue: f.default ?? null,
        options: f.options ?? null,
      })),
      maxInstances: t.maxInstances ?? null,
    }));
  }

  public async executeWorkflow(
    _root: any,
    args: { data: { workflowId: number; input?: any } },
    ctx: IContext,
  ) {
    return ctx.workflowExecutionService.executeWorkflow(
      args.data.workflowId,
      args.data.input || {},
    );
  }

  public async cancelWorkflowExecution(
    _root: any,
    args: { where: { id: number } },
    ctx: IContext,
  ) {
    return ctx.workflowExecutionService.cancelExecution(args.where.id);
  }
}
