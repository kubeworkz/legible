/**
 * QueryUsageResolver — GraphQL resolvers for query usage / metering.
 */

import { IContext } from '@server/types';
import { requireAuth } from '../utils/authGuard';

export class QueryUsageResolver {
  constructor() {
    this.queryUsageOverview = this.queryUsageOverview.bind(this);
    this.queryUsageStats = this.queryUsageStats.bind(this);
  }

  public async queryUsageOverview(_root: any, _args: any, ctx: IContext) {
    await requireAuth(ctx);
    const organizationId = ctx.organizationId;
    if (!organizationId) {
      throw new Error('Organization context required');
    }
    return ctx.queryMeteringService.getUsageOverview(organizationId);
  }

  public async queryUsageStats(
    _root: any,
    args: { filter?: { projectId?: number; startDate?: string; endDate?: string } },
    ctx: IContext,
  ) {
    await requireAuth(ctx);
    const organizationId = ctx.organizationId;
    if (!organizationId) {
      throw new Error('Organization context required');
    }
    const filter = {
      organizationId,
      projectId: args.filter?.projectId,
      startDate: args.filter?.startDate
        ? new Date(args.filter.startDate)
        : undefined,
      endDate: args.filter?.endDate
        ? new Date(args.filter.endDate)
        : undefined,
    };
    return ctx.queryMeteringService.getUsageStats(filter);
  }
}
