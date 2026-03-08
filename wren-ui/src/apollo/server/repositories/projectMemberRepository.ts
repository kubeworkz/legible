import { Knex } from 'knex';
import { BaseRepository, IBasicRepository } from './baseRepository';

export enum ProjectRole {
  OWNER = 'owner',
  CONTRIBUTOR = 'contributor',
  VIEWER = 'viewer',
}

export interface ProjectMember {
  id: number;
  projectId: number;
  userId: number;
  role: ProjectRole;
  grantedBy: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface IProjectMemberRepository
  extends IBasicRepository<ProjectMember> {
  findByProjectAndUser(
    projectId: number,
    userId: number,
  ): Promise<ProjectMember | null>;
  findAllByProject(projectId: number): Promise<ProjectMember[]>;
  findAllByUser(userId: number): Promise<ProjectMember[]>;
  upsert(
    projectId: number,
    userId: number,
    role: ProjectRole,
    grantedBy?: number | null,
  ): Promise<ProjectMember>;
  removeByProjectAndUser(
    projectId: number,
    userId: number,
  ): Promise<boolean>;
}

export class ProjectMemberRepository
  extends BaseRepository<ProjectMember>
  implements IProjectMemberRepository
{
  constructor(knexPg: Knex) {
    super({ knexPg, tableName: 'project_member' });
  }

  public async findByProjectAndUser(
    projectId: number,
    userId: number,
  ): Promise<ProjectMember | null> {
    return this.findOneBy({
      projectId,
      userId,
    } as Partial<ProjectMember>);
  }

  public async findAllByProject(
    projectId: number,
  ): Promise<ProjectMember[]> {
    return this.findAllBy({ projectId } as Partial<ProjectMember>);
  }

  public async findAllByUser(userId: number): Promise<ProjectMember[]> {
    return this.findAllBy({ userId } as Partial<ProjectMember>);
  }

  public async upsert(
    projectId: number,
    userId: number,
    role: ProjectRole,
    grantedBy?: number | null,
  ): Promise<ProjectMember> {
    const existing = await this.findByProjectAndUser(projectId, userId);
    if (existing) {
      return this.updateOne(existing.id, {
        role,
        grantedBy: grantedBy ?? existing.grantedBy,
      } as Partial<ProjectMember>);
    }
    return this.createOne({
      projectId,
      userId,
      role,
      grantedBy: grantedBy ?? null,
    } as Partial<ProjectMember>);
  }

  public async removeByProjectAndUser(
    projectId: number,
    userId: number,
  ): Promise<boolean> {
    const existing = await this.findByProjectAndUser(projectId, userId);
    if (!existing) return false;
    await this.deleteOne(existing.id as any);
    return true;
  }
}
