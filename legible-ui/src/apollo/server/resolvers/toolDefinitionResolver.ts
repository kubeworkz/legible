import { IContext } from '@server/types/context';

export class ToolDefinitionResolver {
  public async listToolDefinitions(
    _root: any,
    _args: any,
    ctx: IContext,
  ) {
    const project = await ctx.projectService.getCurrentProject();
    return ctx.toolDefinitionService.listTools(project.id);
  }

  public async getToolDefinition(
    _root: any,
    args: { where: { id: number } },
    ctx: IContext,
  ) {
    return ctx.toolDefinitionService.getTool(args.where.id);
  }

  public async listToolDefinitionsBySource(
    _root: any,
    args: { source: string },
    ctx: IContext,
  ) {
    const project = await ctx.projectService.getCurrentProject();
    return ctx.toolDefinitionService.listBySource(project.id, args.source);
  }

  public async createToolDefinition(
    _root: any,
    args: { data: any },
    ctx: IContext,
  ) {
    const project = await ctx.projectService.getCurrentProject();
    return ctx.toolDefinitionService.createTool(project.id, args.data);
  }

  public async updateToolDefinition(
    _root: any,
    args: { where: { id: number }; data: any },
    ctx: IContext,
  ) {
    return ctx.toolDefinitionService.updateTool(args.where.id, args.data);
  }

  public async deleteToolDefinition(
    _root: any,
    args: { where: { id: number } },
    ctx: IContext,
  ) {
    await ctx.toolDefinitionService.deleteTool(args.where.id);
    return true;
  }

  public async syncMcpTools(
    _root: any,
    args: { serverName: string },
    ctx: IContext,
  ) {
    // TODO: In Phase 2, this will call the MCP server to discover tools.
    // For now, return a no-op result.
    return { created: 0, updated: 0, removed: 0 };
  }
}
