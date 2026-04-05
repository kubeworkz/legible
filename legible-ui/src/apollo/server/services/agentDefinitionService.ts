import { getLogger } from '@server/utils';
import {
  AgentDefinition,
  AgentDefinitionVersion,
  IAgentDefinitionRepository,
  IAgentDefinitionVersionRepository,
} from '@server/repositories/agentDefinitionRepository';

const logger = getLogger('AgentDefinitionService');

// ─── Input Types ───────────────────────────────────────────

export interface CreateAgentDefinitionInput {
  name: string;
  description?: string;
  workflowId?: number;
  systemPrompt?: string;
  toolIds?: number[];
  memoryConfig?: Record<string, any>;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  deployConfig?: Record<string, any>;
  tags?: string[];
  icon?: string;
}

export interface UpdateAgentDefinitionInput {
  name?: string;
  description?: string;
  workflowId?: number;
  systemPrompt?: string;
  toolIds?: number[];
  memoryConfig?: Record<string, any>;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  deployConfig?: Record<string, any>;
  tags?: string[];
  icon?: string;
}

// ─── Interface ─────────────────────────────────────────────

export interface IAgentDefinitionService {
  listAgentDefinitions(projectId: number): Promise<AgentDefinition[]>;
  getAgentDefinition(id: number): Promise<AgentDefinition>;
  createAgentDefinition(
    projectId: number,
    input: CreateAgentDefinitionInput,
    userId?: number,
  ): Promise<AgentDefinition>;
  updateAgentDefinition(
    id: number,
    input: UpdateAgentDefinitionInput,
  ): Promise<AgentDefinition>;
  deleteAgentDefinition(id: number): Promise<void>;
  publishAgentDefinition(
    id: number,
    changeNote?: string,
    userId?: number,
  ): Promise<AgentDefinition>;
  deployAgentDefinition(id: number): Promise<AgentDefinition>;
  archiveAgentDefinition(id: number): Promise<AgentDefinition>;
  listVersions(agentDefinitionId: number): Promise<AgentDefinitionVersion[]>;
}

// ─── Implementation ────────────────────────────────────────

export class AgentDefinitionService implements IAgentDefinitionService {
  private readonly agentDefRepo: IAgentDefinitionRepository;
  private readonly agentDefVersionRepo: IAgentDefinitionVersionRepository;

  constructor({
    agentDefinitionRepository,
    agentDefinitionVersionRepository,
  }: {
    agentDefinitionRepository: IAgentDefinitionRepository;
    agentDefinitionVersionRepository: IAgentDefinitionVersionRepository;
  }) {
    this.agentDefRepo = agentDefinitionRepository;
    this.agentDefVersionRepo = agentDefinitionVersionRepository;
  }

  public async listAgentDefinitions(
    projectId: number,
  ): Promise<AgentDefinition[]> {
    return this.agentDefRepo.findByProjectId(projectId);
  }

  public async getAgentDefinition(id: number): Promise<AgentDefinition> {
    const def = await this.agentDefRepo.findOneBy({ id } as any);
    if (!def) throw new Error(`Agent definition not found: ${id}`);
    return def;
  }

  public async createAgentDefinition(
    projectId: number,
    input: CreateAgentDefinitionInput,
    userId?: number,
  ): Promise<AgentDefinition> {
    const now = new Date().toISOString();
    return this.agentDefRepo.createOne({
      projectId,
      name: input.name,
      description: input.description || null,
      workflowId: input.workflowId || null,
      systemPrompt: input.systemPrompt || null,
      toolIds: input.toolIds || null,
      memoryConfig: input.memoryConfig || null,
      model: input.model || null,
      temperature: input.temperature ?? null,
      maxTokens: input.maxTokens ?? null,
      status: 'draft',
      currentVersion: 1,
      deployConfig: input.deployConfig || null,
      deployedAt: null,
      tags: input.tags || null,
      icon: input.icon || null,
      createdBy: userId || null,
      createdAt: now,
      updatedAt: now,
    } as any);
  }

  public async updateAgentDefinition(
    id: number,
    input: UpdateAgentDefinitionInput,
  ): Promise<AgentDefinition> {
    const existing = await this.getAgentDefinition(id);

    const updates: Record<string, any> = {
      updatedAt: new Date().toISOString(),
    };

    if (input.name !== undefined) updates.name = input.name;
    if (input.description !== undefined) updates.description = input.description;
    if (input.workflowId !== undefined) updates.workflowId = input.workflowId;
    if (input.systemPrompt !== undefined) updates.systemPrompt = input.systemPrompt;
    if (input.toolIds !== undefined) updates.toolIds = input.toolIds;
    if (input.memoryConfig !== undefined) updates.memoryConfig = input.memoryConfig;
    if (input.model !== undefined) updates.model = input.model;
    if (input.temperature !== undefined) updates.temperature = input.temperature;
    if (input.maxTokens !== undefined) updates.maxTokens = input.maxTokens;
    if (input.deployConfig !== undefined) updates.deployConfig = input.deployConfig;
    if (input.tags !== undefined) updates.tags = input.tags;
    if (input.icon !== undefined) updates.icon = input.icon;

    // If editing a published agent, revert to draft
    if (existing.status === 'published' || existing.status === 'deployed') {
      updates.status = 'draft';
    }

    return this.agentDefRepo.updateOne(id, updates);
  }

  public async deleteAgentDefinition(id: number): Promise<void> {
    await this.agentDefRepo.deleteOne(id);
  }

  public async publishAgentDefinition(
    id: number,
    changeNote?: string,
    userId?: number,
  ): Promise<AgentDefinition> {
    const def = await this.getAgentDefinition(id);

    // Create a version snapshot
    const nextVersion = def.currentVersion + 1;
    await this.agentDefVersionRepo.createOne({
      agentDefinitionId: id,
      version: nextVersion,
      workflowId: def.workflowId,
      systemPrompt: def.systemPrompt,
      toolIds: def.toolIds,
      memoryConfig: def.memoryConfig,
      model: def.model,
      temperature: def.temperature,
      maxTokens: def.maxTokens,
      deployConfig: def.deployConfig,
      changeNote: changeNote || null,
      createdBy: userId || null,
      createdAt: new Date().toISOString(),
    } as any);

    // Update status + version
    return this.agentDefRepo.updateOne(id, {
      status: 'published',
      currentVersion: nextVersion,
      updatedAt: new Date().toISOString(),
    });
  }

  public async deployAgentDefinition(id: number): Promise<AgentDefinition> {
    const def = await this.getAgentDefinition(id);
    if (def.status !== 'published') {
      throw new Error('Agent must be published before deploying');
    }

    logger.info(`Deploying agent definition ${id} (${def.name})`);

    return this.agentDefRepo.updateOne(id, {
      status: 'deployed',
      deployedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  public async archiveAgentDefinition(id: number): Promise<AgentDefinition> {
    return this.agentDefRepo.updateOne(id, {
      status: 'archived',
      updatedAt: new Date().toISOString(),
    });
  }

  public async listVersions(
    agentDefinitionId: number,
  ): Promise<AgentDefinitionVersion[]> {
    return this.agentDefVersionRepo.findByAgentDefinitionId(agentDefinitionId);
  }
}
