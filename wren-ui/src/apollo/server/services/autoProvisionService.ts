import {
  AutoProvisionConfig,
  IAutoProvisionConfigRepository,
} from '@server/repositories/autoProvisionConfigRepository';
import {
  IBlueprintRepository,
} from '@server/repositories/blueprintRepository';
import {
  IBlueprintRegistryRepository,
} from '@server/repositories/blueprintRegistryRepository';
import { IAgentRepository } from '@server/repositories/agentRepository';
import { getLogger } from '@server/utils';

const logger = getLogger('AutoProvisionService');

// Mapping of connector types to recommended blueprint names
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

export interface CreateAutoProvisionConfigInput {
  projectId: number;
  connectorType: string;
  enabled?: boolean;
  blueprintId?: number;
  blueprintRegistryName?: string;
  inferenceProfile?: string;
  agentNameTemplate?: string;
}

export interface AutoProvisionResult {
  agentId: number;
  agentName: string;
  blueprintName: string;
  connectorType: string;
}

export interface IAutoProvisionService {
  getConfig(projectId: number): Promise<AutoProvisionConfig[]>;
  getConfigForConnector(
    projectId: number,
    connectorType: string,
  ): Promise<AutoProvisionConfig | null>;
  setConfig(input: CreateAutoProvisionConfigInput): Promise<AutoProvisionConfig>;
  deleteConfig(id: number): Promise<void>;
  provisionAgent(
    projectId: number,
    connectorType: string,
  ): Promise<AutoProvisionResult>;
  getRecommendedBlueprint(connectorType: string): string;
}

export class AutoProvisionService implements IAutoProvisionService {
  private readonly configRepository: IAutoProvisionConfigRepository;
  private readonly blueprintRepository: IBlueprintRepository;
  private readonly registryRepository: IBlueprintRegistryRepository;
  private readonly agentRepository: IAgentRepository;

  constructor({
    autoProvisionConfigRepository,
    blueprintRepository,
    blueprintRegistryRepository,
    agentRepository,
  }: {
    autoProvisionConfigRepository: IAutoProvisionConfigRepository;
    blueprintRepository: IBlueprintRepository;
    blueprintRegistryRepository: IBlueprintRegistryRepository;
    agentRepository: IAgentRepository;
  }) {
    this.configRepository = autoProvisionConfigRepository;
    this.blueprintRepository = blueprintRepository;
    this.registryRepository = blueprintRegistryRepository;
    this.agentRepository = agentRepository;
  }

  public async getConfig(
    projectId: number,
  ): Promise<AutoProvisionConfig[]> {
    return this.configRepository.findByProjectId(projectId);
  }

  public async getConfigForConnector(
    projectId: number,
    connectorType: string,
  ): Promise<AutoProvisionConfig | null> {
    return this.configRepository.findByProjectAndConnector(
      projectId,
      connectorType,
    );
  }

  public async setConfig(
    input: CreateAutoProvisionConfigInput,
  ): Promise<AutoProvisionConfig> {
    const existing = await this.configRepository.findByProjectAndConnector(
      input.projectId,
      input.connectorType,
    );

    const now = new Date().toISOString();
    if (existing) {
      return this.configRepository.updateOne(existing.id, {
        ...input,
        updatedAt: now,
      });
    }

    return this.configRepository.createOne({
      ...input,
      enabled: input.enabled !== false,
      agentNameTemplate: input.agentNameTemplate || '{{connector}}-agent',
      createdAt: now,
      updatedAt: now,
    });
  }

  public async deleteConfig(id: number): Promise<void> {
    await this.configRepository.deleteOne(id);
    logger.info(`Auto-provision config deleted: ${id}`);
  }

  public async provisionAgent(
    projectId: number,
    connectorType: string,
  ): Promise<AutoProvisionResult> {
    // 1. Find the config or use defaults
    const config = await this.configRepository.findByProjectAndConnector(
      projectId,
      connectorType,
    );

    // 2. Resolve blueprint
    let blueprintId: number | null = config?.blueprintId || null;
    let blueprintName: string;

    if (blueprintId) {
      const bp = await this.blueprintRepository.findOneBy({ id: blueprintId });
      blueprintName = bp?.name || 'unknown';
    } else {
      // Try to find a matching blueprint in the project
      const recommendedName = this.getRecommendedBlueprint(connectorType);
      const existing = await this.blueprintRepository.findByName(
        projectId,
        recommendedName,
      );

      if (existing) {
        blueprintId = existing.id;
        blueprintName = existing.name;
      } else {
        // Try to install from registry
        const registryEntry =
          await this.registryRepository.findByName(recommendedName);
        if (registryEntry) {
          const now = new Date().toISOString();
          const bp = await this.blueprintRepository.createOne({
            projectId,
            name: registryEntry.name,
            version: registryEntry.version,
            description: registryEntry.description,
            blueprintYaml: registryEntry.blueprintYaml,
            sandboxImage: registryEntry.sandboxImage,
            defaultAgentType: registryEntry.defaultAgentType,
            inferenceProfiles: registryEntry.inferenceProfiles,
            policyYaml: registryEntry.policyYaml,
            isBuiltin: false,
            supportedConnectors: registryEntry.supportedConnectors,
            category: registryEntry.category,
            tags: registryEntry.tags,
            source: 'auto-provision',
            createdAt: now,
            updatedAt: now,
          });
          blueprintId = bp.id;
          blueprintName = bp.name;
          await this.registryRepository.incrementInstallCount(
            registryEntry.id,
          );
        } else {
          // Fall back to legible-default
          blueprintName = 'legible-default';
          const defaultBp = await this.blueprintRepository.findByName(
            projectId,
            'legible-default',
          );
          if (defaultBp) {
            blueprintId = defaultBp.id;
          }
        }
      }
    }

    // 3. Generate agent name
    const nameTemplate =
      config?.agentNameTemplate || '{{connector}}-agent';
    const agentName = nameTemplate
      .replace('{{connector}}', connectorType.toLowerCase().replace(/_/g, '-'));

    // 4. Create the agent
    const now = new Date().toISOString();
    const agent = await this.agentRepository.createOne({
      projectId,
      name: agentName,
      sandboxName: `sandbox-${agentName}`,
      status: 'creating',
      blueprintId,
      inferenceProfile: config?.inferenceProfile || null,
      autoProvisioned: true,
      createdAt: now,
      updatedAt: now,
    });

    logger.info(
      `Auto-provisioned agent ${agent.id} (${agentName}) for ${connectorType} in project ${projectId}`,
    );

    return {
      agentId: agent.id,
      agentName,
      blueprintName,
      connectorType,
    };
  }

  public getRecommendedBlueprint(connectorType: string): string {
    return CONNECTOR_BLUEPRINT_MAP[connectorType] || 'legible-default';
  }
}
