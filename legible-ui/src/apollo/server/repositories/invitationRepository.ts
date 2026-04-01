import { Knex } from 'knex';
import { BaseRepository, IBasicRepository } from './baseRepository';

export interface Invitation {
  id: number;
  organizationId: number;
  email: string;
  role: string;
  token: string;
  invitedBy: number;
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IInvitationRepository extends IBasicRepository<Invitation> {
  findByToken(token: string): Promise<Invitation | null>;
  findPendingByEmail(email: string): Promise<Invitation[]>;
}

export class InvitationRepository
  extends BaseRepository<Invitation>
  implements IInvitationRepository
{
  constructor(knexPg: Knex) {
    super({ knexPg, tableName: 'invitation' });
  }

  public async findByToken(token: string): Promise<Invitation | null> {
    return this.findOneBy({ token } as Partial<Invitation>);
  }

  public async findPendingByEmail(email: string): Promise<Invitation[]> {
    const results = await this.knex(this.tableName)
      .where('email', email)
      .whereNull('accepted_at')
      .where('expires_at', '>', new Date().toISOString())
      .select('*');
    return results.map((row: any) => this.transformFromDBData(row));
  }
}
