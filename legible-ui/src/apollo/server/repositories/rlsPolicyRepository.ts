import { Knex } from 'knex';
import {
  BaseRepository,
  IBasicRepository,
  IQueryOptions,
} from './baseRepository';

// ── Main policy record ──────────────────────────────────────────────

export interface RlsPolicy {
  id: number;
  projectId: number;
  name: string;
  condition: string; // SQL predicate with @property refs
  createdAt: string;
  updatedAt: string;
}

// ── Join-table records ──────────────────────────────────────────────

export interface RlsPolicyModel {
  id: number;
  rlsPolicyId: number;
  modelId: number;
}

export interface RlsPolicySessionProperty {
  id: number;
  rlsPolicyId: number;
  sessionPropertyId: number;
}

// ── Repository interface ────────────────────────────────────────────

export interface IRlsPolicyRepository extends IBasicRepository<RlsPolicy> {
  findAllByProjectId(
    projectId: number,
    queryOptions?: IQueryOptions,
  ): Promise<RlsPolicy[]>;

  // Join-table helpers: models
  findModelIdsByPolicyId(policyId: number): Promise<number[]>;
  setModelIds(
    policyId: number,
    modelIds: number[],
    queryOptions?: IQueryOptions,
  ): Promise<void>;

  // Join-table helpers: session properties
  findSessionPropertyIdsByPolicyId(policyId: number): Promise<number[]>;
  setSessionPropertyIds(
    policyId: number,
    sessionPropertyIds: number[],
    queryOptions?: IQueryOptions,
  ): Promise<void>;

  // Cascade-safe delete (removes join rows + policy)
  deletePolicyById(
    id: number,
    queryOptions?: IQueryOptions,
  ): Promise<number>;

  // Look up all policies that reference a given model
  findAllByModelId(modelId: number): Promise<RlsPolicy[]>;
}

// ── Repository implementation ───────────────────────────────────────

export class RlsPolicyRepository
  extends BaseRepository<RlsPolicy>
  implements IRlsPolicyRepository
{
  constructor(knexPg: Knex) {
    super({ knexPg, tableName: 'rls_policy' });
  }

  // ── Queries ────────────────────────────────────────────────────────

  public async findAllByProjectId(
    projectId: number,
    queryOptions?: IQueryOptions,
  ) {
    return this.findAllBy({ projectId } as Partial<RlsPolicy>, {
      ...queryOptions,
      order: 'created_at',
    });
  }

  public async findModelIdsByPolicyId(policyId: number): Promise<number[]> {
    const rows = await this.knex('rls_policy_model')
      .where('rls_policy_id', policyId)
      .select('model_id');
    return rows.map((r: { model_id: number }) => r.model_id);
  }

  public async findSessionPropertyIdsByPolicyId(
    policyId: number,
  ): Promise<number[]> {
    const rows = await this.knex('rls_policy_session_property')
      .where('rls_policy_id', policyId)
      .select('session_property_id');
    return rows.map(
      (r: { session_property_id: number }) => r.session_property_id,
    );
  }

  public async findAllByModelId(modelId: number): Promise<RlsPolicy[]> {
    const rows = await this.knex('rls_policy')
      .join(
        'rls_policy_model',
        'rls_policy.id',
        'rls_policy_model.rls_policy_id',
      )
      .where('rls_policy_model.model_id', modelId)
      .select('rls_policy.*');
    return rows.map((r: any) => this.transformFromDBData(r));
  }

  // ── Mutations ──────────────────────────────────────────────────────

  public async setModelIds(
    policyId: number,
    modelIds: number[],
    queryOptions?: IQueryOptions,
  ): Promise<void> {
    const executer = queryOptions?.tx ? queryOptions.tx : this.knex;
    await executer('rls_policy_model')
      .where('rls_policy_id', policyId)
      .delete();
    if (modelIds.length > 0) {
      await executer('rls_policy_model').insert(
        modelIds.map((modelId) => ({
          rls_policy_id: policyId,
          model_id: modelId,
        })),
      );
    }
  }

  public async setSessionPropertyIds(
    policyId: number,
    sessionPropertyIds: number[],
    queryOptions?: IQueryOptions,
  ): Promise<void> {
    const executer = queryOptions?.tx ? queryOptions.tx : this.knex;
    await executer('rls_policy_session_property')
      .where('rls_policy_id', policyId)
      .delete();
    if (sessionPropertyIds.length > 0) {
      await executer('rls_policy_session_property').insert(
        sessionPropertyIds.map((sessionPropertyId) => ({
          rls_policy_id: policyId,
          session_property_id: sessionPropertyId,
        })),
      );
    }
  }

  public async deletePolicyById(
    id: number,
    queryOptions?: IQueryOptions,
  ): Promise<number> {
    // Join rows cascade via FK ON DELETE CASCADE, so just delete the policy
    return this.deleteOne(String(id), queryOptions);
  }
}
