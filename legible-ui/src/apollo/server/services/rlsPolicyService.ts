import { getLogger } from '@server/utils';
import { ISessionPropertyRepository } from '@server/repositories/sessionPropertyRepository';
import {
  IRlsPolicyRepository,
  RlsPolicy,
} from '@server/repositories/rlsPolicyRepository';
import { IUserSessionPropertyValueRepository } from '@server/repositories/userSessionPropertyValueRepository';
import { SessionProperty } from '@server/repositories/sessionPropertyRepository';
import { UserSessionPropertyValue } from '@server/repositories/userSessionPropertyValueRepository';

const logger = getLogger('RlsPolicyService');

// ── Input types ─────────────────────────────────────────────────────

export interface CreateSessionPropertyInput {
  name: string;
  type: string;
  required: boolean;
  defaultExpr?: string | null;
}

export interface UpdateSessionPropertyInput {
  name?: string;
  type?: string;
  required?: boolean;
  defaultExpr?: string | null;
}

export interface CreateRlsPolicyInput {
  name: string;
  condition: string;
  modelIds: number[];
  sessionPropertyIds: number[];
}

export interface UpdateRlsPolicyInput {
  name?: string;
  condition?: string;
  modelIds?: number[];
  sessionPropertyIds?: number[];
}

export interface AssignSessionPropertyValueInput {
  userId: number;
  sessionPropertyId: number;
  value: string;
}

// ── Return types (enriched) ─────────────────────────────────────────

export interface RlsPolicyDetail extends RlsPolicy {
  modelIds: number[];
  sessionPropertyIds: number[];
}

// ── Service interface ───────────────────────────────────────────────

export interface IRlsPolicyService {
  // Session Properties
  listSessionProperties(projectId: number): Promise<SessionProperty[]>;
  createSessionProperty(
    projectId: number,
    data: CreateSessionPropertyInput,
  ): Promise<SessionProperty>;
  updateSessionProperty(
    projectId: number,
    id: number,
    data: UpdateSessionPropertyInput,
  ): Promise<SessionProperty>;
  deleteSessionProperty(projectId: number, id: number): Promise<boolean>;

  // RLS Policies
  listRlsPolicies(projectId: number): Promise<RlsPolicyDetail[]>;
  getRlsPolicy(projectId: number, id: number): Promise<RlsPolicyDetail>;
  createRlsPolicy(
    projectId: number,
    data: CreateRlsPolicyInput,
  ): Promise<RlsPolicyDetail>;
  updateRlsPolicy(
    projectId: number,
    id: number,
    data: UpdateRlsPolicyInput,
  ): Promise<RlsPolicyDetail>;
  deleteRlsPolicy(projectId: number, id: number): Promise<boolean>;

  // User Session Property Values
  listUserSessionPropertyValues(
    userId: number,
  ): Promise<UserSessionPropertyValue[]>;
  assignSessionPropertyValues(
    data: AssignSessionPropertyValueInput[],
  ): Promise<boolean>;

  /**
   * Resolve the current user's session property values for a given project.
   * Returns a Record<propertyName, value> suitable for passing as
   * x-wren-variable-* headers to the engine.
   * Properties with no assigned value fall back to defaultExpr if available.
   */
  resolveSessionProperties(
    projectId: number,
    userId: number,
  ): Promise<Record<string, string>>;
}

// ── Service implementation ──────────────────────────────────────────

export class RlsPolicyService implements IRlsPolicyService {
  private sessionPropertyRepository: ISessionPropertyRepository;
  private rlsPolicyRepository: IRlsPolicyRepository;
  private userSessionPropertyValueRepository: IUserSessionPropertyValueRepository;

  constructor({
    sessionPropertyRepository,
    rlsPolicyRepository,
    userSessionPropertyValueRepository,
  }: {
    sessionPropertyRepository: ISessionPropertyRepository;
    rlsPolicyRepository: IRlsPolicyRepository;
    userSessionPropertyValueRepository: IUserSessionPropertyValueRepository;
  }) {
    this.sessionPropertyRepository = sessionPropertyRepository;
    this.rlsPolicyRepository = rlsPolicyRepository;
    this.userSessionPropertyValueRepository =
      userSessionPropertyValueRepository;
  }

  // ── Session Properties ──────────────────────────────────────────

  public async listSessionProperties(
    projectId: number,
  ): Promise<SessionProperty[]> {
    return this.sessionPropertyRepository.findAllByProjectId(projectId);
  }

  public async createSessionProperty(
    projectId: number,
    data: CreateSessionPropertyInput,
  ): Promise<SessionProperty> {
    logger.info(`Creating session property "${data.name}" in project ${projectId}`);
    return this.sessionPropertyRepository.createOne({
      projectId,
      name: data.name,
      type: data.type,
      required: data.required,
      defaultExpr: data.defaultExpr ?? null,
    });
  }

  public async updateSessionProperty(
    projectId: number,
    id: number,
    data: UpdateSessionPropertyInput,
  ): Promise<SessionProperty> {
    const existing = await this.sessionPropertyRepository.findOneBy({
      id,
      projectId,
    } as any);
    if (!existing) {
      throw new Error(`Session property ${id} not found in project ${projectId}`);
    }
    return this.sessionPropertyRepository.updateOne(id, {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.type !== undefined && { type: data.type }),
      ...(data.required !== undefined && { required: data.required }),
      ...(data.defaultExpr !== undefined && { defaultExpr: data.defaultExpr }),
    } as any);
  }

  public async deleteSessionProperty(
    projectId: number,
    id: number,
  ): Promise<boolean> {
    const existing = await this.sessionPropertyRepository.findOneBy({
      id,
      projectId,
    } as any);
    if (!existing) {
      throw new Error(`Session property ${id} not found in project ${projectId}`);
    }
    await this.sessionPropertyRepository.deleteOne(String(id));
    return true;
  }

  // ── RLS Policies ───────────────────────────────────────────────

  public async listRlsPolicies(
    projectId: number,
  ): Promise<RlsPolicyDetail[]> {
    const policies =
      await this.rlsPolicyRepository.findAllByProjectId(projectId);
    return Promise.all(policies.map((p) => this.enrichPolicy(p)));
  }

  public async getRlsPolicy(
    projectId: number,
    id: number,
  ): Promise<RlsPolicyDetail> {
    const policy = await this.rlsPolicyRepository.findOneBy({
      id,
      projectId,
    } as any);
    if (!policy) {
      throw new Error(`RLS policy ${id} not found in project ${projectId}`);
    }
    return this.enrichPolicy(policy);
  }

  public async createRlsPolicy(
    projectId: number,
    data: CreateRlsPolicyInput,
  ): Promise<RlsPolicyDetail> {
    logger.info(`Creating RLS policy "${data.name}" in project ${projectId}`);
    const tx = await this.rlsPolicyRepository.transaction();
    try {
      const policy = await this.rlsPolicyRepository.createOne(
        {
          projectId,
          name: data.name,
          condition: data.condition,
        },
        { tx },
      );
      await this.rlsPolicyRepository.setModelIds(
        policy.id,
        data.modelIds,
        { tx },
      );
      await this.rlsPolicyRepository.setSessionPropertyIds(
        policy.id,
        data.sessionPropertyIds,
        { tx },
      );
      await this.rlsPolicyRepository.commit(tx);
      return this.enrichPolicy(policy);
    } catch (err) {
      await this.rlsPolicyRepository.rollback(tx);
      throw err;
    }
  }

  public async updateRlsPolicy(
    projectId: number,
    id: number,
    data: UpdateRlsPolicyInput,
  ): Promise<RlsPolicyDetail> {
    const existing = await this.rlsPolicyRepository.findOneBy({
      id,
      projectId,
    } as any);
    if (!existing) {
      throw new Error(`RLS policy ${id} not found in project ${projectId}`);
    }

    const tx = await this.rlsPolicyRepository.transaction();
    try {
      const updatedFields: Partial<RlsPolicy> = {};
      if (data.name !== undefined) updatedFields.name = data.name;
      if (data.condition !== undefined) updatedFields.condition = data.condition;

      if (Object.keys(updatedFields).length > 0) {
        await this.rlsPolicyRepository.updateOne(id, updatedFields, { tx });
      }
      if (data.modelIds !== undefined) {
        await this.rlsPolicyRepository.setModelIds(id, data.modelIds, { tx });
      }
      if (data.sessionPropertyIds !== undefined) {
        await this.rlsPolicyRepository.setSessionPropertyIds(
          id,
          data.sessionPropertyIds,
          { tx },
        );
      }
      await this.rlsPolicyRepository.commit(tx);

      const policy = await this.rlsPolicyRepository.findOneBy({
        id,
        projectId,
      } as any);
      return this.enrichPolicy(policy!);
    } catch (err) {
      await this.rlsPolicyRepository.rollback(tx);
      throw err;
    }
  }

  public async deleteRlsPolicy(
    projectId: number,
    id: number,
  ): Promise<boolean> {
    const existing = await this.rlsPolicyRepository.findOneBy({
      id,
      projectId,
    } as any);
    if (!existing) {
      throw new Error(`RLS policy ${id} not found in project ${projectId}`);
    }
    await this.rlsPolicyRepository.deletePolicyById(id);
    return true;
  }

  // ── User Session Property Values ──────────────────────────────

  public async listUserSessionPropertyValues(
    userId: number,
  ): Promise<UserSessionPropertyValue[]> {
    return this.userSessionPropertyValueRepository.findAllByUserId(userId);
  }

  public async assignSessionPropertyValues(
    data: AssignSessionPropertyValueInput[],
  ): Promise<boolean> {
    for (const item of data) {
      await this.userSessionPropertyValueRepository.upsert(
        item.userId,
        item.sessionPropertyId,
        item.value,
      );
    }
    return true;
  }

  // ── Private helpers ───────────────────────────────────────────

  /**
   * Resolve a user's session property values for the project.
   * For each session property defined in the project:
   *   1. Use the user's explicitly assigned value if present
   *   2. Otherwise fall back to the property's defaultExpr
   *   3. If the property is required and has no value/default, skip it
   *      (engine will enforce the requirement)
   * Returns a map of { propertyName: value }.
   */
  public async resolveSessionProperties(
    projectId: number,
    userId: number,
  ): Promise<Record<string, string>> {
    const [properties, userValues] = await Promise.all([
      this.sessionPropertyRepository.findAllByProjectId(projectId),
      this.userSessionPropertyValueRepository.findAllByUserId(userId),
    ]);

    // Build a lookup: sessionPropertyId → user-assigned value
    const userValueMap = new Map(
      userValues.map((v) => [v.sessionPropertyId, v.value]),
    );

    const result: Record<string, string> = {};
    for (const prop of properties) {
      const userVal = userValueMap.get(prop.id);
      if (userVal !== undefined) {
        result[prop.name] = userVal;
      } else if (prop.defaultExpr) {
        result[prop.name] = prop.defaultExpr;
      }
      // If no value and no default, omit — engine handles required enforcement
    }
    return result;
  }

  private async enrichPolicy(policy: RlsPolicy): Promise<RlsPolicyDetail> {
    const [modelIds, sessionPropertyIds] = await Promise.all([
      this.rlsPolicyRepository.findModelIdsByPolicyId(policy.id),
      this.rlsPolicyRepository.findSessionPropertyIdsByPolicyId(policy.id),
    ]);
    return { ...policy, modelIds, sessionPropertyIds };
  }
}
