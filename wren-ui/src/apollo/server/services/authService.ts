import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import {
  IUserRepository,
  User,
} from '@server/repositories/userRepository';
import {
  ISessionRepository,
  Session,
} from '@server/repositories/sessionRepository';
import {
  IOrganizationRepository,
} from '@server/repositories/organizationRepository';
import {
  IMemberRepository,
  MemberRole,
} from '@server/repositories/memberRepository';
import {
  IProjectRepository,
} from '@server/repositories/projectRepository';

const SALT_ROUNDS = 12;
const SESSION_TOKEN_BYTES = 48;
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface SignupInput {
  email: string;
  password: string;
  displayName?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthPayload {
  token: string;
  user: User;
}

export interface IAuthService {
  signup(input: SignupInput): Promise<AuthPayload>;
  login(input: LoginInput): Promise<AuthPayload>;
  logout(token: string): Promise<boolean>;
  validateSession(token: string): Promise<User | null>;
  getUserById(id: number): Promise<User | null>;
  updateProfile(
    userId: number,
    data: { displayName?: string; avatarUrl?: string },
  ): Promise<User>;
  changePassword(
    userId: number,
    currentPassword: string,
    newPassword: string,
  ): Promise<boolean>;
  deleteAccount(userId: number, token: string): Promise<boolean>;
}

export class AuthService implements IAuthService {
  private readonly userRepository: IUserRepository;
  private readonly sessionRepository: ISessionRepository;
  private readonly organizationRepository: IOrganizationRepository;
  private readonly memberRepository: IMemberRepository;
  private readonly projectRepository: IProjectRepository;

  constructor({
    userRepository,
    sessionRepository,
    organizationRepository,
    memberRepository,
    projectRepository,
  }: {
    userRepository: IUserRepository;
    sessionRepository: ISessionRepository;
    organizationRepository: IOrganizationRepository;
    memberRepository: IMemberRepository;
    projectRepository: IProjectRepository;
  }) {
    this.userRepository = userRepository;
    this.sessionRepository = sessionRepository;
    this.organizationRepository = organizationRepository;
    this.memberRepository = memberRepository;
    this.projectRepository = projectRepository;
  }

  public async signup(input: SignupInput): Promise<AuthPayload> {
    const { email, password, displayName } = input;

    // Check if user already exists
    const existing = await this.userRepository.findByEmail(email);
    if (existing) {
      throw new Error('A user with this email already exists');
    }

    // Hash the password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Create the user
    const user = await this.userRepository.createOne({
      email,
      passwordHash,
      displayName: displayName || email.split('@')[0],
    });

    // Create a personal organization for the user
    const slug = this.generateOrgSlug(email);
    const org = await this.organizationRepository.createOne({
      displayName: displayName ? `${displayName}'s Organization` : `${email.split('@')[0]}'s Organization`,
      slug,
    });

    // Add user as owner of their personal organization
    await this.memberRepository.createOne({
      organizationId: org.id,
      userId: user.id,
      role: MemberRole.OWNER,
    });

    // Create a default project for the organization
    await this.projectRepository.createOne({
      displayName: 'Default Project',
      catalog: 'wrenai',
      schema: 'public',
      language: 'EN',
      organizationId: org.id,
    });

    // Create a session
    const session = await this.createSession(user.id);

    return { token: session.token, user };
  }

  public async login(input: LoginInput): Promise<AuthPayload> {
    const { email, password } = input;

    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new Error('Invalid email or password');
    }

    if (!user.isActive) {
      throw new Error('Account is deactivated');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new Error('Invalid email or password');
    }

    // Update last login
    await this.userRepository.updateOne(user.id, {
      lastLoginAt: new Date().toISOString(),
    });

    // Create a session
    const session = await this.createSession(user.id);

    return { token: session.token, user };
  }

  public async logout(token: string): Promise<boolean> {
    const session = await this.sessionRepository.findByToken(token);
    if (session) {
      await this.sessionRepository.deleteOne(session.id);
    }
    return true;
  }

  public async validateSession(token: string): Promise<User | null> {
    if (!token) return null;

    const session = await this.sessionRepository.findByToken(token);
    if (!session) return null;

    // Check expiration
    if (new Date(session.expiresAt) < new Date()) {
      await this.sessionRepository.deleteOne(session.id);
      return null;
    }

    const user = await this.userRepository.findOneBy({ id: session.userId });
    if (!user || !user.isActive) return null;

    return user;
  }

  public async getUserById(id: number): Promise<User | null> {
    return this.userRepository.findOneBy({ id } as Partial<User>);
  }

  public async updateProfile(
    userId: number,
    data: { displayName?: string; avatarUrl?: string },
  ): Promise<User> {
    const updates: Record<string, any> = {};
    if (data.displayName !== undefined) updates.displayName = data.displayName;
    if (data.avatarUrl !== undefined) updates.avatarUrl = data.avatarUrl;

    if (Object.keys(updates).length === 0) {
      const user = await this.userRepository.findOneBy({ id: userId } as Partial<User>);
      if (!user) throw new Error('User not found');
      return user;
    }

    await this.userRepository.updateOne(userId, updates);
    const user = await this.userRepository.findOneBy({ id: userId } as Partial<User>);
    if (!user) throw new Error('User not found');
    return user;
  }

  public async changePassword(
    userId: number,
    currentPassword: string,
    newPassword: string,
  ): Promise<boolean> {
    const user = await this.userRepository.findOneBy({ id: userId } as Partial<User>);
    if (!user) throw new Error('User not found');

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) throw new Error('Current password is incorrect');

    if (newPassword.length < 8) {
      throw new Error('New password must be at least 8 characters');
    }

    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await this.userRepository.updateOne(userId, { passwordHash });
    return true;
  }

  public async deleteAccount(userId: number, token: string): Promise<boolean> {
    // Log out the current session
    await this.logout(token);

    // Deactivate the user account
    await this.userRepository.updateOne(userId, { isActive: false });
    return true;
  }

  private async createSession(userId: number): Promise<Session> {
    const token = crypto.randomBytes(SESSION_TOKEN_BYTES).toString('hex');
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString();

    return this.sessionRepository.createOne({
      userId,
      token,
      expiresAt,
    });
  }

  private generateOrgSlug(email: string): string {
    const base = email.split('@')[0].replace(/[^a-z0-9]/gi, '-').toLowerCase();
    const suffix = crypto.randomBytes(4).toString('hex');
    return `${base}-${suffix}`;
  }
}
