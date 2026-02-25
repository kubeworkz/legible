import { Knex } from 'knex';
import { BaseRepository, IBasicRepository } from './baseRepository';

export interface Session {
  id: number;
  userId: number;
  token: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface ISessionRepository extends IBasicRepository<Session> {
  findByToken(token: string): Promise<Session | null>;
  deleteExpired(): Promise<number>;
}

export class SessionRepository
  extends BaseRepository<Session>
  implements ISessionRepository
{
  constructor(knexPg: Knex) {
    super({ knexPg, tableName: 'session' });
  }

  public async findByToken(token: string): Promise<Session | null> {
    return this.findOneBy({ token } as Partial<Session>);
  }

  public async deleteExpired(): Promise<number> {
    return this.knex(this.tableName)
      .where('expires_at', '<', new Date().toISOString())
      .delete();
  }
}
