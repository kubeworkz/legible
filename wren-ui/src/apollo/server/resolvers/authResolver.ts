import { IContext } from '@server/types';
import { User } from '@server/repositories/userRepository';
import { requireAuth } from '@server/utils/authGuard';
import {
  checkLoginRateLimit,
  checkSignupRateLimit,
} from '@server/utils/authRateLimiter';
import {
  AuditCategory,
  AuditAction,
  AuditResult,
} from '@server/repositories/auditLogRepository';

export class AuthResolver {
  constructor() {
    this.me = this.me.bind(this);
    this.signup = this.signup.bind(this);
    this.login = this.login.bind(this);
    this.logout = this.logout.bind(this);
    this.updateProfile = this.updateProfile.bind(this);
    this.changePassword = this.changePassword.bind(this);
    this.deleteAccount = this.deleteAccount.bind(this);
  }

  public async me(
    _root: any,
    _args: any,
    ctx: IContext,
  ): Promise<Omit<User, 'passwordHash'> | null> {
    if (!ctx.currentUser) return null;
    const { passwordHash, ...user } = ctx.currentUser;
    return user;
  }

  public async signup(
    _root: any,
    args: { data: { email: string; password: string; displayName?: string } },
    ctx: IContext,
  ) {
    // Rate limit signup by IP
    const ip = ctx.clientIp || 'unknown';
    const rl = checkSignupRateLimit(ip);
    if (!rl.allowed) {
      throw new Error(rl.reason || 'Too many signup attempts');
    }

    const result = await ctx.authService.signup(args.data);
    const { passwordHash, ...user } = result.user;

    ctx.auditLogService.log({
      userId: user.id,
      userEmail: user.email,
      clientIp: ctx.clientIp,
      category: AuditCategory.AUTH,
      action: AuditAction.SIGNUP,
      targetType: 'user',
      targetId: user.id,
      detail: { email: user.email },
    });

    return { token: result.token, user };
  }

  public async login(
    _root: any,
    args: { data: { email: string; password: string } },
    ctx: IContext,
  ) {
    // Rate limit login by IP
    const ip = ctx.clientIp || 'unknown';
    const rl = checkLoginRateLimit(ip);
    if (!rl.allowed) {
      throw new Error(rl.reason || 'Too many login attempts');
    }

    try {
      const result = await ctx.authService.login(args.data);
      const { passwordHash, ...user } = result.user;

      ctx.auditLogService.log({
        userId: user.id,
        userEmail: user.email,
        clientIp: ctx.clientIp,
        category: AuditCategory.AUTH,
        action: AuditAction.LOGIN,
        targetType: 'user',
        targetId: user.id,
      });

      return { token: result.token, user };
    } catch (err) {
      ctx.auditLogService.log({
        userEmail: args.data.email,
        clientIp: ctx.clientIp,
        category: AuditCategory.AUTH,
        action: AuditAction.LOGIN_FAILED,
        result: AuditResult.FAILURE,
        detail: { email: args.data.email },
      });
      throw err;
    }
  }

  public async logout(
    _root: any,
    _args: any,
    ctx: IContext,
  ): Promise<boolean> {
    if (!ctx.authToken) return true;

    ctx.auditLogService.log({
      userId: ctx.currentUser?.id,
      userEmail: ctx.currentUser?.email,
      clientIp: ctx.clientIp,
      organizationId: ctx.organizationId,
      category: AuditCategory.AUTH,
      action: AuditAction.LOGOUT,
    });

    return ctx.authService.logout(ctx.authToken);
  }

  public async updateProfile(
    _root: any,
    args: { data: { displayName?: string; avatarUrl?: string } },
    ctx: IContext,
  ) {
    const user = requireAuth(ctx);
    const updated = await ctx.authService.updateProfile(user.id, args.data);
    const { passwordHash, ...rest } = updated;

    ctx.auditLogService.log({
      userId: user.id,
      userEmail: user.email,
      clientIp: ctx.clientIp,
      organizationId: ctx.organizationId,
      category: AuditCategory.PROFILE,
      action: AuditAction.PROFILE_UPDATED,
      targetType: 'user',
      targetId: user.id,
      detail: args.data,
    });

    return rest;
  }

  public async changePassword(
    _root: any,
    args: { data: { currentPassword: string; newPassword: string } },
    ctx: IContext,
  ): Promise<boolean> {
    const user = requireAuth(ctx);
    const result = await ctx.authService.changePassword(
      user.id,
      args.data.currentPassword,
      args.data.newPassword,
    );

    ctx.auditLogService.log({
      userId: user.id,
      userEmail: user.email,
      clientIp: ctx.clientIp,
      organizationId: ctx.organizationId,
      category: AuditCategory.AUTH,
      action: AuditAction.PASSWORD_CHANGED,
      targetType: 'user',
      targetId: user.id,
    });

    return result;
  }

  public async deleteAccount(
    _root: any,
    _args: any,
    ctx: IContext,
  ): Promise<boolean> {
    const user = requireAuth(ctx);
    if (!ctx.authToken) throw new Error('Authentication required');

    ctx.auditLogService.log({
      userId: user.id,
      userEmail: user.email,
      clientIp: ctx.clientIp,
      organizationId: ctx.organizationId,
      category: AuditCategory.AUTH,
      action: AuditAction.ACCOUNT_DELETED,
      targetType: 'user',
      targetId: user.id,
    });

    return ctx.authService.deleteAccount(user.id, ctx.authToken);
  }
}
