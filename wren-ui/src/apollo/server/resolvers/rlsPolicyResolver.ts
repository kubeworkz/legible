import { IContext } from '@server/types/context';
import { SessionProperty } from '@server/repositories/sessionPropertyRepository';
import { UserSessionPropertyValue } from '@server/repositories/userSessionPropertyValueRepository';
import {
  RlsPolicyDetail,
  CreateSessionPropertyInput,
  UpdateSessionPropertyInput,
  CreateRlsPolicyInput,
  UpdateRlsPolicyInput,
  AssignSessionPropertyValueInput,
} from '@server/services/rlsPolicyService';

export class RlsPolicyResolver {
  constructor() {
    // Session Properties
    this.listSessionProperties = this.listSessionProperties.bind(this);
    this.createSessionProperty = this.createSessionProperty.bind(this);
    this.updateSessionProperty = this.updateSessionProperty.bind(this);
    this.deleteSessionProperty = this.deleteSessionProperty.bind(this);

    // RLS Policies
    this.listRlsPolicies = this.listRlsPolicies.bind(this);
    this.getRlsPolicy = this.getRlsPolicy.bind(this);
    this.createRlsPolicy = this.createRlsPolicy.bind(this);
    this.updateRlsPolicy = this.updateRlsPolicy.bind(this);
    this.deleteRlsPolicy = this.deleteRlsPolicy.bind(this);

    // User Session Property Values
    this.listUserSessionPropertyValues =
      this.listUserSessionPropertyValues.bind(this);
    this.assignSessionPropertyValues =
      this.assignSessionPropertyValues.bind(this);
  }

  // ── Session Properties ──────────────────────────────────────────

  public async listSessionProperties(
    _root: unknown,
    _arg: any,
    ctx: IContext,
  ): Promise<SessionProperty[]> {
    const project = await ctx.projectService.getCurrentProject(ctx.projectId);
    return ctx.rlsPolicyService.listSessionProperties(project.id);
  }

  public async createSessionProperty(
    _root: unknown,
    arg: { data: CreateSessionPropertyInput },
    ctx: IContext,
  ): Promise<SessionProperty> {
    const project = await ctx.projectService.getCurrentProject(ctx.projectId);
    return ctx.rlsPolicyService.createSessionProperty(project.id, arg.data);
  }

  public async updateSessionProperty(
    _root: unknown,
    arg: { where: { id: number }; data: UpdateSessionPropertyInput },
    ctx: IContext,
  ): Promise<SessionProperty> {
    const project = await ctx.projectService.getCurrentProject(ctx.projectId);
    return ctx.rlsPolicyService.updateSessionProperty(
      project.id,
      arg.where.id,
      arg.data,
    );
  }

  public async deleteSessionProperty(
    _root: unknown,
    arg: { where: { id: number } },
    ctx: IContext,
  ): Promise<boolean> {
    const project = await ctx.projectService.getCurrentProject(ctx.projectId);
    return ctx.rlsPolicyService.deleteSessionProperty(
      project.id,
      arg.where.id,
    );
  }

  // ── RLS Policies ───────────────────────────────────────────────

  public async listRlsPolicies(
    _root: unknown,
    _arg: any,
    ctx: IContext,
  ): Promise<RlsPolicyDetail[]> {
    const project = await ctx.projectService.getCurrentProject(ctx.projectId);
    return ctx.rlsPolicyService.listRlsPolicies(project.id);
  }

  public async getRlsPolicy(
    _root: unknown,
    arg: { where: { id: number } },
    ctx: IContext,
  ): Promise<RlsPolicyDetail> {
    const project = await ctx.projectService.getCurrentProject(ctx.projectId);
    return ctx.rlsPolicyService.getRlsPolicy(project.id, arg.where.id);
  }

  public async createRlsPolicy(
    _root: unknown,
    arg: { data: CreateRlsPolicyInput },
    ctx: IContext,
  ): Promise<RlsPolicyDetail> {
    const project = await ctx.projectService.getCurrentProject(ctx.projectId);
    return ctx.rlsPolicyService.createRlsPolicy(project.id, arg.data);
  }

  public async updateRlsPolicy(
    _root: unknown,
    arg: { where: { id: number }; data: UpdateRlsPolicyInput },
    ctx: IContext,
  ): Promise<RlsPolicyDetail> {
    const project = await ctx.projectService.getCurrentProject(ctx.projectId);
    return ctx.rlsPolicyService.updateRlsPolicy(
      project.id,
      arg.where.id,
      arg.data,
    );
  }

  public async deleteRlsPolicy(
    _root: unknown,
    arg: { where: { id: number } },
    ctx: IContext,
  ): Promise<boolean> {
    const project = await ctx.projectService.getCurrentProject(ctx.projectId);
    return ctx.rlsPolicyService.deleteRlsPolicy(project.id, arg.where.id);
  }

  // ── User Session Property Values ──────────────────────────────

  public async listUserSessionPropertyValues(
    _root: unknown,
    arg: { userId: number },
    ctx: IContext,
  ): Promise<UserSessionPropertyValue[]> {
    return ctx.rlsPolicyService.listUserSessionPropertyValues(arg.userId);
  }

  public async assignSessionPropertyValues(
    _root: unknown,
    arg: { data: AssignSessionPropertyValueInput[] },
    ctx: IContext,
  ): Promise<boolean> {
    return ctx.rlsPolicyService.assignSessionPropertyValues(arg.data);
  }

  // ── Nested resolvers ──────────────────────────────────────────

  public getRlsPolicyNestedResolver = () => ({
    createdAt: (policy: RlsPolicyDetail) =>
      new Date(policy.createdAt).toISOString(),
    updatedAt: (policy: RlsPolicyDetail) =>
      new Date(policy.updatedAt).toISOString(),
  });

  public getSessionPropertyNestedResolver = () => ({
    createdAt: (prop: SessionProperty) =>
      new Date(prop.createdAt).toISOString(),
    updatedAt: (prop: SessionProperty) =>
      new Date(prop.updatedAt).toISOString(),
  });
}
