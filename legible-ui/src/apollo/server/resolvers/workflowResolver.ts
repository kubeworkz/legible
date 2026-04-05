import { IContext } from '@server/types/context';

export class WorkflowResolver {
  public async listWorkflows(
    _root: any,
    _args: any,
    ctx: IContext,
  ) {
    const project = await ctx.projectService.getCurrentProject();
    return ctx.workflowService.listWorkflows(project.id);
  }

  public async getWorkflow(
    _root: any,
    args: { where: { id: number } },
    ctx: IContext,
  ) {
    return ctx.workflowService.getWorkflow(args.where.id);
  }

  public async listWorkflowVersions(
    _root: any,
    args: { where: { workflowId: number } },
    ctx: IContext,
  ) {
    return ctx.workflowService.listVersions(args.where.workflowId);
  }

  public async createWorkflow(
    _root: any,
    args: { data: any },
    ctx: IContext,
  ) {
    const project = await ctx.projectService.getCurrentProject();
    return ctx.workflowService.createWorkflow(project.id, args.data);
  }

  public async updateWorkflow(
    _root: any,
    args: { where: { id: number }; data: any },
    ctx: IContext,
  ) {
    return ctx.workflowService.updateWorkflow(args.where.id, args.data);
  }

  public async deleteWorkflow(
    _root: any,
    args: { where: { id: number } },
    ctx: IContext,
  ) {
    await ctx.workflowService.deleteWorkflow(args.where.id);
    return true;
  }

  public async publishWorkflow(
    _root: any,
    args: { where: { id: number } },
    ctx: IContext,
  ) {
    return ctx.workflowService.publishWorkflow(args.where.id);
  }

  public async archiveWorkflow(
    _root: any,
    args: { where: { id: number } },
    ctx: IContext,
  ) {
    return ctx.workflowService.archiveWorkflow(args.where.id);
  }
}
