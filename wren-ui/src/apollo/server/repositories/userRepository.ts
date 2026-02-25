import { Knex } from 'knex';
import { BaseRepository, IBasicRepository } from './baseRepository';

export interface User {
  id: number;
  email: string;
  passwordHash: string;
  displayName: string | null;
  avatarUrl: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IUserRepository extends IBasicRepository<User> {
  findByEmail(email: string): Promise<User | null>;
}

export class UserRepository
  extends BaseRepository<User>
  implements IUserRepository
{
  constructor(knexPg: Knex) {
    super({ knexPg, tableName: 'user' });
  }

  public async findByEmail(email: string): Promise<User | null> {
    return this.findOneBy({ email } as Partial<User>);
  }
}
