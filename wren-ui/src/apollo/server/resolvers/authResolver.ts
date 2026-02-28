import { IContext } from '@server/types';
import { User } from '@server/repositories/userRepository';
import { requireAuth } from '@server/utils/authGuard';

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
    const result = await ctx.authService.signup(args.data);
    const { passwordHash, ...user } = result.user;
    return { token: result.token, user };
  }

  public async login(
    _root: any,
    args: { data: { email: string; password: string } },
    ctx: IContext,
  ) {
    const result = await ctx.authService.login(args.data);
    const { passwordHash, ...user } = result.user;
    return { token: result.token, user };
  }

  public async logout(
    _root: any,
    _args: any,
    ctx: IContext,
  ): Promise<boolean> {
    if (!ctx.authToken) return true;
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
    return rest;
  }

  public async changePassword(
    _root: any,
    args: { data: { currentPassword: string; newPassword: string } },
    ctx: IContext,
  ): Promise<boolean> {
    const user = requireAuth(ctx);
    return ctx.authService.changePassword(
      user.id,
      args.data.currentPassword,
      args.data.newPassword,
    );
  }

  public async deleteAccount(
    _root: any,
    _args: any,
    ctx: IContext,
  ): Promise<boolean> {
    const user = requireAuth(ctx);
    if (!ctx.authToken) throw new Error('Authentication required');
    return ctx.authService.deleteAccount(user.id, ctx.authToken);
  }
}
