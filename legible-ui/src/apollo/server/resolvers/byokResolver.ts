import { IContext } from '../types';
import { getConfig } from '../config';
import { Encryptor, getLogger } from '../utils';
import { requireAuth, requireProjectAdmin } from '../utils/authGuard';
import { ProjectRole } from '../repositories/projectMemberRepository';
import {
  AuditCategory,
  AuditAction,
} from '@server/repositories/auditLogRepository';

const logger = getLogger('ByokResolver');
logger.level = 'debug';

const config = getConfig();
const encryptor = new Encryptor(config);

/**
 * Encrypt a plain-text API key for storage.
 * The Encryptor expects a JSON object, so we wrap the key.
 */
function encryptApiKey(apiKey: string): string {
  return encryptor.encrypt(JSON.parse(JSON.stringify({ key: apiKey })));
}

/**
 * Decrypt a stored API key back to plain text.
 */
function decryptApiKey(encrypted: string): string {
  const decrypted = encryptor.decrypt(encrypted);
  const parsed = JSON.parse(decrypted);
  return parsed.key;
}

/**
 * Mask an API key for display: show first 4 and last 4 characters.
 */
function maskApiKey(apiKey: string): string {
  if (apiKey.length <= 8) {
    return '****';
  }
  return `${apiKey.slice(0, 4)}${'*'.repeat(Math.min(apiKey.length - 8, 20))}${apiKey.slice(-4)}`;
}

export class ByokResolver {
  constructor() {
    this.getProjectLlmConfig = this.getProjectLlmConfig.bind(this);
    this.setProjectLlmKey = this.setProjectLlmKey.bind(this);
    this.clearProjectLlmKey = this.clearProjectLlmKey.bind(this);
  }

  /**
   * Query: projectLlmConfig
   * Returns whether the project has a BYOK key, the provider, and a masked key.
   */
  public async getProjectLlmConfig(
    _root: any,
    _arg: any,
    ctx: IContext,
  ) {
    requireAuth(ctx);
    const project = await ctx.projectRepository.getCurrentProject(ctx.projectId);
    if (!project.llmApiKey) {
      return {
        hasApiKey: false,
        provider: null,
        maskedApiKey: null,
      };
    }
    try {
      const plainKey = decryptApiKey(project.llmApiKey);
      return {
        hasApiKey: true,
        provider: project.llmProvider || 'openrouter',
        maskedApiKey: maskApiKey(plainKey),
      };
    } catch (err) {
      logger.error(`Failed to decrypt LLM API key for project ${project.id}: ${err}`);
      return {
        hasApiKey: true,
        provider: project.llmProvider || 'openrouter',
        maskedApiKey: '****',
      };
    }
  }

  /**
   * Mutation: setProjectLlmKey(data: SetProjectLlmKeyInput!)
   * Sets the BYOK LLM API key for the current project.
   */
  public async setProjectLlmKey(
    _root: any,
    arg: { data: { apiKey: string; provider?: string } },
    ctx: IContext,
  ) {
    const user = requireAuth(ctx);
    requireProjectAdmin(ctx);
    const project = await ctx.projectRepository.getCurrentProject(ctx.projectId);

    const { apiKey, provider } = arg.data;
    if (!apiKey || apiKey.trim().length === 0) {
      throw new Error('API key cannot be empty');
    }

    const encrypted = encryptApiKey(apiKey.trim());
    const llmProvider = provider?.trim() || 'openrouter';

    await ctx.projectRepository.updateOne(project.id, {
      llmApiKey: encrypted,
      llmProvider,
    } as any);

    logger.info(`BYOK key set for project ${project.id} (provider: ${llmProvider})`);

    // Audit log
    ctx.auditLogService?.log({
      userId: user.id,
      userEmail: user.email,
      clientIp: ctx.clientIp,
      organizationId: ctx.organizationId,
      projectId: project.id,
      category: AuditCategory.PROJECT,
      action: AuditAction.PROJECT_UPDATED,
      targetType: 'project',
      targetId: project.id,
      detail: { action: 'set_byok_key', provider: llmProvider },
    });

    return {
      hasApiKey: true,
      provider: llmProvider,
      maskedApiKey: maskApiKey(apiKey.trim()),
    };
  }

  /**
   * Mutation: clearProjectLlmKey
   * Removes the BYOK key, reverting to the system default.
   */
  public async clearProjectLlmKey(
    _root: any,
    _arg: any,
    ctx: IContext,
  ) {
    const user = requireAuth(ctx);
    requireProjectAdmin(ctx);
    const project = await ctx.projectRepository.getCurrentProject(ctx.projectId);

    await ctx.projectRepository.updateOne(project.id, {
      llmApiKey: null,
      llmProvider: null,
    } as any);

    logger.info(`BYOK key cleared for project ${project.id}`);

    // Audit log
    ctx.auditLogService?.log({
      userId: user.id,
      userEmail: user.email,
      clientIp: ctx.clientIp,
      organizationId: ctx.organizationId,
      projectId: project.id,
      category: AuditCategory.PROJECT,
      action: AuditAction.PROJECT_UPDATED,
      targetType: 'project',
      targetId: project.id,
      detail: { action: 'clear_byok_key' },
    });

    return {
      hasApiKey: false,
      provider: null,
      maskedApiKey: null,
    };
  }
}

/**
 * Get the decrypted BYOK API key for a project. Used by the adaptor layer
 * to inject the key into AI service requests.
 * Returns null if no BYOK key is set.
 */
export async function getDecryptedByokKey(
  projectRepository: any,
  projectId: number,
): Promise<{ apiKey: string; provider: string } | null> {
  try {
    const project = await projectRepository.getCurrentProject(projectId);
    if (!project.llmApiKey) return null;
    const apiKey = decryptApiKey(project.llmApiKey);
    return {
      apiKey,
      provider: project.llmProvider || 'openrouter',
    };
  } catch (err) {
    logger.error(`Failed to get BYOK key for project ${projectId}: ${err}`);
    return null;
  }
}
