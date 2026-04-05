import {
  PromptTemplate,
  PromptTemplateVersion,
  IPromptTemplateRepository,
  IPromptTemplateVersionRepository,
} from '@server/repositories/promptTemplateRepository';
import { getLogger } from '@server/utils';

const logger = getLogger('PromptTemplateService');

export interface CreatePromptTemplateInput {
  name: string;
  description?: string;
  systemPrompt?: string;
  userPrompt?: string;
  variables?: Array<{ name: string; type: string; default?: string; description?: string }>;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  tags?: string[];
}

export interface UpdatePromptTemplateInput {
  description?: string;
  systemPrompt?: string;
  userPrompt?: string;
  variables?: Array<{ name: string; type: string; default?: string; description?: string }>;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  tags?: string[];
}

export interface TestPromptInput {
  systemPrompt: string;
  userPrompt: string;
  variables: Record<string, string>;
}

export interface IPromptTemplateService {
  listTemplates(projectId: number): Promise<PromptTemplate[]>;
  getTemplate(id: number): Promise<PromptTemplate>;
  getTemplateByName(projectId: number, name: string): Promise<PromptTemplate>;
  createTemplate(projectId: number, input: CreatePromptTemplateInput, userId?: number): Promise<PromptTemplate>;
  updateTemplate(id: number, input: UpdatePromptTemplateInput, userId?: number): Promise<PromptTemplate>;
  deleteTemplate(id: number): Promise<void>;
  listVersions(promptTemplateId: number): Promise<PromptTemplateVersion[]>;
  getVersion(id: number): Promise<PromptTemplateVersion>;
  renderPrompt(template: string, variables: Record<string, string>): string;
}

export class PromptTemplateService implements IPromptTemplateService {
  private readonly templateRepo: IPromptTemplateRepository;
  private readonly versionRepo: IPromptTemplateVersionRepository;

  constructor({
    promptTemplateRepository,
    promptTemplateVersionRepository,
  }: {
    promptTemplateRepository: IPromptTemplateRepository;
    promptTemplateVersionRepository: IPromptTemplateVersionRepository;
  }) {
    this.templateRepo = promptTemplateRepository;
    this.versionRepo = promptTemplateVersionRepository;
  }

  public async listTemplates(projectId: number): Promise<PromptTemplate[]> {
    return this.templateRepo.findByProjectId(projectId);
  }

  public async getTemplate(id: number): Promise<PromptTemplate> {
    const template = await this.templateRepo.findOneBy({ id } as Partial<PromptTemplate>);
    if (!template) throw new Error(`Prompt template not found: ${id}`);
    return template;
  }

  public async getTemplateByName(
    projectId: number,
    name: string,
  ): Promise<PromptTemplate> {
    const template = await this.templateRepo.findByName(projectId, name);
    if (!template) throw new Error(`Prompt template not found: ${name}`);
    return template;
  }

  public async createTemplate(
    projectId: number,
    input: CreatePromptTemplateInput,
    userId?: number,
  ): Promise<PromptTemplate> {
    const existing = await this.templateRepo.findByName(projectId, input.name);
    if (existing) throw new Error(`Template "${input.name}" already exists`);

    const now = new Date().toISOString();
    const template = await this.templateRepo.createOne({
      projectId,
      ...input,
      currentVersion: 1,
      createdBy: userId || null,
      createdAt: now,
      updatedAt: now,
    });

    // Create initial version snapshot
    await this.versionRepo.createOne({
      promptTemplateId: template.id,
      version: 1,
      systemPrompt: template.systemPrompt,
      userPrompt: template.userPrompt,
      variables: template.variables,
      model: template.model,
      temperature: template.temperature,
      maxTokens: template.maxTokens,
      changeNote: 'Initial version',
      createdBy: userId || null,
      createdAt: now,
    });

    logger.info(`Prompt template created: ${template.id} (${template.name})`);
    return template;
  }

  public async updateTemplate(
    id: number,
    input: UpdatePromptTemplateInput,
    userId?: number,
  ): Promise<PromptTemplate> {
    const existing = await this.getTemplate(id);
    const now = new Date().toISOString();
    const nextVersion = existing.currentVersion + 1;

    const updated = await this.templateRepo.updateOne(id, {
      ...input,
      currentVersion: nextVersion,
      updatedAt: now,
    });

    // Create version snapshot
    await this.versionRepo.createOne({
      promptTemplateId: id,
      version: nextVersion,
      systemPrompt: input.systemPrompt ?? existing.systemPrompt,
      userPrompt: input.userPrompt ?? existing.userPrompt,
      variables: input.variables ?? existing.variables,
      model: input.model ?? existing.model,
      temperature: input.temperature ?? existing.temperature,
      maxTokens: input.maxTokens ?? existing.maxTokens,
      changeNote: `Version ${nextVersion}`,
      createdBy: userId || null,
      createdAt: now,
    });

    logger.info(`Prompt template updated: ${id} → v${nextVersion}`);
    return updated;
  }

  public async deleteTemplate(id: number): Promise<void> {
    await this.getTemplate(id);
    // Versions cascade via FK
    await this.templateRepo.deleteOne(id);
    logger.info(`Prompt template deleted: ${id}`);
  }

  public async listVersions(
    promptTemplateId: number,
  ): Promise<PromptTemplateVersion[]> {
    return this.versionRepo.findByTemplateId(promptTemplateId);
  }

  public async getVersion(id: number): Promise<PromptTemplateVersion> {
    const version = await this.versionRepo.findOneBy({ id } as Partial<PromptTemplateVersion>);
    if (!version) throw new Error(`Prompt template version not found: ${id}`);
    return version;
  }

  public renderPrompt(
    template: string,
    variables: Record<string, string>,
  ): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return key in variables ? variables[key] : match;
    });
  }
}
