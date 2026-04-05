import { Knex } from 'knex';
import { BaseRepository, IBasicRepository } from './baseRepository';
import { camelCase, isPlainObject, mapKeys, mapValues, snakeCase } from 'lodash';

export interface Workflow {
  id: number;
  projectId: number;
  name: string;
  description: string | null;
  graph: { nodes: any[]; edges: any[] };
  variables: Array<{ name: string; type: string; default?: string; description?: string }> | null;
  status: string; // 'draft', 'published', 'archived'
  currentVersion: number;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowVersion {
  id: number;
  workflowId: number;
  version: number;
  graph: { nodes: any[]; edges: any[] };
  variables: Array<{ name: string; type: string; default?: string; description?: string }> | null;
  changeNote: string | null;
  createdBy: number | null;
  createdAt: string;
}

export interface IWorkflowRepository extends IBasicRepository<Workflow> {
  findByProjectId(projectId: number): Promise<Workflow[]>;
  findByName(projectId: number, name: string): Promise<Workflow | null>;
}

export interface IWorkflowVersionRepository
  extends IBasicRepository<WorkflowVersion> {
  findByWorkflowId(workflowId: number): Promise<WorkflowVersion[]>;
  findLatest(workflowId: number): Promise<WorkflowVersion | null>;
}

const JSON_FIELDS = ['graph', 'variables'];

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

export class WorkflowRepository
  extends BaseRepository<Workflow>
  implements IWorkflowRepository
{
  constructor(knexPg: Knex) {
    super({ knexPg, tableName: 'workflow' });
  }

  public async findByProjectId(projectId: number): Promise<Workflow[]> {
    return this.findAllBy({ projectId } as Partial<Workflow>);
  }

  public async findByName(
    projectId: number,
    name: string,
  ): Promise<Workflow | null> {
    return this.findOneBy({ projectId, name } as Partial<Workflow>);
  }

  protected override transformFromDBData = (data: any) =>
    transformFromDB(data) as Workflow;

  protected override transformToDBData = (data: any) => transformToDB(data);
}

export class WorkflowVersionRepository
  extends BaseRepository<WorkflowVersion>
  implements IWorkflowVersionRepository
{
  constructor(knexPg: Knex) {
    super({ knexPg, tableName: 'workflow_version' });
  }

  public async findByWorkflowId(
    workflowId: number,
  ): Promise<WorkflowVersion[]> {
    return this.findAllBy(
      { workflowId } as Partial<WorkflowVersion>,
      { order: 'version' },
    );
  }

  public async findLatest(
    workflowId: number,
  ): Promise<WorkflowVersion | null> {
    const rows = await this.knex(this.tableName)
      .where('workflow_id', workflowId)
      .orderBy('version', 'desc')
      .limit(1);
    return rows.length > 0 ? (transformFromDB(rows[0]) as WorkflowVersion) : null;
  }

  protected override transformFromDBData = (data: any) =>
    transformFromDB(data) as WorkflowVersion;

  protected override transformToDBData = (data: any) => transformToDB(data);
}
