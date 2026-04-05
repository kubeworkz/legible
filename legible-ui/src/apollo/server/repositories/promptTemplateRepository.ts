import { Knex } from 'knex';
import { BaseRepository, IBasicRepository } from './baseRepository';
import { camelCase, isPlainObject, mapKeys, mapValues, snakeCase } from 'lodash';

export interface PromptTemplate {
  id: number;
  projectId: number;
  name: string;
  description: string | null;
  systemPrompt: string | null;
  userPrompt: string | null;
  variables: Array<{ name: string; type: string; default?: string; description?: string }> | null;
  model: string | null;
  temperature: number | null;
  maxTokens: number | null;
  tags: string[] | null;
  currentVersion: number;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface PromptTemplateVersion {
  id: number;
  promptTemplateId: number;
  version: number;
  systemPrompt: string | null;
  userPrompt: string | null;
  variables: Array<{ name: string; type: string; default?: string; description?: string }> | null;
  model: string | null;
  temperature: number | null;
  maxTokens: number | null;
  changeNote: string | null;
  createdBy: number | null;
  createdAt: string;
}

export interface IPromptTemplateRepository
  extends IBasicRepository<PromptTemplate> {
  findByProjectId(projectId: number): Promise<PromptTemplate[]>;
  findByName(projectId: number, name: string): Promise<PromptTemplate | null>;
}

export interface IPromptTemplateVersionRepository
  extends IBasicRepository<PromptTemplateVersion> {
  findByTemplateId(promptTemplateId: number): Promise<PromptTemplateVersion[]>;
  findLatest(promptTemplateId: number): Promise<PromptTemplateVersion | null>;
}

const JSON_FIELDS = ['variables', 'tags'];

function transformFromDB(data: any): any {
  if (!isPlainObject(data)) throw new Error('Unexpected dbdata');
  const camelCaseData = mapKeys(data, (_v, k) => camelCase(k));
  return mapValues(camelCaseData, (value, key) => {
    if (JSON_FIELDS.includes(key) && typeof value === 'string') {
      return value ? JSON.parse(value) : value;
    }
    return value;
  });
}

function transformToDB(data: any): any {
  if (!isPlainObject(data)) throw new Error('Unexpected dbdata');
  const transformed = mapValues(data, (value, key) => {
    if (JSON_FIELDS.includes(key) && value != null) {
      return JSON.stringify(value);
    }
    return value;
  });
  return mapKeys(transformed, (_v, k) => snakeCase(k));
}

export class PromptTemplateRepository
  extends BaseRepository<PromptTemplate>
  implements IPromptTemplateRepository
{
  constructor(knexPg: Knex) {
    super({ knexPg, tableName: 'prompt_template' });
  }

  public async findByProjectId(projectId: number): Promise<PromptTemplate[]> {
    return this.findAllBy({ projectId } as Partial<PromptTemplate>);
  }

  public async findByName(
    projectId: number,
    name: string,
  ): Promise<PromptTemplate | null> {
    return this.findOneBy({ projectId, name } as Partial<PromptTemplate>);
  }

  protected override transformFromDBData = (data: any) =>
    transformFromDB(data) as PromptTemplate;

  protected override transformToDBData = (data: any) => transformToDB(data);
}

export class PromptTemplateVersionRepository
  extends BaseRepository<PromptTemplateVersion>
  implements IPromptTemplateVersionRepository
{
  constructor(knexPg: Knex) {
    super({ knexPg, tableName: 'prompt_template_version' });
  }

  public async findByTemplateId(
    promptTemplateId: number,
  ): Promise<PromptTemplateVersion[]> {
    return this.findAllBy(
      { promptTemplateId } as Partial<PromptTemplateVersion>,
      { order: 'version' },
    );
  }

  public async findLatest(
    promptTemplateId: number,
  ): Promise<PromptTemplateVersion | null> {
    const rows = await this.knex(this.tableName)
      .where('prompt_template_id', promptTemplateId)
      .orderBy('version', 'desc')
      .limit(1);
    return rows.length > 0 ? (transformFromDB(rows[0]) as PromptTemplateVersion) : null;
  }

  protected override transformFromDBData = (data: any) =>
    transformFromDB(data) as PromptTemplateVersion;

  protected override transformToDBData = (data: any) => transformToDB(data);
}
