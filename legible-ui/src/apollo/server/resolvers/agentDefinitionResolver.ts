import { IContext } from '../types/context';
import { getLogger } from '@server/utils';

const logger = getLogger('AgentDefinitionResolver');

export class AgentDefinitionResolver {
  constructor() {
    this.listAgentDefinitions = this.listAgentDefinitions.bind(this);
    this.getAgentDefinition = this.getAgentDefinition.bind(this);
    this.listAgentDefinitionVersions = this.listAgentDefinitionVersions.bind(this);
    this.createAgentDefinition = this.createAgentDefinition.bind(this);
    this.updateAgentDefinition = this.updateAgentDefinition.bind(this);
    this.deleteAgentDefinition = this.deleteAgentDefinition.bind(this);
    this.publishAgentDefinition = this.publishAgentDefinition.bind(this);
    this.deployAgentDefinition = this.deployAgentDefinition.bind(this);
    this.archiveAgentDefinition = this.archiveAgentDefinition.bind(this);
  }

  // ─── Queries ───────────────────────────────────────────────

  public async listAgentDefinitions(
    _root: any,
    _args: any,
    ctx: IContext,
  ) {
    return ctx.agentDefinitionService.listAgentDefinitions(ctx.projectId);
  }

  public async getAgentDefinition(
    _root: any,
    args: { where: { id: number } },
    ctx: IContext,
  ) {
    return ctx.agentDefinitionService.getAgentDefinition(args.where.id);
  }

  public async listAgentDefinitionVersions(
    _root: any,
    args: { agentDefinitionId: number },
    ctx: IContext,
  ) {
    return ctx.agentDefinitionService.listVersions(args.agentDefinitionId);
  }

  // ─── Mutations ─────────────────────────────────────────────

  public async createAgentDefinition(
    _root: any,
    args: { data: any },
    ctx: IContext,
  ) {
    return ctx.agentDefinitionService.createAgentDefinition(
      ctx.projectId,
      args.data,
      ctx.currentUser?.id,
    );
  }

  public async updateAgentDefinition(
    _root: any,
    args: { where: { id: number }; data: any },
    ctx: IContext,
  ) {
    return ctx.agentDefinitionService.updateAgentDefinition(
      args.where.id,
      args.data,
    );
  }

  public async deleteAgentDefinition(
    _root: any,
    args: { where: { id: number } },
    ctx: IContext,
  ) {
    await ctx.agentDefinitionService.deleteAgentDefinition(args.where.id);
    return true;
  }

  public async publishAgentDefinition(
    _root: any,
    args: { where: { id: number }; changeNote?: string },
    ctx: IContext,
  ) {
    return ctx.agentDefinitionService.publishAgentDefinition(
      args.where.id,
      args.changeNote,
      ctx.currentUser?.id,
    );
  }

  public async deployAgentDefinition(
    _root: any,
    args: { where: { id: number } },
    ctx: IContext,
  ) {
    return ctx.agentDefinitionService.deployAgentDefinition(args.where.id);
  }

  public async archiveAgentDefinition(
    _root: any,
    args: { where: { id: number } },
    ctx: IContext,
  ) {
    return ctx.agentDefinitionService.archiveAgentDefinition(args.where.id);
  }
}
