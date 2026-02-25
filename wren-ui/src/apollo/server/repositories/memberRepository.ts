import { Knex } from 'knex';
import { BaseRepository, IBasicRepository } from './baseRepository';

export enum MemberRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MEMBER = 'member',
}

export interface Member {
  id: number;
  organizationId: number;
  userId: number;
  role: MemberRole;
  invitedBy: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface IMemberRepository extends IBasicRepository<Member> {
  findByOrgAndUser(
    organizationId: number,
    userId: number,
  ): Promise<Member | null>;
  findAllByOrganization(organizationId: number): Promise<Member[]>;
}

export class MemberRepository
  extends BaseRepository<Member>
  implements IMemberRepository
{
  constructor(knexPg: Knex) {
    super({ knexPg, tableName: 'member' });
  }

  public async findByOrgAndUser(
    organizationId: number,
    userId: number,
  ): Promise<Member | null> {
    return this.findOneBy({
      organizationId,
      userId,
    } as Partial<Member>);
  }

  public async findAllByOrganization(
    organizationId: number,
  ): Promise<Member[]> {
    return this.findAllBy({ organizationId } as Partial<Member>);
  }
}
