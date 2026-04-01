import { Knex } from 'knex';
import { BaseRepository, IBasicRepository } from './baseRepository';
import { camelCase, isPlainObject, mapKeys, mapValues, snakeCase } from 'lodash';

export interface Blueprint {
  id: number;
  projectId: number;
  name: string;
  version: string;
  description: string | null;
  blueprintYaml: string;
  sandboxImage: string | null;
  defaultAgentType: string | null;
  inferenceProfiles: Record<string, any> | null;
  policyYaml: string | null;
  isBuiltin: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IBlueprintRepository extends IBasicRepository<Blueprint> {
  findAllByProjectId(projectId: number): Promise<Blueprint[]>;
  findByName(projectId: number, name: string): Promise<Blueprint | null>;
}

export class BlueprintRepository
  extends BaseRepository<Blueprint>
  implements IBlueprintRepository
{
  private readonly jsonbColumns = ['inference_profiles'];

  constructor(knexPg: Knex) {
    super({ knexPg, tableName: 'blueprint' });
  }

  public async findAllByProjectId(projectId: number): Promise<Blueprint[]> {
    return this.findAllBy({ projectId } as Partial<Blueprint>);
  }

  public async findByName(
    projectId: number,
    name: string,
  ): Promise<Blueprint | null> {
    return this.findOneBy({ projectId, name } as Partial<Blueprint>);
  }

  protected override transformFromDBData = (data: any) => {
    if (!isPlainObject(data)) {
      throw new Error('Unexpected dbdata');
    }
    const camelCaseData = mapKeys(data, (_value, key) => camelCase(key));
    const transformData = mapValues(camelCaseData, (value, key) => {
      if (key === 'inferenceProfiles') {
        if (typeof value === 'string') {
          return value ? JSON.parse(value) : value;
        }
        return value;
      }
      return value;
    });
    return transformData as Blueprint;
  };

  protected override transformToDBData = (data: any) => {
    if (!isPlainObject(data)) {
      throw new Error('Unexpected dbdata');
    }
    const transformedData = mapValues(data, (value, key) => {
      if (key === 'inferenceProfiles') {
        return JSON.stringify(value);
      }
      return value;
    });
    return mapKeys(transformedData, (_value, key) => snakeCase(key));
  };
}
