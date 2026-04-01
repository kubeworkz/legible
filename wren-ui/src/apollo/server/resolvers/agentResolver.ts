import { IContext } from '@server/types';
import { Agent, AgentAuditLog } from '@server/repositories/agentRepository';
import { getLogger } from '@server/utils';
import { requireProjectWrite } from '../utils/authGuard';

const logger = getLogger('AgentResolver');

export class AgentResolver {
  constructor() {
    this.listAgents = this.listAgents.bind(this);
    this.getAgent = this.getAgent.bind(this);
    this.getAgentLogs = this.getAgentLogs.bind(this);
    this.createAgent = this.createAgent.bind(this);
    this.updateAgent = this.updateAgent.bind(this);
    this.deleteAgent = this.deleteAgent.bind(this);
  }

  public async listAgents(
    _root: any,
    _args: any,
    ctx: IContext,
  ): Promise<Agent[]> {
    const project = await ctx.projectService.getCurrentProject(ctx.projectId);
    return ctx.agentService.listAgents(project.id);
  }

  public async getAgent(
    _root: any,
    args: { where: { id: number } },
    ctx: IContext,
  ): Promise<Agent> {
    return ctx.agentService.getAgent(args.where.id);
  }

  public async getAgentLogs(
    _root: any,
    args: { where: { id: number }; limit?: number },
    ctx: IContext,
  ): Promise<AgentAuditLog[]> {
    return ctx.agentService.getAgentLogs(args.where.id, args.limit);
  }

  public async createAgent(
    _root: any,
    args: {
      data: {
        name: string;
        sandboxName: string;
        providerName?: string;
        policyYaml?: string;
        image?: string;
        metadata?: Record<string, any>;
        gatewayId?: number;
      };
    },
    ctx: IContext,
  ): Promise<Agent> {
    await requireProjectWrite(ctx);
    const project = await ctx.projectService.getCurrentProject(ctx.projectId);
    return ctx.agentService.createAgent({
      projectId: project.id,
      ...args.data,
    });
  }

  public async updateAgent(
    _root: any,
    args: {
      where: { id: number };
      data: {
        status?: string;
        policyYaml?: string;
        metadata?: Record<string, any>;
      };
    },
    ctx: IContext,
  ): Promise<Agent> {
    await requireProjectWrite(ctx);
    return ctx.agentService.updateAgent(args.where.id, args.data);
  }

  public async deleteAgent(
    _root: any,
    args: { where: { id: number } },
    ctx: IContext,
  ): Promise<boolean> {
    await requireProjectWrite(ctx);
    await ctx.agentService.deleteAgent(args.where.id);
    return true;
  }
}
