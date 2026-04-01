import {
  IProjectMemberRepository,
  ProjectMember,
  ProjectRole,
} from '@server/repositories/projectMemberRepository';
import {
  IMemberRepository,
  MemberRole,
} from '@server/repositories/memberRepository';

export interface IProjectMemberService {
  /**
   * Resolve the effective project role for a user.
   * Org OWNER/ADMIN get implicit OWNER access to every project.
   * Otherwise falls back to explicit project_member row, or null.
   */
  getEffectiveRole(
    projectId: number,
    userId: number,
    organizationId?: number,
  ): Promise<ProjectRole | null>;

  /**
   * Assert the user has one of the required roles on the project.
   * Throws if the user does not have sufficient access.
   */
  requireProjectRole(
    projectId: number,
    userId: number,
    requiredRoles: ProjectRole[],
    organizationId?: number,
  ): Promise<ProjectMember | { role: ProjectRole }>;

  /** Add or update a project member. */
  addMember(
    projectId: number,
    userId: number,
    role: ProjectRole,
    grantedBy?: number | null,
  ): Promise<ProjectMember>;

  /** Update an existing project member's role. */
  updateRole(
    projectId: number,
    userId: number,
    role: ProjectRole,
  ): Promise<ProjectMember>;

  /** Remove a user's explicit access to a project. */
  removeMember(projectId: number, userId: number): Promise<boolean>;

  /** List all explicit members of a project. */
  listMembers(projectId: number): Promise<ProjectMember[]>;

  /** List all projects a user has explicit access to. */
  listProjectsForUser(userId: number): Promise<ProjectMember[]>;
}

export class ProjectMemberService implements IProjectMemberService {
  private readonly projectMemberRepository: IProjectMemberRepository;
  private readonly memberRepository: IMemberRepository;

  constructor({
    projectMemberRepository,
    memberRepository,
  }: {
    projectMemberRepository: IProjectMemberRepository;
    memberRepository: IMemberRepository;
  }) {
    this.projectMemberRepository = projectMemberRepository;
    this.memberRepository = memberRepository;
  }

  public async getEffectiveRole(
    projectId: number,
    userId: number,
    organizationId?: number,
  ): Promise<ProjectRole | null> {
    // Org OWNER / ADMIN bypass — they get implicit project OWNER access
    if (organizationId) {
      const orgMember = await this.memberRepository.findByOrgAndUser(
        organizationId,
        userId,
      );
      if (
        orgMember &&
        (orgMember.role === MemberRole.OWNER ||
          orgMember.role === MemberRole.ADMIN)
      ) {
        return ProjectRole.OWNER;
      }
    }

    // Explicit project_member row
    const pm = await this.projectMemberRepository.findByProjectAndUser(
      projectId,
      userId,
    );
    return pm ? pm.role : null;
  }

  public async requireProjectRole(
    projectId: number,
    userId: number,
    requiredRoles: ProjectRole[],
    organizationId?: number,
  ): Promise<ProjectMember | { role: ProjectRole }> {
    const effectiveRole = await this.getEffectiveRole(
      projectId,
      userId,
      organizationId,
    );
    if (!effectiveRole || !requiredRoles.includes(effectiveRole)) {
      throw new Error(
        `Access denied: requires one of [${requiredRoles.join(', ')}] on project ${projectId}`,
      );
    }

    // Return the explicit row if it exists, otherwise a synthetic object
    const pm = await this.projectMemberRepository.findByProjectAndUser(
      projectId,
      userId,
    );
    return pm ?? { role: effectiveRole };
  }

  public async addMember(
    projectId: number,
    userId: number,
    role: ProjectRole,
    grantedBy?: number | null,
  ): Promise<ProjectMember> {
    return this.projectMemberRepository.upsert(
      projectId,
      userId,
      role,
      grantedBy,
    );
  }

  public async updateRole(
    projectId: number,
    userId: number,
    role: ProjectRole,
  ): Promise<ProjectMember> {
    const existing =
      await this.projectMemberRepository.findByProjectAndUser(
        projectId,
        userId,
      );
    if (!existing) {
      throw new Error(
        `User ${userId} is not an explicit member of project ${projectId}`,
      );
    }
    return this.projectMemberRepository.upsert(projectId, userId, role);
  }

  public async removeMember(
    projectId: number,
    userId: number,
  ): Promise<boolean> {
    return this.projectMemberRepository.removeByProjectAndUser(
      projectId,
      userId,
    );
  }

  public async listMembers(projectId: number): Promise<ProjectMember[]> {
    return this.projectMemberRepository.findAllByProject(projectId);
  }

  public async listProjectsForUser(
    userId: number,
  ): Promise<ProjectMember[]> {
    return this.projectMemberRepository.findAllByUser(userId);
  }
}
