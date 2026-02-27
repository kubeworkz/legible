import * as crypto from 'crypto';
import {
  IOrgApiKeyRepository,
  OrgApiKey,
} from '@server/repositories/orgApiKeyRepository';
import { IUserRepository } from '@server/repositories/userRepository';

const KEY_PREFIX = 'osk-';
const KEY_RANDOM_BYTES = 32; // 64 hex chars → full key = "osk-" + 64 chars = 68 chars
const DISPLAY_SUFFIX_LENGTH = 4; // last 4 chars shown in masked display

export enum ApiKeyPermission {
  FULL_ACCESS = '*',
  PROJECTS_READ = 'projects:read',
  PROJECTS_WRITE = 'projects:write',
  ASK_INVOKE = 'ask:invoke',
  MODELS_READ = 'models:read',
  MODELS_WRITE = 'models:write',
  THREADS_READ = 'threads:read',
  THREADS_WRITE = 'threads:write',
}

export interface CreateApiKeyInput {
  organizationId: number;
  name: string;
  permissions?: string[];
  createdBy: number;
  expiresAt?: string;
}

export interface ApiKeyInfo {
  id: number;
  organizationId: number;
  name: string;
  secretKeyMasked: string;
  permissions: string[];
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdBy: number;
  createdByEmail?: string;
  createdAt: string;
  revokedAt: string | null;
}

export interface CreateApiKeyResult {
  key: ApiKeyInfo;
  secretKey: string; // full key, shown once
}

export interface ValidateApiKeyResult {
  organizationId: number;
  permissions: string[];
  keyId: number;
}

export interface IOrgApiKeyService {
  createKey(input: CreateApiKeyInput): Promise<CreateApiKeyResult>;
  listKeys(organizationId: number): Promise<ApiKeyInfo[]>;
  validateKey(rawKey: string): Promise<ValidateApiKeyResult | null>;
  revokeKey(keyId: number, organizationId: number): Promise<boolean>;
  deleteKey(keyId: number, organizationId: number): Promise<boolean>;
}

export class OrgApiKeyService implements IOrgApiKeyService {
  private readonly orgApiKeyRepository: IOrgApiKeyRepository;
  private readonly userRepository: IUserRepository;

  constructor({
    orgApiKeyRepository,
    userRepository,
  }: {
    orgApiKeyRepository: IOrgApiKeyRepository;
    userRepository: IUserRepository;
  }) {
    this.orgApiKeyRepository = orgApiKeyRepository;
    this.userRepository = userRepository;
  }

  public async createKey(input: CreateApiKeyInput): Promise<CreateApiKeyResult> {
    const { organizationId, name, permissions, createdBy, expiresAt } = input;

    if (!name || name.trim().length === 0) {
      throw new Error('API key name is required');
    }

    // Generate the raw key
    const randomPart = crypto.randomBytes(KEY_RANDOM_BYTES).toString('hex');
    const fullKey = `${KEY_PREFIX}${randomPart}`;

    // Hash the key for storage (SHA-256, not bcrypt — we need prefix lookups)
    const keyHash = crypto
      .createHash('sha256')
      .update(fullKey)
      .digest('hex');

    // Store the prefix for display/lookup: "osk-" + last N chars
    const keyPrefix = fullKey.substring(0, KEY_PREFIX.length + 4);

    const permissionsJson = permissions
      ? JSON.stringify(permissions)
      : JSON.stringify([ApiKeyPermission.FULL_ACCESS]);

    const record = await this.orgApiKeyRepository.createOne({
      organizationId,
      name: name.trim(),
      keyPrefix,
      keyHash,
      permissions: permissionsJson,
      createdBy,
      expiresAt: expiresAt || null,
    } as Partial<OrgApiKey>);

    const creator = await this.userRepository.findOneBy({ id: createdBy });

    return {
      key: this.toApiKeyInfo(record, creator?.email),
      secretKey: fullKey,
    };
  }

  public async listKeys(organizationId: number): Promise<ApiKeyInfo[]> {
    const records =
      await this.orgApiKeyRepository.findAllByOrganization(organizationId);

    // Batch-load creator emails
    const creatorIds = [...new Set(records.map((r) => r.createdBy))];
    const creators = await Promise.all(
      creatorIds.map((id) => this.userRepository.findOneBy({ id })),
    );
    const emailMap = new Map<number, string>();
    creators.forEach((u) => {
      if (u) emailMap.set(u.id, u.email);
    });

    return records.map((r) => this.toApiKeyInfo(r, emailMap.get(r.createdBy)));
  }

  public async validateKey(
    rawKey: string,
  ): Promise<ValidateApiKeyResult | null> {
    if (!rawKey || !rawKey.startsWith(KEY_PREFIX)) {
      return null;
    }

    // Extract the prefix to look up the key
    const prefix = rawKey.substring(0, KEY_PREFIX.length + 4);
    const record = await this.orgApiKeyRepository.findActiveByPrefix(prefix);
    if (!record) return null;

    // Verify the full hash matches
    const hash = crypto
      .createHash('sha256')
      .update(rawKey)
      .digest('hex');

    if (hash !== record.keyHash) return null;

    // Check expiry
    if (record.expiresAt && new Date(record.expiresAt) < new Date()) {
      return null;
    }

    // Update last used (fire-and-forget)
    this.orgApiKeyRepository.updateLastUsed(record.id).catch(() => {});

    const permissions = record.permissions
      ? JSON.parse(record.permissions)
      : [ApiKeyPermission.FULL_ACCESS];

    return {
      organizationId: record.organizationId,
      permissions,
      keyId: record.id,
    };
  }

  public async revokeKey(
    keyId: number,
    organizationId: number,
  ): Promise<boolean> {
    const record = await this.orgApiKeyRepository.findOneBy({
      id: keyId,
    } as Partial<OrgApiKey>);

    if (!record || record.organizationId !== organizationId) {
      throw new Error('API key not found');
    }
    if (record.revokedAt) {
      throw new Error('API key is already revoked');
    }

    await this.orgApiKeyRepository.revoke(keyId);
    return true;
  }

  public async deleteKey(
    keyId: number,
    organizationId: number,
  ): Promise<boolean> {
    const record = await this.orgApiKeyRepository.findOneBy({
      id: keyId,
    } as Partial<OrgApiKey>);

    if (!record || record.organizationId !== organizationId) {
      throw new Error('API key not found');
    }

    await this.orgApiKeyRepository.deleteOne(keyId);
    return true;
  }

  private toApiKeyInfo(
    record: OrgApiKey,
    createdByEmail?: string,
  ): ApiKeyInfo {
    const suffix = record.keyHash.slice(-DISPLAY_SUFFIX_LENGTH);
    const masked = `${record.keyPrefix}${'*'.repeat(12)}${suffix}`;

    const permissions = record.permissions
      ? JSON.parse(record.permissions)
      : [ApiKeyPermission.FULL_ACCESS];

    return {
      id: record.id,
      organizationId: record.organizationId,
      name: record.name,
      secretKeyMasked: masked,
      permissions,
      lastUsedAt: record.lastUsedAt,
      expiresAt: record.expiresAt,
      createdBy: record.createdBy,
      createdByEmail,
      createdAt: record.createdAt,
      revokedAt: record.revokedAt,
    };
  }
}
