import {
  BlueprintRegistryEntry,
  IBlueprintRegistryRepository,
} from '@server/repositories/blueprintRegistryRepository';
import {
  IBlueprintRepository,
} from '@server/repositories/blueprintRepository';
import { getLogger } from '@server/utils';

const logger = getLogger('BlueprintRegistryService');

export interface CreateRegistryEntryInput {
  name: string;
  version: string;
  description?: string;
  supportedConnectors: string[];
  category: string;
  tags?: string[];
  sandboxImage?: string;
  defaultAgentType?: string;
  blueprintYaml: string;
  policyYaml?: string;
  inferenceProfiles?: Record<string, any>;
  isOfficial?: boolean;
}

export interface IBlueprintRegistryService {
  listRegistryEntries(): Promise<BlueprintRegistryEntry[]>;
  getRegistryEntry(id: number): Promise<BlueprintRegistryEntry>;
  getRegistryEntryByName(name: string): Promise<BlueprintRegistryEntry>;
  searchByConnector(connectorType: string): Promise<BlueprintRegistryEntry[]>;
  searchByCategory(category: string): Promise<BlueprintRegistryEntry[]>;
  createRegistryEntry(input: CreateRegistryEntryInput): Promise<BlueprintRegistryEntry>;
  deleteRegistryEntry(id: number): Promise<void>;
  installToProject(
    registryEntryId: number,
    projectId: number,
  ): Promise<{ blueprintId: number }>;
  recommendForConnector(connectorType: string): Promise<BlueprintRegistryEntry | null>;
}

// Mapping of connector types to their recommended blueprint names
const CONNECTOR_BLUEPRINT_MAP: Record<string, string> = {
  POSTGRES: 'legible-postgres',
  BIG_QUERY: 'legible-bigquery',
  SNOWFLAKE: 'legible-snowflake',
  MYSQL: 'legible-mysql',
  CLICK_HOUSE: 'legible-clickhouse',
  DUCKDB: 'legible-duckdb',
  MSSQL: 'legible-mssql',
  ORACLE: 'legible-oracle',
  TRINO: 'legible-trino',
  REDSHIFT: 'legible-redshift',
  DATABRICKS: 'legible-databricks',
  ATHENA: 'legible-athena',
};

export class BlueprintRegistryService implements IBlueprintRegistryService {
  private readonly registryRepository: IBlueprintRegistryRepository;
  private readonly blueprintRepository: IBlueprintRepository;

  constructor({
    blueprintRegistryRepository,
    blueprintRepository,
  }: {
    blueprintRegistryRepository: IBlueprintRegistryRepository;
    blueprintRepository: IBlueprintRepository;
  }) {
    this.registryRepository = blueprintRegistryRepository;
    this.blueprintRepository = blueprintRepository;
  }

  public async listRegistryEntries(): Promise<BlueprintRegistryEntry[]> {
    return this.registryRepository.findAll();
  }

  public async getRegistryEntry(id: number): Promise<BlueprintRegistryEntry> {
    const entry = await this.registryRepository.findOneBy({ id });
    if (!entry) {
      throw new Error(`Registry entry not found: ${id}`);
    }
    return entry;
  }

  public async getRegistryEntryByName(
    name: string,
  ): Promise<BlueprintRegistryEntry> {
    const entry = await this.registryRepository.findByName(name);
    if (!entry) {
      throw new Error(`Registry entry not found: ${name}`);
    }
    return entry;
  }

  public async searchByConnector(
    connectorType: string,
  ): Promise<BlueprintRegistryEntry[]> {
    return this.registryRepository.findByConnector(connectorType);
  }

  public async searchByCategory(
    category: string,
  ): Promise<BlueprintRegistryEntry[]> {
    return this.registryRepository.findByCategory(category);
  }

  public async createRegistryEntry(
    input: CreateRegistryEntryInput,
  ): Promise<BlueprintRegistryEntry> {
    const existing = await this.registryRepository.findByName(input.name);
    if (existing) {
      throw new Error(
        `Registry entry "${input.name}" already exists`,
      );
    }

    const now = new Date().toISOString();
    const entry = await this.registryRepository.createOne({
      ...input,
      defaultAgentType: input.defaultAgentType || 'claude',
      isOfficial: input.isOfficial || false,
      installCount: 0,
      createdAt: now,
      updatedAt: now,
    });
    logger.info(`Registry entry created: ${entry.id} (${entry.name})`);
    return entry;
  }

  public async deleteRegistryEntry(id: number): Promise<void> {
    await this.getRegistryEntry(id);
    await this.registryRepository.deleteOne(id);
    logger.info(`Registry entry deleted: ${id}`);
  }

  public async installToProject(
    registryEntryId: number,
    projectId: number,
  ): Promise<{ blueprintId: number }> {
    const entry = await this.getRegistryEntry(registryEntryId);

    // Check if already installed
    const existing = await this.blueprintRepository.findByName(
      projectId,
      entry.name,
    );
    if (existing) {
      return { blueprintId: existing.id };
    }

    const now = new Date().toISOString();
    const blueprint = await this.blueprintRepository.createOne({
      projectId,
      name: entry.name,
      version: entry.version,
      description: entry.description,
      blueprintYaml: entry.blueprintYaml,
      sandboxImage: entry.sandboxImage,
      defaultAgentType: entry.defaultAgentType,
      inferenceProfiles: entry.inferenceProfiles,
      policyYaml: entry.policyYaml,
      isBuiltin: false,
      supportedConnectors: entry.supportedConnectors,
      category: entry.category,
      tags: entry.tags,
      source: 'registry',
      createdAt: now,
      updatedAt: now,
    });

    await this.registryRepository.incrementInstallCount(registryEntryId);
    logger.info(
      `Registry entry "${entry.name}" installed to project ${projectId} as blueprint ${blueprint.id}`,
    );
    return { blueprintId: blueprint.id };
  }

  public async recommendForConnector(
    connectorType: string,
  ): Promise<BlueprintRegistryEntry | null> {
    const recommendedName = CONNECTOR_BLUEPRINT_MAP[connectorType];
    if (!recommendedName) {
      return null;
    }
    return this.registryRepository.findByName(recommendedName);
  }
}
