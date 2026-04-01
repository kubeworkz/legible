import { IContext } from '@server/types';
import { Gateway } from '@server/repositories/gatewayRepository';
import { getLogger } from '@server/utils';

const logger = getLogger('GatewayResolver');

export class GatewayResolver {
  constructor() {
    this.getGateway = this.getGateway.bind(this);
    this.getGatewayForOrganization =
      this.getGatewayForOrganization.bind(this);
    this.listRunningGateways = this.listRunningGateways.bind(this);
    this.createGateway = this.createGateway.bind(this);
    this.updateGateway = this.updateGateway.bind(this);
    this.deleteGateway = this.deleteGateway.bind(this);
  }

  public async getGateway(
    _root: any,
    args: { where: { id: number } },
    ctx: IContext,
  ): Promise<Gateway> {
    return ctx.gatewayService.getGateway(args.where.id);
  }

  public async getGatewayForOrganization(
    _root: any,
    args: { organizationId: number },
    ctx: IContext,
  ): Promise<Gateway | null> {
    return ctx.gatewayService.getGatewayForOrganization(args.organizationId);
  }

  public async listRunningGateways(
    _root: any,
    _args: any,
    ctx: IContext,
  ): Promise<Gateway[]> {
    return ctx.gatewayService.listRunningGateways();
  }

  public async createGateway(
    _root: any,
    args: {
      data: {
        organizationId: number;
        cpus?: string;
        memory?: string;
        maxSandboxes?: number;
      };
    },
    ctx: IContext,
  ): Promise<Gateway> {
    return ctx.gatewayService.createGateway(args.data);
  }

  public async updateGateway(
    _root: any,
    args: {
      where: { id: number };
      data: {
        status?: string;
        endpoint?: string;
        port?: number;
        pid?: number;
        version?: string;
        errorMessage?: string;
        lastHealthCheck?: string;
      };
    },
    ctx: IContext,
  ): Promise<Gateway> {
    return ctx.gatewayService.updateGateway(args.where.id, args.data);
  }

  public async deleteGateway(
    _root: any,
    args: { where: { id: number } },
    ctx: IContext,
  ): Promise<boolean> {
    await ctx.gatewayService.deleteGateway(args.where.id);
    return true;
  }
}
