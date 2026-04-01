import { IContext } from '@server/types/context';
import { getLogger } from '@server/utils';

const logger = getLogger('BlueprintRegistryResolver');

export class BlueprintRegistryResolver {
  public async listRegistryEntries(
    _root: any,
    _args: any,
    ctx: IContext,
  ) {
    return ctx.blueprintRegistryService.listRegistryEntries();
  }

  public async getRegistryEntry(
    _root: any,
    args: { where: { id: number } },
    ctx: IContext,
  ) {
    return ctx.blueprintRegistryService.getRegistryEntry(args.where.id);
  }

  public async searchRegistryByConnector(
    _root: any,
    args: { connectorType: string },
    ctx: IContext,
  ) {
    return ctx.blueprintRegistryService.searchByConnector(
      args.connectorType,
    );
  }

  public async searchRegistryByCategory(
    _root: any,
    args: { category: string },
    ctx: IContext,
  ) {
    return ctx.blueprintRegistryService.searchByCategory(args.category);
  }

  public async recommendBlueprint(
    _root: any,
    args: { connectorType: string },
    ctx: IContext,
  ) {
    return ctx.blueprintRegistryService.recommendForConnector(
      args.connectorType,
    );
  }

  public async createRegistryEntry(
    _root: any,
    args: { data: any },
    ctx: IContext,
  ) {
    return ctx.blueprintRegistryService.createRegistryEntry(args.data);
  }

  public async deleteRegistryEntry(
    _root: any,
    args: { where: { id: number } },
    ctx: IContext,
  ) {
    await ctx.blueprintRegistryService.deleteRegistryEntry(args.where.id);
    return true;
  }

  public async installRegistryEntry(
    _root: any,
    args: { registryEntryId: number },
    ctx: IContext,
  ) {
    const project = await ctx.projectService.getCurrentProject();
    return ctx.blueprintRegistryService.installToProject(
      args.registryEntryId,
      project.id,
    );
  }
}

export class AutoProvisionResolver {
  public async autoProvisionConfig(
    _root: any,
    _args: any,
    ctx: IContext,
  ) {
    const project = await ctx.projectService.getCurrentProject();
    return ctx.autoProvisionService.getConfig(project.id);
  }

  public async autoProvisionConfigForConnector(
    _root: any,
    args: { connectorType: string },
    ctx: IContext,
  ) {
    const project = await ctx.projectService.getCurrentProject();
    return ctx.autoProvisionService.getConfigForConnector(
      project.id,
      args.connectorType,
    );
  }

  public async setAutoProvisionConfig(
    _root: any,
    args: { data: any },
    ctx: IContext,
  ) {
    const project = await ctx.projectService.getCurrentProject();
    return ctx.autoProvisionService.setConfig({
      ...args.data,
      projectId: project.id,
    });
  }

  public async deleteAutoProvisionConfig(
    _root: any,
    args: { where: { id: number } },
    ctx: IContext,
  ) {
    await ctx.autoProvisionService.deleteConfig(args.where.id);
    return true;
  }

  public async provisionAgent(
    _root: any,
    args: { connectorType: string },
    ctx: IContext,
  ) {
    const project = await ctx.projectService.getCurrentProject();
    return ctx.autoProvisionService.provisionAgent(
      project.id,
      args.connectorType,
    );
  }

  public async recommendedBlueprint(
    _root: any,
    args: { connectorType: string },
    ctx: IContext,
  ) {
    return {
      connectorType: args.connectorType,
      blueprintName:
        ctx.autoProvisionService.getRecommendedBlueprint(
          args.connectorType,
        ),
    };
  }
}
