import { Knex } from 'knex';
import {
  BaseRepository,
  IBasicRepository,
  IQueryOptions,
} from './baseRepository';

export interface SessionProperty {
  id: number;
  projectId: number;
  name: string;
  type: string; // 'string' | 'number' | 'boolean'
  required: boolean;
  defaultExpr: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ISessionPropertyRepository
  extends IBasicRepository<SessionProperty> {
  findAllByProjectId(
    projectId: number,
    queryOptions?: IQueryOptions,
  ): Promise<SessionProperty[]>;
  findAllByIds(ids: number[]): Promise<SessionProperty[]>;
}

export class SessionPropertyRepository
  extends BaseRepository<SessionProperty>
  implements ISessionPropertyRepository
{
  constructor(knexPg: Knex) {
    super({ knexPg, tableName: 'session_property' });
  }

  public async findAllByProjectId(
    projectId: number,
    queryOptions?: IQueryOptions,
  ) {
    return this.findAllBy({ projectId } as Partial<SessionProperty>, {
      ...queryOptions,
      order: 'created_at',
    });
  }

  public async findAllByIds(ids: number[]) {
    const res = await this.knex<SessionProperty>(this.tableName).whereIn(
      'id',
      ids,
    );
    return res.map((r) => this.transformFromDBData(r));
  }
}
