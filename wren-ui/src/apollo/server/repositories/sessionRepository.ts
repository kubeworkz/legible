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
  deleteAllByUserId(userId: number, exceptSessionId?: number): Promise<number>;
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

  /**
   * Delete all sessions for a user.
   * Optionally exclude a specific session (e.g. the current one).
   */
  public async deleteAllByUserId(
    userId: number,
    exceptSessionId?: number,
  ): Promise<number> {
    const query = this.knex(this.tableName).where('user_id', userId);
    if (exceptSessionId) {
      query.andWhereNot('id', exceptSessionId);
    }
    return query.delete();
  }
}
