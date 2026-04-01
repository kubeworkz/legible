import { Knex } from 'knex';
import { BaseRepository, IBasicRepository } from './baseRepository';
import { camelCase, isPlainObject, mapKeys, mapValues, snakeCase } from 'lodash';

export interface BlueprintRegistryEntry {
  id: number;
  name: string;
  version: string;
  description: string | null;
  supportedConnectors: string[];
  category: string;
  tags: string[] | null;
  sandboxImage: string | null;
  defaultAgentType: string;
  blueprintYaml: string;
  policyYaml: string | null;
  inferenceProfiles: Record<string, any> | null;
  isOfficial: boolean;
  installCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface IBlueprintRegistryRepository
  extends IBasicRepository<BlueprintRegistryEntry> {
  findByName(name: string): Promise<BlueprintRegistryEntry | null>;
  findByConnector(connectorType: string): Promise<BlueprintRegistryEntry[]>;
  findByCategory(category: string): Promise<BlueprintRegistryEntry[]>;
  incrementInstallCount(id: number): Promise<void>;
}

export class BlueprintRegistryRepository
  extends BaseRepository<BlueprintRegistryEntry>
  implements IBlueprintRegistryRepository
{
  constructor(knexPg: Knex) {
    super({ knexPg, tableName: 'blueprint_registry' });
  }

  public async findByName(
    name: string,
  ): Promise<BlueprintRegistryEntry | null> {
    return this.findOneBy({ name } as Partial<BlueprintRegistryEntry>);
  }

  public async findByConnector(
    connectorType: string,
  ): Promise<BlueprintRegistryEntry[]> {
    const all = await this.findAll();
    return all.filter((entry) =>
      entry.supportedConnectors.includes(connectorType),
    );
  }

  public async findByCategory(
    category: string,
  ): Promise<BlueprintRegistryEntry[]> {
    return this.findAllBy({ category } as Partial<BlueprintRegistryEntry>);
  }

  public async incrementInstallCount(id: number): Promise<void> {
    await this.knex(this.tableName)
      .where('id', id)
      .increment('install_count', 1);
  }

  protected override transformFromDBData = (data: any) => {
    if (!isPlainObject(data)) {
      throw new Error('Unexpected dbdata');
    }
    const camelCaseData = mapKeys(data, (_value, key) => camelCase(key));
    const transformData = mapValues(camelCaseData, (value, key) => {
      if (
        ['supportedConnectors', 'tags', 'inferenceProfiles'].includes(key)
      ) {
        if (typeof value === 'string') {
          return value ? JSON.parse(value) : value;
        }
        return value;
      }
      return value;
    });
    return transformData as BlueprintRegistryEntry;
  };

  protected override transformToDBData = (data: any) => {
    if (!isPlainObject(data)) {
      throw new Error('Unexpected dbdata');
    }
    const transformedData = mapValues(data, (value, key) => {
      if (
        ['supportedConnectors', 'tags', 'inferenceProfiles'].includes(key)
      ) {
        return value != null ? JSON.stringify(value) : value;
      }
      return value;
    });
    return mapKeys(transformedData, (_value, key) => snakeCase(key));
  };
}
