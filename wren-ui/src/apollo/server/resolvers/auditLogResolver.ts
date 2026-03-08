import { IContext } from '@server/types';
import { MemberRole } from '@server/repositories/memberRepository';
import { requireAuth } from '../utils/authGuard';
import {
  AuditLogFilter,
} from '@server/repositories/auditLogRepository';

export class AuditLogResolver {
  constructor() {
    this.getAuditLogs = this.getAuditLogs.bind(this);
  }

  /**
   * Query: auditLogs
   * Only org admins/owners can query audit logs.
   */
  public async getAuditLogs(
    _root: any,
    args: {
      filter?: {
        category?: string;
        action?: string;
        userId?: number;
        organizationId?: number;
        projectId?: number;
        result?: string;
        startTime?: string;
        endTime?: string;
      };
      pagination: { limit: number; offset: number };
    },
    ctx: IContext,
  ) {
    const user = requireAuth(ctx);
    const organizationId = ctx.organizationId;

    // Require org admin or owner
    if (organizationId) {
      await ctx.memberService.requireRole(organizationId, user.id, [
        MemberRole.OWNER,
        MemberRole.ADMIN,
      ]);
    } else {
      throw new Error('Organization context required to view audit logs');
    }

    const filter: AuditLogFilter = {};
    if (args.filter) {
      if (args.filter.category) filter.category = args.filter.category as any;
      if (args.filter.action) filter.action = args.filter.action as any;
      if (args.filter.userId) filter.userId = args.filter.userId;
      if (args.filter.result) filter.result = args.filter.result as any;
      if (args.filter.startTime) filter.startTime = args.filter.startTime;
      if (args.filter.endTime) filter.endTime = args.filter.endTime;
      if (args.filter.projectId) filter.projectId = args.filter.projectId;
    }

    // Scope to the user's organization (includes org-scoped + org-null events
    // like login/signup where org context isn't available yet)
    filter.organizationId = organizationId;

    const pagination = {
      limit: Math.min(args.pagination.limit, 200), // cap at 200
      offset: args.pagination.offset ?? 0,
    };

    return ctx.auditLogService.query(filter, pagination);
  }
}
