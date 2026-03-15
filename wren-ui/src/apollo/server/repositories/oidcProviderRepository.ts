import { Knex } from 'knex';
import { BaseRepository, IBasicRepository } from './baseRepository';

export interface OidcProvider {
  id: number;
  slug: string;
  displayName: string;
  issuerUrl: string;
  clientId: string;
  clientSecretEncrypted: string;
  scopes: string;
  emailDomainFilter: string | null;
  autoCreateOrg: boolean;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Public-safe provider info (no secrets) */
export type OidcProviderPublic = Omit<OidcProvider, 'clientSecretEncrypted'>;

export interface IOidcProviderRepository
  extends IBasicRepository<OidcProvider> {
  findBySlug(slug: string): Promise<OidcProvider | null>;
  listEnabled(): Promise<OidcProvider[]>;
}

export class OidcProviderRepository
  extends BaseRepository<OidcProvider>
  implements IOidcProviderRepository
{
  constructor(knexPg: Knex) {
    super({ knexPg, tableName: 'oidc_provider' });
  }

  public async findBySlug(slug: string): Promise<OidcProvider | null> {
    return this.findOneBy({ slug } as Partial<OidcProvider>);
  }

  public async listEnabled(): Promise<OidcProvider[]> {
    return this.findAllBy({ enabled: true } as Partial<OidcProvider>);
  }
}
