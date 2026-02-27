import * as crypto from 'crypto';
import {
  IProjectApiKeyRepository,
  ProjectApiKey,
} from '@server/repositories/projectApiKeyRepository';
import { IUserRepository } from '@server/repositories/userRepository';

const KEY_PREFIX = 'psk-';
const KEY_RANDOM_BYTES = 32; // 64 hex chars → full key = "psk-" + 64 chars = 68 chars
const DISPLAY_SUFFIX_LENGTH = 4; // last 4 chars shown in masked display

export interface CreateProjectApiKeyInput {
  projectId: number;
  organizationId: number;
  name: string;
  permissions?: string[];
  createdBy: number;
  expiresAt?: string;
}

export interface ProjectApiKeyInfo {
  id: number;
  projectId: number;
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

export interface CreateProjectApiKeyResult {
  key: ProjectApiKeyInfo;
  secretKey: string; // full key, shown once
}

export interface ValidateProjectApiKeyResult {
  projectId: number;
  organizationId: number;
  permissions: string[];
  keyId: number;
}

export interface IProjectApiKeyService {
  createKey(
    input: CreateProjectApiKeyInput,
  ): Promise<CreateProjectApiKeyResult>;
  listKeys(projectId: number): Promise<ProjectApiKeyInfo[]>;
  validateKey(
    rawKey: string,
  ): Promise<ValidateProjectApiKeyResult | null>;
  revokeKey(keyId: number, projectId: number): Promise<boolean>;
  deleteKey(keyId: number, projectId: number): Promise<boolean>;
}

export class ProjectApiKeyService implements IProjectApiKeyService {
  private readonly projectApiKeyRepository: IProjectApiKeyRepository;
  private readonly userRepository: IUserRepository;

  constructor({
    projectApiKeyRepository,
    userRepository,
  }: {
    projectApiKeyRepository: IProjectApiKeyRepository;
    userRepository: IUserRepository;
  }) {
    this.projectApiKeyRepository = projectApiKeyRepository;
    this.userRepository = userRepository;
  }

  public async createKey(
    input: CreateProjectApiKeyInput,
  ): Promise<CreateProjectApiKeyResult> {
    const { projectId, organizationId, name, permissions, createdBy, expiresAt } =
      input;

    if (!name || name.trim().length === 0) {
      throw new Error('API key name is required');
    }

    // Generate the raw key
    const randomPart = crypto.randomBytes(KEY_RANDOM_BYTES).toString('hex');
    const fullKey = `${KEY_PREFIX}${randomPart}`;

    // Hash the key for storage (SHA-256)
    const keyHash = crypto
      .createHash('sha256')
      .update(fullKey)
      .digest('hex');

    // Store the prefix for display/lookup: "psk-" + first 4 hex chars
    const keyPrefix = fullKey.substring(0, KEY_PREFIX.length + 4);

    const permissionsJson = permissions
      ? JSON.stringify(permissions)
      : JSON.stringify(['*']);

    const record = await this.projectApiKeyRepository.createOne({
      projectId,
      organizationId,
      name: name.trim(),
      keyPrefix,
      keyHash,
      permissions: permissionsJson,
      createdBy,
      expiresAt: expiresAt || null,
    } as Partial<ProjectApiKey>);

    const creator = await this.userRepository.findOneBy({ id: createdBy });

    return {
      key: this.toApiKeyInfo(record, creator?.email),
      secretKey: fullKey,
    };
  }

  public async listKeys(projectId: number): Promise<ProjectApiKeyInfo[]> {
    const records =
      await this.projectApiKeyRepository.findAllByProject(projectId);

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
  ): Promise<ValidateProjectApiKeyResult | null> {
    if (!rawKey || !rawKey.startsWith(KEY_PREFIX)) {
      return null;
    }

    // Extract the prefix to look up the key
    const prefix = rawKey.substring(0, KEY_PREFIX.length + 4);
    const record =
      await this.projectApiKeyRepository.findActiveByPrefix(prefix);
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
    this.projectApiKeyRepository.updateLastUsed(record.id).catch(() => {});

    const permissions = record.permissions
      ? JSON.parse(record.permissions)
      : ['*'];

    return {
      projectId: record.projectId,
      organizationId: record.organizationId,
      permissions,
      keyId: record.id,
    };
  }

  public async revokeKey(
    keyId: number,
    projectId: number,
  ): Promise<boolean> {
    const record = await this.projectApiKeyRepository.findOneBy({
      id: keyId,
    } as Partial<ProjectApiKey>);

    if (!record || record.projectId !== projectId) {
      throw new Error('Project API key not found');
    }
    if (record.revokedAt) {
      throw new Error('Project API key is already revoked');
    }

    await this.projectApiKeyRepository.revoke(keyId);
    return true;
  }

  public async deleteKey(
    keyId: number,
    projectId: number,
  ): Promise<boolean> {
    const record = await this.projectApiKeyRepository.findOneBy({
      id: keyId,
    } as Partial<ProjectApiKey>);

    if (!record || record.projectId !== projectId) {
      throw new Error('Project API key not found');
    }

    await this.projectApiKeyRepository.deleteOne(keyId);
    return true;
  }

  private toApiKeyInfo(
    record: ProjectApiKey,
    createdByEmail?: string,
  ): ProjectApiKeyInfo {
    const suffix = record.keyHash.slice(-DISPLAY_SUFFIX_LENGTH);
    const masked = `${record.keyPrefix}${'*'.repeat(12)}${suffix}`;

    const permissions = record.permissions
      ? JSON.parse(record.permissions)
      : ['*'];

    return {
      id: record.id,
      projectId: record.projectId,
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
