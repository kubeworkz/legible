import {
  ToolDefinition,
  IToolDefinitionRepository,
} from '@server/repositories/toolDefinitionRepository';
import { getLogger } from '@server/utils';

const logger = getLogger('ToolDefinitionService');

export interface CreateToolDefinitionInput {
  name: string;
  description?: string;
  source: string; // 'mcp', 'custom_api', 'builtin'
  mcpServerName?: string;
  method?: string;
  endpoint?: string;
  inputSchema?: Record<string, any>;
  outputSchema?: Record<string, any>;
  headers?: Record<string, string>;
  authConfig?: Record<string, any>;
  tags?: string[];
}

export interface UpdateToolDefinitionInput {
  description?: string;
  method?: string;
  endpoint?: string;
  inputSchema?: Record<string, any>;
  outputSchema?: Record<string, any>;
  headers?: Record<string, string>;
  authConfig?: Record<string, any>;
  enabled?: boolean;
  tags?: string[];
}

export interface IToolDefinitionService {
  listTools(projectId: number): Promise<ToolDefinition[]>;
  listBySource(projectId: number, source: string): Promise<ToolDefinition[]>;
  getTool(id: number): Promise<ToolDefinition>;
  getToolByName(projectId: number, name: string): Promise<ToolDefinition>;
  createTool(projectId: number, input: CreateToolDefinitionInput): Promise<ToolDefinition>;
  updateTool(id: number, input: UpdateToolDefinitionInput): Promise<ToolDefinition>;
  deleteTool(id: number): Promise<void>;
  syncMcpTools(projectId: number, serverName: string, tools: CreateToolDefinitionInput[]): Promise<{ created: number; updated: number; removed: number }>;
}

export class ToolDefinitionService implements IToolDefinitionService {
  private readonly toolRepo: IToolDefinitionRepository;

  constructor({
    toolDefinitionRepository,
  }: {
    toolDefinitionRepository: IToolDefinitionRepository;
  }) {
    this.toolRepo = toolDefinitionRepository;
  }

  public async listTools(projectId: number): Promise<ToolDefinition[]> {
    return this.toolRepo.findByProjectId(projectId);
  }

  public async listBySource(
    projectId: number,
    source: string,
  ): Promise<ToolDefinition[]> {
    return this.toolRepo.findBySource(projectId, source);
  }

  public async getTool(id: number): Promise<ToolDefinition> {
    const tool = await this.toolRepo.findOneBy({ id } as Partial<ToolDefinition>);
    if (!tool) throw new Error(`Tool definition not found: ${id}`);
    return tool;
  }

  public async getToolByName(
    projectId: number,
    name: string,
  ): Promise<ToolDefinition> {
    const tool = await this.toolRepo.findByName(projectId, name);
    if (!tool) throw new Error(`Tool definition not found: ${name}`);
    return tool;
  }

  public async createTool(
    projectId: number,
    input: CreateToolDefinitionInput,
  ): Promise<ToolDefinition> {
    const existing = await this.toolRepo.findByName(projectId, input.name);
    if (existing) throw new Error(`Tool "${input.name}" already exists`);

    const now = new Date().toISOString();
    const tool = await this.toolRepo.createOne({
      projectId,
      ...input,
      enabled: true,
      lastSyncedAt: input.source === 'mcp' ? now : null,
      createdAt: now,
      updatedAt: now,
    });

    logger.info(`Tool created: ${tool.id} (${tool.name}, source=${tool.source})`);
    return tool;
  }

  public async updateTool(
    id: number,
    input: UpdateToolDefinitionInput,
  ): Promise<ToolDefinition> {
    await this.getTool(id);
    const now = new Date().toISOString();
    const updated = await this.toolRepo.updateOne(id, {
      ...input,
      updatedAt: now,
    });
    logger.info(`Tool updated: ${id}`);
    return updated;
  }

  public async deleteTool(id: number): Promise<void> {
    await this.getTool(id);
    await this.toolRepo.deleteOne(id);
    logger.info(`Tool deleted: ${id}`);
  }

  public async syncMcpTools(
    projectId: number,
    serverName: string,
    tools: CreateToolDefinitionInput[],
  ): Promise<{ created: number; updated: number; removed: number }> {
    const existing = await this.toolRepo.findBySource(projectId, 'mcp');
    const serverTools = existing.filter((t) => t.mcpServerName === serverName);
    const existingMap = new Map(serverTools.map((t) => [t.name, t]));

    const now = new Date().toISOString();
    let created = 0;
    let updated = 0;

    const incomingNames = new Set<string>();
    for (const tool of tools) {
      incomingNames.add(tool.name);
      const ex = existingMap.get(tool.name);
      if (ex) {
        await this.toolRepo.updateOne(ex.id, {
          description: tool.description,
          inputSchema: tool.inputSchema,
          outputSchema: tool.outputSchema,
          lastSyncedAt: now,
          updatedAt: now,
        });
        updated++;
      } else {
        await this.toolRepo.createOne({
          projectId,
          ...tool,
          source: 'mcp',
          mcpServerName: serverName,
          enabled: true,
          lastSyncedAt: now,
          createdAt: now,
          updatedAt: now,
        });
        created++;
      }
    }

    // Remove tools no longer in MCP server
    let removed = 0;
    for (const [name, tool] of existingMap) {
      if (!incomingNames.has(name)) {
        await this.toolRepo.deleteOne(tool.id);
        removed++;
      }
    }

    logger.info(
      `MCP sync for "${serverName}": ${created} created, ${updated} updated, ${removed} removed`,
    );
    return { created, updated, removed };
  }
}
