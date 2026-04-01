import { Knex } from 'knex';
import {
  BaseRepository,
  IBasicRepository,
  IQueryOptions,
} from './baseRepository';

export interface UserSessionPropertyValue {
  id: number;
  userId: number;
  sessionPropertyId: number;
  value: string;
  createdAt: string;
  updatedAt: string;
}

export interface IUserSessionPropertyValueRepository
  extends IBasicRepository<UserSessionPropertyValue> {
  findAllByUserId(
    userId: number,
    queryOptions?: IQueryOptions,
  ): Promise<UserSessionPropertyValue[]>;
  findAllBySessionPropertyId(
    sessionPropertyId: number,
    queryOptions?: IQueryOptions,
  ): Promise<UserSessionPropertyValue[]>;
  upsert(
    userId: number,
    sessionPropertyId: number,
    value: string,
    queryOptions?: IQueryOptions,
  ): Promise<UserSessionPropertyValue>;
  deleteByUserAndProperty(
    userId: number,
    sessionPropertyId: number,
    queryOptions?: IQueryOptions,
  ): Promise<number>;
}

export class UserSessionPropertyValueRepository
  extends BaseRepository<UserSessionPropertyValue>
  implements IUserSessionPropertyValueRepository
{
  constructor(knexPg: Knex) {
    super({ knexPg, tableName: 'user_session_property_value' });
  }

  public async findAllByUserId(
    userId: number,
    queryOptions?: IQueryOptions,
  ) {
    return this.findAllBy(
      { userId } as Partial<UserSessionPropertyValue>,
      queryOptions,
    );
  }

  public async findAllBySessionPropertyId(
    sessionPropertyId: number,
    queryOptions?: IQueryOptions,
  ) {
    return this.findAllBy(
      { sessionPropertyId } as Partial<UserSessionPropertyValue>,
      queryOptions,
    );
  }

  /**
   * Insert or update the value for a (user, sessionProperty) pair.
   * Uses an INSERT … ON CONFLICT … UPDATE pattern that works on both
   * SQLite and PostgreSQL.
   */
  public async upsert(
    userId: number,
    sessionPropertyId: number,
    value: string,
    queryOptions?: IQueryOptions,
  ): Promise<UserSessionPropertyValue> {
    const executer = queryOptions?.tx ? queryOptions.tx : this.knex;
    const existing = await this.findOneBy(
      { userId, sessionPropertyId } as Partial<UserSessionPropertyValue>,
      queryOptions,
    );

    if (existing) {
      return this.updateOne(existing.id, { value } as any, queryOptions);
    }

    return this.createOne(
      { userId, sessionPropertyId, value } as Partial<UserSessionPropertyValue>,
      { tx: executer as Knex.Transaction },
    );
  }

  public async deleteByUserAndProperty(
    userId: number,
    sessionPropertyId: number,
    queryOptions?: IQueryOptions,
  ): Promise<number> {
    return this.deleteAllBy(
      { userId, sessionPropertyId } as Partial<UserSessionPropertyValue>,
      queryOptions,
    );
  }
}
