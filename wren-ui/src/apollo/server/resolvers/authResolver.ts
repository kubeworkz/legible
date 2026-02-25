import { IContext } from '@server/types';
import { User } from '@server/repositories/userRepository';

export class AuthResolver {
  constructor() {
    this.me = this.me.bind(this);
    this.signup = this.signup.bind(this);
    this.login = this.login.bind(this);
    this.logout = this.logout.bind(this);
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
}
