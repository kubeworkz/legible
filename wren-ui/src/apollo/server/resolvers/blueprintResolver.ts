import { IBlueprintService } from '@server/services/blueprintService';
import { IContext } from '@server/types/context';
import { getLogger } from '@server/utils';

const logger = getLogger('BlueprintResolver');

export class BlueprintResolver {
  public listBlueprints = async (
    _root: any,
    _args: any,
    ctx: IContext,
  ) => {
    const project = await ctx.projectService.getCurrentProject();
    return ctx.blueprintService.listBlueprints(project.id);
  };

  public getBlueprint = async (
    _root: any,
    args: { where: { id: number } },
    ctx: IContext,
  ) => {
    return ctx.blueprintService.getBlueprint(args.where.id);
  };

  public getBlueprintByName = async (
    _root: any,
    args: { where: { name: string } },
    ctx: IContext,
  ) => {
    const project = await ctx.projectService.getCurrentProject();
    return ctx.blueprintService.getBlueprintByName(project.id, args.where.name);
  };

  public createBlueprint = async (
    _root: any,
    args: {
      data: {
        name: string;
        blueprintYaml: string;
        version?: string;
        description?: string;
        sandboxImage?: string;
        defaultAgentType?: string;
        inferenceProfiles?: any;
        policyYaml?: string;
        isBuiltin?: boolean;
      };
    },
    ctx: IContext,
  ) => {
    const project = await ctx.projectService.getCurrentProject();
    return ctx.blueprintService.createBlueprint({
      projectId: project.id,
      ...args.data,
    });
  };

  public updateBlueprint = async (
    _root: any,
    args: {
      where: { id: number };
      data: {
        version?: string;
        description?: string;
        blueprintYaml?: string;
        sandboxImage?: string;
        defaultAgentType?: string;
        inferenceProfiles?: any;
        policyYaml?: string;
      };
    },
    ctx: IContext,
  ) => {
    return ctx.blueprintService.updateBlueprint(args.where.id, args.data);
  };

  public deleteBlueprint = async (
    _root: any,
    args: { where: { id: number } },
    ctx: IContext,
  ) => {
    await ctx.blueprintService.deleteBlueprint(args.where.id);
    return true;
  };
}
