import * as crypto from 'crypto';
import { Issuer, Client, generators } from 'openid-client';
import {
  IOidcProviderRepository,
  OidcProvider,
} from '@server/repositories/oidcProviderRepository';
import {
  IUserIdentityRepository,
  UserIdentity,
} from '@server/repositories/userIdentityRepository';
import {
  IUserRepository,
  User,
} from '@server/repositories/userRepository';
import {
  ISessionRepository,
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
import { Encryptor } from '@server/utils/encryptor';

const SESSION_TOKEN_BYTES = 48;
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface OidcProviderPublicInfo {
  slug: string;
  displayName: string;
  issuerUrl: string;
  emailDomainFilter: string | null;
  enabled: boolean;
}

export interface OidcAuthUrlResult {
  url: string;
  state: string;
  nonce: string;
}

export interface OidcCallbackResult {
  token: string;
  user: User;
}

export interface LinkedIdentityInfo {
  id: number;
  providerSlug: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  createdAt: string;
}

export interface OidcProviderAdminInfo {
  id: number;
  slug: string;
  displayName: string;
  issuerUrl: string;
  clientId: string;
  scopes: string;
  emailDomainFilter: string | null;
  autoCreateOrg: boolean;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOidcProviderInput {
  slug: string;
  displayName: string;
  issuerUrl: string;
  clientId: string;
  clientSecret: string;
  scopes?: string;
  emailDomainFilter?: string;
  autoCreateOrg?: boolean;
  enabled?: boolean;
}

export interface UpdateOidcProviderInput {
  displayName?: string;
  issuerUrl?: string;
  clientId?: string;
  clientSecret?: string;
  scopes?: string;
  emailDomainFilter?: string;
  autoCreateOrg?: boolean;
  enabled?: boolean;
}

export interface IOidcService {
  listProviders(): Promise<OidcProviderPublicInfo[]>;
  listAllProviders(): Promise<OidcProviderAdminInfo[]>;
  createProvider(input: CreateOidcProviderInput): Promise<OidcProviderAdminInfo>;
  updateProvider(id: number, input: UpdateOidcProviderInput): Promise<OidcProviderAdminInfo>;
  deleteProvider(id: number): Promise<boolean>;
  getAuthorizationUrl(
    providerSlug: string,
    callbackUrl: string,
  ): Promise<OidcAuthUrlResult>;
  handleCallback(
    providerSlug: string,
    code: string,
    state: string,
    nonce: string,
    callbackUrl: string,
  ): Promise<OidcCallbackResult>;
  listLinkedIdentities(userId: number): Promise<LinkedIdentityInfo[]>;
  unlinkIdentity(userId: number, identityId: number): Promise<boolean>;
}

export class OidcService implements IOidcService {
  private readonly oidcProviderRepository: IOidcProviderRepository;
  private readonly userIdentityRepository: IUserIdentityRepository;
  private readonly userRepository: IUserRepository;
  private readonly sessionRepository: ISessionRepository;
  private readonly organizationRepository: IOrganizationRepository;
  private readonly memberRepository: IMemberRepository;
  private readonly projectRepository: IProjectRepository;
  private readonly encryptor: Encryptor;

  constructor({
    oidcProviderRepository,
    userIdentityRepository,
    userRepository,
    sessionRepository,
    organizationRepository,
    memberRepository,
    projectRepository,
    encryptionPassword,
    encryptionSalt,
  }: {
    oidcProviderRepository: IOidcProviderRepository;
    userIdentityRepository: IUserIdentityRepository;
    userRepository: IUserRepository;
    sessionRepository: ISessionRepository;
    organizationRepository: IOrganizationRepository;
    memberRepository: IMemberRepository;
    projectRepository: IProjectRepository;
    encryptionPassword: string;
    encryptionSalt: string;
  }) {
    this.oidcProviderRepository = oidcProviderRepository;
    this.userIdentityRepository = userIdentityRepository;
    this.userRepository = userRepository;
    this.sessionRepository = sessionRepository;
    this.organizationRepository = organizationRepository;
    this.memberRepository = memberRepository;
    this.projectRepository = projectRepository;
    this.encryptor = new Encryptor({
      encryptionPassword,
      encryptionSalt,
    });
  }

  public async listProviders(): Promise<OidcProviderPublicInfo[]> {
    const providers = await this.oidcProviderRepository.listEnabled();
    return providers.map((p) => ({
      slug: p.slug,
      displayName: p.displayName,
      issuerUrl: p.issuerUrl,
      emailDomainFilter: p.emailDomainFilter,
      enabled: p.enabled,
    }));
  }

  public async getAuthorizationUrl(
    providerSlug: string,
    callbackUrl: string,
  ): Promise<OidcAuthUrlResult> {
    const provider = await this.getEnabledProvider(providerSlug);
    const client = await this.buildOidcClient(provider, callbackUrl);

    const state = generators.state();
    const nonce = generators.nonce();

    const scopes = provider.scopes || 'openid email profile';

    const url = client.authorizationUrl({
      scope: scopes,
      state,
      nonce,
      redirect_uri: callbackUrl,
    });

    return { url, state, nonce };
  }

  public async handleCallback(
    providerSlug: string,
    code: string,
    state: string,
    nonce: string,
    callbackUrl: string,
  ): Promise<OidcCallbackResult> {
    const provider = await this.getEnabledProvider(providerSlug);
    const client = await this.buildOidcClient(provider, callbackUrl);

    // Exchange code for tokens
    const params = client.callbackParams(`?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`);
    const tokenSet = await client.callback(callbackUrl, params, {
      state,
      nonce,
    });

    const claims = tokenSet.claims();
    const subject = claims.sub;
    if (!subject) {
      throw new Error('OIDC provider did not return a subject identifier');
    }

    const email = claims.email as string | undefined;
    const displayName = (claims.name || claims.preferred_username) as string | undefined;
    const avatarUrl = claims.picture as string | undefined;

    // Enforce email domain filter
    if (provider.emailDomainFilter && email) {
      const domain = email.split('@')[1]?.toLowerCase();
      const allowedDomains = provider.emailDomainFilter
        .split(',')
        .map((d) => d.trim().toLowerCase());
      if (!allowedDomains.includes(domain)) {
        throw new Error(
          `Email domain "${domain}" is not allowed for this provider`,
        );
      }
    }

    // Check if identity already exists
    let identity = await this.userIdentityRepository.findByProviderAndSubject(
      providerSlug,
      subject,
    );

    let user: User;

    if (identity) {
      // Existing identity — get the user
      const existingUser = await this.userRepository.findOneBy({
        id: identity.userId,
      } as any);
      if (!existingUser) {
        throw new Error('Linked user account no longer exists');
      }
      if (!existingUser.isActive) {
        throw new Error('Account is deactivated');
      }
      user = existingUser;

      // Update identity with latest claims
      await this.userIdentityRepository.updateOne(identity.id, {
        email: email || identity.email,
        displayName: displayName || identity.displayName,
        avatarUrl: avatarUrl || identity.avatarUrl,
        rawClaims: JSON.stringify(claims),
      } as Partial<UserIdentity>);
    } else {
      // No existing identity — find or create user by email
      if (!email) {
        throw new Error(
          'OIDC provider did not return an email. Cannot create account.',
        );
      }

      let existingUser = await this.userRepository.findByEmail(email);

      if (existingUser) {
        if (!existingUser.isActive) {
          throw new Error('Account is deactivated');
        }
        user = existingUser;
      } else {
        // Create a new user (no password — OIDC-only)
        user = await this.userRepository.createOne({
          email,
          passwordHash: null,
          displayName: displayName || email.split('@')[0],
          emailVerified: true, // trust the OIDC provider's email
        } as any);

        // Create personal organization
        const slug = this.generateOrgSlug(email);
        const org = await this.organizationRepository.createOne({
          displayName: `${user.displayName || email.split('@')[0]}'s Organization`,
          slug,
        } as any);

        await this.memberRepository.createOne({
          organizationId: org.id,
          userId: user.id,
          role: MemberRole.OWNER,
        } as any);

        await this.projectRepository.createOne({
          displayName: 'Default Project',
          catalog: 'wrenai',
          schema: 'public',
          language: 'EN',
          organizationId: org.id,
        } as any);
      }

      // Link the identity
      await this.userIdentityRepository.createOne({
        userId: user.id,
        providerSlug,
        subject,
        email: email || null,
        displayName: displayName || null,
        avatarUrl: avatarUrl || null,
        rawClaims: JSON.stringify(claims),
      } as Partial<UserIdentity>);
    }

    // Update last login
    await this.userRepository.updateOne(user.id, {
      lastLoginAt: new Date().toISOString(),
    });

    // Invalidate previous sessions and create a new one
    await this.sessionRepository.deleteAllByUserId(user.id);
    const session = await this.createSession(user.id);

    // Re-fetch user to get latest data
    const freshUser = await this.userRepository.findOneBy({ id: user.id } as any);

    return { token: session.token, user: freshUser || user };
  }

  public async listLinkedIdentities(
    userId: number,
  ): Promise<LinkedIdentityInfo[]> {
    const identities =
      await this.userIdentityRepository.findAllByUserId(userId);
    return identities.map((i) => ({
      id: i.id,
      providerSlug: i.providerSlug,
      email: i.email,
      displayName: i.displayName,
      avatarUrl: i.avatarUrl,
      createdAt: i.createdAt,
    }));
  }

  public async unlinkIdentity(
    userId: number,
    identityId: number,
  ): Promise<boolean> {
    const identities =
      await this.userIdentityRepository.findAllByUserId(userId);

    const target = identities.find((i) => i.id === identityId);
    if (!target) {
      throw new Error('Identity not found or does not belong to you');
    }

    // Ensure user has a password or another linked identity
    const user = await this.userRepository.findOneBy({ id: userId } as any);
    if (!user) {
      throw new Error('User not found');
    }

    const hasPassword = !!user.passwordHash;
    const otherIdentities = identities.filter((i) => i.id !== identityId);

    if (!hasPassword && otherIdentities.length === 0) {
      throw new Error(
        'Cannot unlink your only sign-in method. Set a password first.',
      );
    }

    await this.userIdentityRepository.deleteOne(identityId);
    return true;
  }

  // ── Private helpers ────────────────────────────────────────

  private async getEnabledProvider(slug: string): Promise<OidcProvider> {
    const provider = await this.oidcProviderRepository.findBySlug(slug);
    if (!provider) {
      throw new Error(`OIDC provider "${slug}" not found`);
    }
    if (!provider.enabled) {
      throw new Error(`OIDC provider "${slug}" is disabled`);
    }
    return provider;
  }

  private async buildOidcClient(
    provider: OidcProvider,
    callbackUrl: string,
  ): Promise<Client> {
    const issuer = await Issuer.discover(provider.issuerUrl);

    const clientSecret = this.encryptor.decrypt(
      provider.clientSecretEncrypted,
    );

    return new issuer.Client({
      client_id: provider.clientId,
      client_secret: clientSecret,
      redirect_uris: [callbackUrl],
      response_types: ['code'],
    });
  }

  private async createSession(userId: number) {
    const token = crypto.randomBytes(SESSION_TOKEN_BYTES).toString('hex');
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString();
    return this.sessionRepository.createOne({
      userId,
      token,
      expiresAt,
    } as any);
  }

  private generateOrgSlug(email: string): string {
    const prefix = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '-');
    const suffix = crypto.randomBytes(4).toString('hex');
    return `${prefix}-${suffix}`;
  }

  // ── Admin CRUD methods ─────────────────────────────────────

  private toAdminInfo(p: OidcProvider): OidcProviderAdminInfo {
    return {
      id: p.id,
      slug: p.slug,
      displayName: p.displayName,
      issuerUrl: p.issuerUrl,
      clientId: p.clientId,
      scopes: p.scopes,
      emailDomainFilter: p.emailDomainFilter,
      autoCreateOrg: p.autoCreateOrg,
      enabled: p.enabled,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    };
  }

  private encryptSecret(secret: string): string {
    return this.encryptor.encrypt(
      JSON.parse(JSON.stringify({ secret })) as any,
    );
  }

  public async listAllProviders(): Promise<OidcProviderAdminInfo[]> {
    const providers = await this.oidcProviderRepository.findAll();
    return providers.map((p) => this.toAdminInfo(p));
  }

  public async createProvider(
    input: CreateOidcProviderInput,
  ): Promise<OidcProviderAdminInfo> {
    // Validate slug format
    if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(input.slug) || input.slug.length < 2) {
      throw new Error(
        'Slug must be lowercase alphanumeric with hyphens, at least 2 characters',
      );
    }

    // Check for duplicate slug
    const existing = await this.oidcProviderRepository.findBySlug(input.slug);
    if (existing) {
      throw new Error(`Provider with slug "${input.slug}" already exists`);
    }

    const encrypted = this.encryptSecret(input.clientSecret);

    const provider = await this.oidcProviderRepository.createOne({
      slug: input.slug,
      displayName: input.displayName,
      issuerUrl: input.issuerUrl,
      clientId: input.clientId,
      clientSecretEncrypted: encrypted,
      scopes: input.scopes || 'openid email profile',
      emailDomainFilter: input.emailDomainFilter || null,
      autoCreateOrg: input.autoCreateOrg ?? true,
      enabled: input.enabled ?? true,
    } as Partial<OidcProvider>);

    return this.toAdminInfo(provider);
  }

  public async updateProvider(
    id: number,
    input: UpdateOidcProviderInput,
  ): Promise<OidcProviderAdminInfo> {
    const existing = await this.oidcProviderRepository.findOneBy({ id } as any);
    if (!existing) {
      throw new Error('OIDC provider not found');
    }

    const updates: Partial<OidcProvider> = {};

    if (input.displayName !== undefined) updates.displayName = input.displayName;
    if (input.issuerUrl !== undefined) updates.issuerUrl = input.issuerUrl;
    if (input.clientId !== undefined) updates.clientId = input.clientId;
    if (input.scopes !== undefined) updates.scopes = input.scopes;
    if (input.emailDomainFilter !== undefined)
      updates.emailDomainFilter = input.emailDomainFilter || null;
    if (input.autoCreateOrg !== undefined)
      updates.autoCreateOrg = input.autoCreateOrg;
    if (input.enabled !== undefined) updates.enabled = input.enabled;

    // Re-encrypt if client secret changed
    if (input.clientSecret) {
      updates.clientSecretEncrypted = this.encryptSecret(input.clientSecret);
    }

    const updated = await this.oidcProviderRepository.updateOne(id, updates);
    return this.toAdminInfo(updated);
  }

  public async deleteProvider(id: number): Promise<boolean> {
    const existing = await this.oidcProviderRepository.findOneBy({ id } as any);
    if (!existing) {
      throw new Error('OIDC provider not found');
    }

    // Delete all linked identities for this provider
    const identities = await this.userIdentityRepository.findAllBy({
      providerSlug: existing.slug,
    } as any);
    for (const identity of identities) {
      await this.userIdentityRepository.deleteOne(identity.id);
    }

    await this.oidcProviderRepository.deleteOne(id);
    return true;
  }
}
