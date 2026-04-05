import { Knex } from 'knex';
import { BaseRepository, IBasicRepository } from './baseRepository';
import { camelCase, isPlainObject, mapKeys, mapValues, snakeCase } from 'lodash';

// ─── Entities ──────────────────────────────────────────────────

export interface WorkflowExecution {
  id: number;
  workflowId: number;
  projectId: number;
  workflowVersion: number;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  input: any | null;
  output: any | null;
  error: string | null;
  durationMs: number | null;
  createdBy: number | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

export interface WorkflowExecutionStep {
  id: number;
  executionId: number;
  nodeId: string;
  nodeType: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  input: any | null;
  output: any | null;
  error: string | null;
  durationMs: number | null;
  retryCount: number;
  startedAt: string | null;
  completedAt: string | null;
}

// ─── JSON field transforms ─────────────────────────────────────

const EXECUTION_JSON_FIELDS = ['input', 'output'];
const STEP_JSON_FIELDS = ['input', 'output'];

function transformFromDB(data: any, jsonFields: string[]): any {
  if (!isPlainObject(data)) return data;
  const camelCaseData = mapKeys(data, (_v, k) => camelCase(k));
  return mapValues(camelCaseData, (value, key) => {
    if (jsonFields.includes(key) && typeof value === 'string') {
      try { return JSON.parse(value); } catch { return value; }
    }
    return value;
  });
}

function transformToDB(data: any, jsonFields: string[]): any {
  if (!isPlainObject(data)) return data;
  const transformed = mapValues(data, (value, key) => {
    if (jsonFields.includes(key) && value != null && typeof value !== 'string') {
      return JSON.stringify(value);
    }
    return value;
  });
  return mapKeys(transformed, (_v, k) => snakeCase(k));
}

// ─── Repository interfaces ─────────────────────────────────────

export interface IWorkflowExecutionRepository {
  findOneBy(criteria: Partial<WorkflowExecution>): Promise<WorkflowExecution | null>;
  findByWorkflowId(workflowId: number, limit?: number): Promise<WorkflowExecution[]>;
  findByProjectId(projectId: number, limit?: number): Promise<WorkflowExecution[]>;
  createOne(data: Partial<WorkflowExecution>): Promise<WorkflowExecution>;
  updateOne(id: number, data: Partial<WorkflowExecution>): Promise<WorkflowExecution>;
}

export interface IWorkflowExecutionStepRepository {
  findOneBy(criteria: Partial<WorkflowExecutionStep>): Promise<WorkflowExecutionStep | null>;
  findByExecutionId(executionId: number): Promise<WorkflowExecutionStep[]>;
  createOne(data: Partial<WorkflowExecutionStep>): Promise<WorkflowExecutionStep>;
  updateOne(id: number, data: Partial<WorkflowExecutionStep>): Promise<WorkflowExecutionStep>;
  createMany(rows: Array<Partial<WorkflowExecutionStep>>): Promise<WorkflowExecutionStep[]>;
}

// ─── Repository implementations ────────────────────────────────

export class WorkflowExecutionRepository
  extends BaseRepository<WorkflowExecution>
  implements IWorkflowExecutionRepository
{
  constructor(knexPg: Knex) {
    super({ knexPg, tableName: 'workflow_execution' });
  }

  public async findByWorkflowId(
    workflowId: number,
    limit = 50,
  ): Promise<WorkflowExecution[]> {
    const rows = await this.knex(this.tableName)
      .where('workflow_id', workflowId)
      .orderBy('created_at', 'desc')
      .limit(limit);
    return rows.map((r: any) => transformFromDB(r, EXECUTION_JSON_FIELDS));
  }

  public async findByProjectId(
    projectId: number,
    limit = 50,
  ): Promise<WorkflowExecution[]> {
    const rows = await this.knex(this.tableName)
      .where('project_id', projectId)
      .orderBy('created_at', 'desc')
      .limit(limit);
    return rows.map((r: any) => transformFromDB(r, EXECUTION_JSON_FIELDS));
  }

  public async findOneBy(
    criteria: Partial<WorkflowExecution>,
  ): Promise<WorkflowExecution | null> {
    const snaked = mapKeys(criteria, (_v, k) => snakeCase(k));
    const row = await this.knex(this.tableName).where(snaked).first();
    return row ? transformFromDB(row, EXECUTION_JSON_FIELDS) : null;
  }

  public async createOne(
    data: Partial<WorkflowExecution>,
  ): Promise<WorkflowExecution> {
    const prepared = transformToDB(data, EXECUTION_JSON_FIELDS);
    const [id] = await this.knex(this.tableName)
      .insert(prepared)
      .returning('id');
    const insertedId = typeof id === 'object' ? id.id : id;
    return this.findOneBy({ id: insertedId } as any) as Promise<WorkflowExecution>;
  }

  public async updateOne(
    id: number,
    data: Partial<WorkflowExecution>,
  ): Promise<WorkflowExecution> {
    const prepared = transformToDB(data, EXECUTION_JSON_FIELDS);
    await this.knex(this.tableName).where('id', id).update(prepared);
    return this.findOneBy({ id } as any) as Promise<WorkflowExecution>;
  }
}

export class WorkflowExecutionStepRepository
  extends BaseRepository<WorkflowExecutionStep>
  implements IWorkflowExecutionStepRepository
{
  constructor(knexPg: Knex) {
    super({ knexPg, tableName: 'workflow_execution_step' });
  }

  public async findByExecutionId(
    executionId: number,
  ): Promise<WorkflowExecutionStep[]> {
    const rows = await this.knex(this.tableName)
      .where('execution_id', executionId)
      .orderBy('id', 'asc');
    return rows.map((r: any) => transformFromDB(r, STEP_JSON_FIELDS));
  }

  public async findOneBy(
    criteria: Partial<WorkflowExecutionStep>,
  ): Promise<WorkflowExecutionStep | null> {
    const snaked = mapKeys(criteria, (_v, k) => snakeCase(k));
    const row = await this.knex(this.tableName).where(snaked).first();
    return row ? transformFromDB(row, STEP_JSON_FIELDS) : null;
  }

  public async createOne(
    data: Partial<WorkflowExecutionStep>,
  ): Promise<WorkflowExecutionStep> {
    const prepared = transformToDB(data, STEP_JSON_FIELDS);
    const [id] = await this.knex(this.tableName)
      .insert(prepared)
      .returning('id');
    const insertedId = typeof id === 'object' ? id.id : id;
    return this.findOneBy({ id: insertedId } as any) as Promise<WorkflowExecutionStep>;
  }

  public async updateOne(
    id: number,
    data: Partial<WorkflowExecutionStep>,
  ): Promise<WorkflowExecutionStep> {
    const prepared = transformToDB(data, STEP_JSON_FIELDS);
    await this.knex(this.tableName).where('id', id).update(prepared);
    return this.findOneBy({ id } as any) as Promise<WorkflowExecutionStep>;
  }

  public async createMany(
    rows: Array<Partial<WorkflowExecutionStep>>,
  ): Promise<WorkflowExecutionStep[]> {
    const results: WorkflowExecutionStep[] = [];
    for (const row of rows) {
      results.push(await this.createOne(row));
    }
    return results;
  }
}
