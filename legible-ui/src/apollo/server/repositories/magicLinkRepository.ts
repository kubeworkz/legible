import { Knex } from 'knex';
import { BaseRepository, IBasicRepository } from './baseRepository';

export interface MagicLink {
  id: number;
  userId: number;
  token: string;
  expiresAt: string;
  usedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IMagicLinkRepository extends IBasicRepository<MagicLink> {
  findByToken(token: string): Promise<MagicLink | null>;
  deleteExpiredByUserId(userId: number): Promise<number>;
}

export class MagicLinkRepository
  extends BaseRepository<MagicLink>
  implements IMagicLinkRepository
{
  constructor(knexPg: Knex) {
    super({ knexPg, tableName: 'magic_link' });
  }

  public async findByToken(token: string): Promise<MagicLink | null> {
    return this.findOneBy({ token } as Partial<MagicLink>);
  }

  public async deleteExpiredByUserId(userId: number): Promise<number> {
    return this.knex(this.tableName)
      .where('user_id', userId)
      .andWhere((qb) => {
        qb.where('expires_at', '<', new Date().toISOString()).orWhereNotNull(
          'used_at',
        );
      })
      .delete();
  }
}
