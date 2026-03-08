import { getLogger } from '@server/utils';
import {
  IAuditLogRepository,
  AuditLog,
  AuditCategory,
  AuditAction,
  AuditResult,
  AuditLogFilter,
  AuditLogPagination,
} from '@server/repositories/auditLogRepository';

const logger = getLogger('AUDIT');

// ----- Types -----

export interface AuditEventInput {
  userId?: number | null;
  userEmail?: string | null;
  clientIp?: string | null;
  organizationId?: number | null;
  projectId?: number | null;
  category: AuditCategory;
  action: AuditAction;
  targetType?: string;
  targetId?: string | number;
  result?: AuditResult;
  detail?: Record<string, any> | string;
}

export interface IAuditLogService {
  /**
   * Fire-and-forget audit log. Never throws.
   */
  log(event: AuditEventInput): void;

  /**
   * Query audit logs with filtering and pagination.
   */
  query(
    filter: AuditLogFilter,
    pagination: AuditLogPagination,
  ): Promise<{ data: AuditLog[]; total: number }>;

  /**
   * Get recent audit logs for a specific user.
   */
  getRecentByUser(
    userId: number,
    limit?: number,
  ): Promise<AuditLog[]>;

  /**
   * Purge audit logs older than given number of days.
   */
  purge(days: number): Promise<number>;
}

// ----- Service -----

export class AuditLogService implements IAuditLogService {
  private auditLogRepository: IAuditLogRepository;

  constructor(deps: { auditLogRepository: IAuditLogRepository }) {
    this.auditLogRepository = deps.auditLogRepository;
  }

  /**
   * Fire-and-forget: writes an audit log entry.
   * This method intentionally does not return a promise and
   * catches all errors internally so it never disrupts the caller.
   */
  public log(event: AuditEventInput): void {
    const detail =
      typeof event.detail === 'object'
        ? JSON.stringify(event.detail)
        : event.detail ?? null;

    // Fire and forget
    this.auditLogRepository
      .createOne({
        userId: event.userId ?? null,
        userEmail: event.userEmail ?? null,
        clientIp: event.clientIp ?? null,
        organizationId: event.organizationId ?? null,
        projectId: event.projectId ?? null,
        category: event.category,
        action: event.action,
        targetType: event.targetType ?? null,
        targetId:
          event.targetId != null ? String(event.targetId) : null,
        result: event.result ?? AuditResult.SUCCESS,
        detail,
      } as Partial<AuditLog>)
      .catch((err) => {
        logger.error(
          `Failed to write audit log [${event.category}:${event.action}]: ${err.message}`,
        );
      });
  }

  public async query(
    filter: AuditLogFilter,
    pagination: AuditLogPagination,
  ): Promise<{ data: AuditLog[]; total: number }> {
    return this.auditLogRepository.findWithPagination(filter, pagination);
  }

  public async getRecentByUser(
    userId: number,
    limit = 50,
  ): Promise<AuditLog[]> {
    return this.auditLogRepository.findByUser(userId, {
      limit,
      offset: 0,
    });
  }

  public async purge(days: number): Promise<number> {
    const deleted = await this.auditLogRepository.purgeOlderThan(days);
    logger.info(`Purged ${deleted} audit log entries older than ${days} days`);
    return deleted;
  }
}
