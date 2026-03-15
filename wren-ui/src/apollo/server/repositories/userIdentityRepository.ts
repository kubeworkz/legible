import { Knex } from 'knex';
import { BaseRepository, IBasicRepository } from './baseRepository';

export interface UserIdentity {
  id: number;
  userId: number;
  providerSlug: string;
  subject: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  rawClaims: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IUserIdentityRepository
  extends IBasicRepository<UserIdentity> {
  findByProviderAndSubject(
    providerSlug: string,
    subject: string,
  ): Promise<UserIdentity | null>;
  findAllByUserId(userId: number): Promise<UserIdentity[]>;
}

export class UserIdentityRepository
  extends BaseRepository<UserIdentity>
  implements IUserIdentityRepository
{
  constructor(knexPg: Knex) {
    super({ knexPg, tableName: 'user_identity' });
  }

  public async findByProviderAndSubject(
    providerSlug: string,
    subject: string,
  ): Promise<UserIdentity | null> {
    return this.findOneBy({
      providerSlug,
      subject,
    } as Partial<UserIdentity>);
  }

  public async findAllByUserId(userId: number): Promise<UserIdentity[]> {
    return this.findAllBy({ userId } as Partial<UserIdentity>);
  }
}
