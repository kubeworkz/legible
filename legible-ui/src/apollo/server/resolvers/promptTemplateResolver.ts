import { IContext } from '@server/types/context';

export class PromptTemplateResolver {
  public async listPromptTemplates(
    _root: any,
    _args: any,
    ctx: IContext,
  ) {
    const project = await ctx.projectService.getCurrentProject();
    return ctx.promptTemplateService.listTemplates(project.id);
  }

  public async getPromptTemplate(
    _root: any,
    args: { where: { id: number } },
    ctx: IContext,
  ) {
    return ctx.promptTemplateService.getTemplate(args.where.id);
  }

  public async listPromptTemplateVersions(
    _root: any,
    args: { promptTemplateId: number },
    ctx: IContext,
  ) {
    return ctx.promptTemplateService.listVersions(args.promptTemplateId);
  }

  public async createPromptTemplate(
    _root: any,
    args: { data: any },
    ctx: IContext,
  ) {
    const project = await ctx.projectService.getCurrentProject();
    return ctx.promptTemplateService.createTemplate(
      project.id,
      args.data,
      ctx.currentUser?.id,
    );
  }

  public async updatePromptTemplate(
    _root: any,
    args: { where: { id: number }; data: any },
    ctx: IContext,
  ) {
    return ctx.promptTemplateService.updateTemplate(
      args.where.id,
      args.data,
      ctx.currentUser?.id,
    );
  }

  public async deletePromptTemplate(
    _root: any,
    args: { where: { id: number } },
    ctx: IContext,
  ) {
    await ctx.promptTemplateService.deleteTemplate(args.where.id);
    return true;
  }
}
