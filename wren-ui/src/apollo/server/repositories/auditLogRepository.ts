import { Knex } from 'knex';
import { camelCase, isPlainObject, mapKeys, snakeCase } from 'lodash';
import { BaseRepository, IBasicRepository } from './baseRepository';

// ----- Enums -----

export enum AuditCategory {
  AUTH = 'auth',
  PROFILE = 'profile',
  ORG = 'org',
  ORG_MEMBER = 'org_member',
  PROJECT = 'project',
  PROJECT_MEMBER = 'project_member',
  PROJECT_PERMISSION = 'project_permission',
  API_KEY = 'api_key',
  DEPLOY = 'deploy',
  SUPERADMIN = 'superadmin',
}

export enum AuditAction {
  // auth
  SIGNUP = 'signup',
  LOGIN = 'login',
  LOGIN_FAILED = 'login_failed',
  LOGOUT = 'logout',
  PASSWORD_CHANGED = 'password_changed',
  ACCOUNT_DELETED = 'account_deleted',
  OIDC_LOGIN = 'oidc_login',
  OIDC_LOGIN_FAILED = 'oidc_login_failed',
  OIDC_IDENTITY_UNLINKED = 'oidc_identity_unlinked',
  OIDC_PROVIDER_CREATED = 'oidc_provider_created',
  OIDC_PROVIDER_UPDATED = 'oidc_provider_updated',
  OIDC_PROVIDER_DELETED = 'oidc_provider_deleted',
  // profile
  PROFILE_UPDATED = 'profile_updated',
  // org
  ORG_CREATED = 'org_created',
  ORG_UPDATED = 'org_updated',
  ORG_DELETED = 'org_deleted',
  // org_member
  MEMBER_INVITED = 'member_invited',
  INVITATION_ACCEPTED = 'invitation_accepted',
  MEMBER_ROLE_CHANGED = 'member_role_changed',
  MEMBER_REMOVED = 'member_removed',
  // project
  PROJECT_CREATED = 'project_created',
  PROJECT_UPDATED = 'project_updated',
  PROJECT_DELETED = 'project_deleted',
  // project_member
  PROJECT_MEMBER_ADDED = 'project_member_added',
  PROJECT_MEMBER_ROLE_CHANGED = 'project_member_role_changed',
  PROJECT_MEMBER_REMOVED = 'project_member_removed',
  // project_permission
  VIEWER_PERMISSION_UPDATED = 'viewer_permission_updated',
  // api_key
  ORG_KEY_CREATED = 'org_key_created',
  ORG_KEY_REVOKED = 'org_key_revoked',
  ORG_KEY_DELETED = 'org_key_deleted',
  PROJECT_KEY_CREATED = 'project_key_created',
  PROJECT_KEY_REVOKED = 'project_key_revoked',
  PROJECT_KEY_DELETED = 'project_key_deleted',
  // deploy
  MODEL_DEPLOYED = 'model_deployed',
  // superadmin
  ADMIN_LIST_ORGS = 'admin_list_orgs',
  ADMIN_VIEW_ORG = 'admin_view_org',
  ADMIN_LIST_USERS = 'admin_list_users',
  ADMIN_GRANT_SUPERADMIN = 'admin_grant_superadmin',
  ADMIN_REVOKE_SUPERADMIN = 'admin_revoke_superadmin',
  ADMIN_UPDATE_SUBSCRIPTION = 'admin_update_subscription',
}

export enum AuditResult {
  SUCCESS = 'success',
  FAILURE = 'failure',
}

// ----- Interfaces -----

export interface AuditLog {
  id: number;
  timestamp: string;
  userId: number | null;
  userEmail: string | null;
  clientIp: string | null;
  organizationId: number | null;
  projectId: number | null;
  category: AuditCategory;
  action: AuditAction;
  targetType: string | null;
  targetId: string | null;
  result: AuditResult;
  detail: string | null;
  createdAt: string;
}

export interface AuditLogFilter {
  category?: AuditCategory;
  action?: AuditAction;
  userId?: number;
  organizationId?: number;
  projectId?: number;
  result?: AuditResult;
  startTime?: string;
  endTime?: string;
}

export interface AuditLogPagination {
  limit: number;
  offset: number;
}

export interface IAuditLogRepository extends IBasicRepository<AuditLog> {
  findWithPagination(
    filter: AuditLogFilter,
    pagination: AuditLogPagination,
  ): Promise<{ data: AuditLog[]; total: number }>;
  findByCategory(
    category: AuditCategory,
    pagination: AuditLogPagination,
  ): Promise<AuditLog[]>;
  findByUser(
    userId: number,
    pagination: AuditLogPagination,
  ): Promise<AuditLog[]>;
  purgeOlderThan(days: number): Promise<number>;
}

// ----- Repository -----

export class AuditLogRepository
  extends BaseRepository<AuditLog>
  implements IAuditLogRepository
{
  constructor(knexPg: Knex) {
    super({ knexPg, tableName: 'audit_log' });
  }

  /**
   * Override: camelCase→snake_case, stringify detail JSON
   */
  protected override transformToDBData = (data: any): any => {
    if (!isPlainObject(data)) {
      throw new Error('Unexpected dbdata');
    }
    const snaked = mapKeys(data, (_v, key) => snakeCase(key));
    if (snaked.detail && typeof snaked.detail === 'object') {
      snaked.detail = JSON.stringify(snaked.detail);
    }
    return snaked;
  };

  /**
   * Override: snake_case→camelCase, parse detail JSON
   */
  protected override transformFromDBData = (data: any): AuditLog => {
    if (!isPlainObject(data)) {
      throw new Error('Unexpected dbdata');
    }
    const camelCased = mapKeys(data, (_v, key) => camelCase(key)) as any;
    if (camelCased.detail && typeof camelCased.detail === 'string') {
      try {
        camelCased.detail = JSON.parse(camelCased.detail);
      } catch {
        // leave as string if not valid JSON
      }
    }
    return camelCased as AuditLog;
  };

  public async findWithPagination(
    filter: AuditLogFilter,
    pagination: AuditLogPagination,
  ): Promise<{ data: AuditLog[]; total: number }> {
    // Build base query with filters applied
    const baseQuery = this.knex(this.tableName);
    this.applyFilter(baseQuery, filter);

    // Get total count
    const countResult = await baseQuery
      .clone()
      .count('* as total')
      .first();
    const total = Number(countResult?.total ?? 0);

    // Get paginated data
    const rows = await baseQuery
      .clone()
      .orderBy('timestamp', 'desc')
      .limit(pagination.limit)
      .offset(pagination.offset);

    const data = rows.map((row: any) => this.transformFromDBData(row));
    return { data, total };
  }

  public async findByCategory(
    category: AuditCategory,
    pagination: AuditLogPagination,
  ): Promise<AuditLog[]> {
    const rows = await this.knex(this.tableName)
      .where('category', category)
      .orderBy('timestamp', 'desc')
      .limit(pagination.limit)
      .offset(pagination.offset);
    return rows.map((row: any) => this.transformFromDBData(row));
  }

  public async findByUser(
    userId: number,
    pagination: AuditLogPagination,
  ): Promise<AuditLog[]> {
    const rows = await this.knex(this.tableName)
      .where('user_id', userId)
      .orderBy('timestamp', 'desc')
      .limit(pagination.limit)
      .offset(pagination.offset);
    return rows.map((row: any) => this.transformFromDBData(row));
  }

  public async purgeOlderThan(days: number): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return this.knex(this.tableName)
      .where('timestamp', '<', cutoff.toISOString())
      .delete();
  }

  private applyFilter(
    query: Knex.QueryBuilder,
    filter: AuditLogFilter,
  ): void {
    if (filter.category) {
      query.where('category', filter.category);
    }
    if (filter.action) {
      query.where('action', filter.action);
    }
    if (filter.userId) {
      query.where('user_id', filter.userId);
    }
    if (filter.organizationId) {
      // Include events scoped to this org OR events with no org (e.g. login/signup)
      const orgId = filter.organizationId;
      query.where(function () {
        this.where('organization_id', orgId).orWhereNull(
          'organization_id',
        );
      });
    }
    if (filter.projectId) {
      query.where('project_id', filter.projectId);
    }
    if (filter.result) {
      query.where('result', filter.result);
    }
    if (filter.startTime) {
      query.where('timestamp', '>=', filter.startTime);
    }
    if (filter.endTime) {
      query.where('timestamp', '<=', filter.endTime);
    }
  }
}
