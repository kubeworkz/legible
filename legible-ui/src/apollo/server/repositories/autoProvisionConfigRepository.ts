import { Knex } from 'knex';
import { BaseRepository, IBasicRepository } from './baseRepository';
import { camelCase, isPlainObject, mapKeys, snakeCase } from 'lodash';

export interface AutoProvisionConfig {
  id: number;
  projectId: number;
  enabled: boolean;
  connectorType: string;
  blueprintId: number | null;
  blueprintRegistryName: string | null;
  inferenceProfile: string | null;
  agentNameTemplate: string;
  createdAt: string;
  updatedAt: string;
}

export interface IAutoProvisionConfigRepository
  extends IBasicRepository<AutoProvisionConfig> {
  findByProjectId(projectId: number): Promise<AutoProvisionConfig[]>;
  findByProjectAndConnector(
    projectId: number,
    connectorType: string,
  ): Promise<AutoProvisionConfig | null>;
}

export class AutoProvisionConfigRepository
  extends BaseRepository<AutoProvisionConfig>
  implements IAutoProvisionConfigRepository
{
  constructor(knexPg: Knex) {
    super({ knexPg, tableName: 'auto_provision_config' });
  }

  public async findByProjectId(
    projectId: number,
  ): Promise<AutoProvisionConfig[]> {
    return this.findAllBy({ projectId } as Partial<AutoProvisionConfig>);
  }

  public async findByProjectAndConnector(
    projectId: number,
    connectorType: string,
  ): Promise<AutoProvisionConfig | null> {
    return this.findOneBy({
      projectId,
      connectorType,
    } as Partial<AutoProvisionConfig>);
  }

  protected override transformFromDBData = (data: any) => {
    if (!isPlainObject(data)) {
      throw new Error('Unexpected dbdata');
    }
    return mapKeys(data, (_value, key) => camelCase(key)) as AutoProvisionConfig;
  };

  protected override transformToDBData = (data: any) => {
    if (!isPlainObject(data)) {
      throw new Error('Unexpected dbdata');
    }
    return mapKeys(data, (_value, key) => snakeCase(key));
  };
}
