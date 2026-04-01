import {
  Blueprint,
  IBlueprintRepository,
} from '@server/repositories/blueprintRepository';
import { getLogger } from '@server/utils';

const logger = getLogger('BlueprintService');

export interface CreateBlueprintInput {
  projectId: number;
  name: string;
  version?: string;
  description?: string;
  blueprintYaml: string;
  sandboxImage?: string;
  defaultAgentType?: string;
  inferenceProfiles?: Record<string, any>;
  policyYaml?: string;
  isBuiltin?: boolean;
  supportedConnectors?: string[];
  category?: string;
  tags?: string[];
  source?: string;
}

export interface UpdateBlueprintInput {
  version?: string;
  description?: string;
  blueprintYaml?: string;
  sandboxImage?: string;
  defaultAgentType?: string;
  inferenceProfiles?: Record<string, any>;
  policyYaml?: string;
  supportedConnectors?: string[];
  category?: string;
  tags?: string[];
}

export interface IBlueprintService {
  listBlueprints(projectId: number): Promise<Blueprint[]>;
  getBlueprint(id: number): Promise<Blueprint>;
  getBlueprintByName(projectId: number, name: string): Promise<Blueprint>;
  createBlueprint(input: CreateBlueprintInput): Promise<Blueprint>;
  updateBlueprint(id: number, input: UpdateBlueprintInput): Promise<Blueprint>;
  deleteBlueprint(id: number): Promise<void>;
}

export class BlueprintService implements IBlueprintService {
  private readonly blueprintRepository: IBlueprintRepository;

  constructor({
    blueprintRepository,
  }: {
    blueprintRepository: IBlueprintRepository;
  }) {
    this.blueprintRepository = blueprintRepository;
  }

  public async listBlueprints(projectId: number): Promise<Blueprint[]> {
    return this.blueprintRepository.findAllByProjectId(projectId);
  }

  public async getBlueprint(id: number): Promise<Blueprint> {
    const blueprint = await this.blueprintRepository.findOneBy({ id });
    if (!blueprint) {
      throw new Error(`Blueprint not found: ${id}`);
    }
    return blueprint;
  }

  public async getBlueprintByName(
    projectId: number,
    name: string,
  ): Promise<Blueprint> {
    const blueprint = await this.blueprintRepository.findByName(
      projectId,
      name,
    );
    if (!blueprint) {
      throw new Error(`Blueprint not found: ${name}`);
    }
    return blueprint;
  }

  public async createBlueprint(
    input: CreateBlueprintInput,
  ): Promise<Blueprint> {
    const now = new Date().toISOString();
    const existing = await this.blueprintRepository.findByName(
      input.projectId,
      input.name,
    );
    if (existing) {
      throw new Error(`Blueprint "${input.name}" already exists in this project`);
    }

    const blueprint = await this.blueprintRepository.createOne({
      ...input,
      version: input.version || '0.1.0',
      isBuiltin: input.isBuiltin || false,
      createdAt: now,
      updatedAt: now,
    });
    logger.info(`Blueprint created: ${blueprint.id} (${blueprint.name})`);
    return blueprint;
  }

  public async updateBlueprint(
    id: number,
    input: UpdateBlueprintInput,
  ): Promise<Blueprint> {
    const existing = await this.getBlueprint(id);
    if (!existing) {
      throw new Error(`Blueprint not found: ${id}`);
    }

    const now = new Date().toISOString();
    const updated = await this.blueprintRepository.updateOne(id, {
      ...input,
      updatedAt: now,
    });
    logger.info(`Blueprint updated: ${id}`);
    return updated;
  }

  public async deleteBlueprint(id: number): Promise<void> {
    const existing = await this.getBlueprint(id);
    if (!existing) {
      throw new Error(`Blueprint not found: ${id}`);
    }

    await this.blueprintRepository.deleteOne(id);
    logger.info(`Blueprint deleted: ${id} (${existing.name})`);
  }
}
