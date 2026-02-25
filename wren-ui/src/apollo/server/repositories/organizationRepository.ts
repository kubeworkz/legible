import { Knex } from 'knex';
import { BaseRepository, IBasicRepository } from './baseRepository';

export interface Organization {
  id: number;
  displayName: string;
  slug: string;
  logoUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IOrganizationRepository
  extends IBasicRepository<Organization>
{
  findBySlug(slug: string): Promise<Organization | null>;
}

export class OrganizationRepository
  extends BaseRepository<Organization>
  implements IOrganizationRepository
{
  constructor(knexPg: Knex) {
    super({ knexPg, tableName: 'organization' });
  }

  public async findBySlug(slug: string): Promise<Organization | null> {
    return this.findOneBy({ slug } as Partial<Organization>);
  }
}
