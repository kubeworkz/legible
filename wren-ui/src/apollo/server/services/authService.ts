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
import {
  IMagicLinkRepository,
} from '@server/repositories/magicLinkRepository';
import {
  IOidcProviderRepository,
} from '@server/repositories/oidcProviderRepository';
import { IEmailService } from './emailService';

const SALT_ROUNDS = 12;
const SESSION_TOKEN_BYTES = 48;
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const VERIFICATION_TOKEN_BYTES = 32;
const VERIFICATION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAGIC_LINK_TOKEN_BYTES = 32;
const MAGIC_LINK_DURATION_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Validates password meets minimum security requirements.
 * Throws descriptive error if any rule fails.
 */
function validatePassword(password: string): void {
  if (!password || password.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }
  if (!/[A-Z]/.test(password)) {
    throw new Error('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    throw new Error('Password must contain at least one lowercase letter');
  }
  if (!/\d/.test(password)) {
    throw new Error('Password must contain at least one digit');
  }
}

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
  verifyEmail(token: string): Promise<boolean>;
  resendVerificationEmail(userId: number): Promise<boolean>;
  requestMagicLink(email: string): Promise<boolean>;
  loginWithMagicLink(token: string): Promise<AuthPayload>;
}

export class AuthService implements IAuthService {
  private readonly userRepository: IUserRepository;
  private readonly sessionRepository: ISessionRepository;
  private readonly organizationRepository: IOrganizationRepository;
  private readonly memberRepository: IMemberRepository;
  private readonly projectRepository: IProjectRepository;
  private readonly magicLinkRepository: IMagicLinkRepository;
  private readonly oidcProviderRepository: IOidcProviderRepository;
  private readonly emailService: IEmailService;

  constructor({
    userRepository,
    sessionRepository,
    organizationRepository,
    memberRepository,
    projectRepository,
    magicLinkRepository,
    oidcProviderRepository,
    emailService,
  }: {
    userRepository: IUserRepository;
    sessionRepository: ISessionRepository;
    organizationRepository: IOrganizationRepository;
    memberRepository: IMemberRepository;
    projectRepository: IProjectRepository;
    magicLinkRepository: IMagicLinkRepository;
    oidcProviderRepository: IOidcProviderRepository;
    emailService: IEmailService;
  }) {
    this.userRepository = userRepository;
    this.sessionRepository = sessionRepository;
    this.organizationRepository = organizationRepository;
    this.memberRepository = memberRepository;
    this.projectRepository = projectRepository;
    this.magicLinkRepository = magicLinkRepository;
    this.oidcProviderRepository = oidcProviderRepository;
    this.emailService = emailService;
  }

  public async signup(input: SignupInput): Promise<AuthPayload> {
    const { email, password, displayName } = input;

    // Validate password strength
    validatePassword(password);

    // Check SSO enforcement before allowing password signup
    const domain = email.split('@')[1]?.toLowerCase();
    if (domain) {
      const enforced =
        await this.oidcProviderRepository.findEnforcedByDomain(domain);
      if (enforced) {
        throw new Error(
          `Your organization requires SSO. Please sign in with ${enforced.displayName}.`,
        );
      }
    }

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

    // Generate email verification token and send verification email (best-effort)
    try {
      const verificationToken = crypto
        .randomBytes(VERIFICATION_TOKEN_BYTES)
        .toString('hex');
      const verificationExpiresAt = new Date(
        Date.now() + VERIFICATION_DURATION_MS,
      ).toISOString();

      await this.userRepository.updateOne(user.id, {
        emailVerificationToken: verificationToken,
        emailVerificationExpiresAt: verificationExpiresAt,
      });

      await this.emailService.sendVerificationEmail({
        to: email,
        displayName: user.displayName || email.split('@')[0],
        token: verificationToken,
      });
    } catch (err) {
      // Don't block signup if email sending fails
      console.error('Failed to send verification email:', err);
    }

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

    // OIDC-only users have no password
    if (!user.passwordHash) {
      throw new Error('This account uses external sign-in. Please use your identity provider.');
    }

    // Check SSO enforcement — block password login if domain is SSO-enforced
    const domain = email.split('@')[1]?.toLowerCase();
    if (domain) {
      const enforced =
        await this.oidcProviderRepository.findEnforcedByDomain(domain);
      if (enforced) {
        throw new Error(
          `Your organization requires SSO. Please sign in with ${enforced.displayName}.`,
        );
      }
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new Error('Invalid email or password');
    }

    // Update last login
    await this.userRepository.updateOne(user.id, {
      lastLoginAt: new Date().toISOString(),
    });

    // Invalidate all previous sessions on login to prevent
    // accumulation of unlimited concurrent sessions
    await this.sessionRepository.deleteAllByUserId(user.id);

    // Create a new session
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

    // OIDC-only users have no password to verify against
    if (!user.passwordHash) {
      throw new Error('This account uses external sign-in and has no password. Set a password first.');
    }

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) throw new Error('Current password is incorrect');

    // Validate new password strength
    validatePassword(newPassword);

    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await this.userRepository.updateOne(userId, { passwordHash });

    // Invalidate all existing sessions — the user must re-login
    await this.sessionRepository.deleteAllByUserId(userId);

    return true;
  }

  public async deleteAccount(userId: number, token: string): Promise<boolean> {
    // Log out the current session
    await this.logout(token);

    // Deactivate the user account
    await this.userRepository.updateOne(userId, { isActive: false });
    return true;
  }

  public async verifyEmail(token: string): Promise<boolean> {
    if (!token) throw new Error('Verification token is required');

    // Find user by verification token
    const user = await this.userRepository.findOneBy({
      emailVerificationToken: token,
    } as Partial<User>);
    if (!user) throw new Error('Invalid verification token');

    if (user.emailVerified) return true; // Already verified

    // Check expiration
    if (
      user.emailVerificationExpiresAt &&
      new Date(user.emailVerificationExpiresAt) < new Date()
    ) {
      throw new Error(
        'Verification token has expired. Please request a new one.',
      );
    }

    // Mark email as verified and clear the token
    await this.userRepository.updateOne(user.id, {
      emailVerified: true,
      emailVerificationToken: null,
      emailVerificationExpiresAt: null,
    });

    return true;
  }

  public async resendVerificationEmail(userId: number): Promise<boolean> {
    const user = await this.userRepository.findOneBy({
      id: userId,
    } as Partial<User>);
    if (!user) throw new Error('User not found');
    if (user.emailVerified) throw new Error('Email is already verified');

    // Generate a new token
    const verificationToken = crypto
      .randomBytes(VERIFICATION_TOKEN_BYTES)
      .toString('hex');
    const verificationExpiresAt = new Date(
      Date.now() + VERIFICATION_DURATION_MS,
    ).toISOString();

    await this.userRepository.updateOne(user.id, {
      emailVerificationToken: verificationToken,
      emailVerificationExpiresAt: verificationExpiresAt,
    });

    await this.emailService.sendVerificationEmail({
      to: user.email,
      displayName: user.displayName || user.email.split('@')[0],
      token: verificationToken,
    });

    return true;
  }

  public async requestMagicLink(email: string): Promise<boolean> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      // Don't reveal whether the email exists — return true silently
      return true;
    }
    if (!user.isActive) return true;

    // Clean up old/used tokens for this user
    await this.magicLinkRepository.deleteExpiredByUserId(user.id);

    // Generate magic link token
    const token = crypto
      .randomBytes(MAGIC_LINK_TOKEN_BYTES)
      .toString('hex');
    const expiresAt = new Date(
      Date.now() + MAGIC_LINK_DURATION_MS,
    ).toISOString();

    await this.magicLinkRepository.createOne({
      userId: user.id,
      token,
      expiresAt,
    });

    await this.emailService.sendMagicLinkEmail({
      to: user.email,
      displayName: user.displayName || user.email.split('@')[0],
      token,
    });

    return true;
  }

  public async loginWithMagicLink(token: string): Promise<AuthPayload> {
    if (!token) throw new Error('Magic link token is required');

    const magicLink = await this.magicLinkRepository.findByToken(token);
    if (!magicLink) throw new Error('Invalid or expired magic link');

    // Check if already used
    if (magicLink.usedAt) {
      throw new Error('This magic link has already been used');
    }

    // Check expiration
    if (new Date(magicLink.expiresAt) < new Date()) {
      throw new Error('This magic link has expired');
    }

    // Mark as used
    await this.magicLinkRepository.updateOne(magicLink.id, {
      usedAt: new Date().toISOString(),
    });

    const user = await this.userRepository.findOneBy({
      id: magicLink.userId,
    } as Partial<User>);
    if (!user || !user.isActive) {
      throw new Error('Account not found or deactivated');
    }

    // Magic link login proves email ownership — auto-verify if needed
    if (!user.emailVerified) {
      await this.userRepository.updateOne(user.id, {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpiresAt: null,
      });
      user.emailVerified = true;
    }

    // Update last login
    await this.userRepository.updateOne(user.id, {
      lastLoginAt: new Date().toISOString(),
    });

    // Invalidate previous sessions
    await this.sessionRepository.deleteAllByUserId(user.id);

    // Create a new session
    const session = await this.createSession(user.id);

    return { token: session.token, user };
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
