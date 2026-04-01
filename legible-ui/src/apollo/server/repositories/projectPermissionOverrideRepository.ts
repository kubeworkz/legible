import { Knex } from 'knex';
import { BaseRepository, IBasicRepository } from './baseRepository';

/**
 * Viewer permission levels for a project section.
 * Owners can restrict Viewer access from the default 'read_only' to 'no_permission'.
 */
export enum ViewerAccess {
  READ_ONLY = 'read_only',
  NO_PERMISSION = 'no_permission',
}

export interface ProjectPermissionOverride {
  id: number;
  projectId: number;
  viewerModelingAccess: ViewerAccess;
  viewerKnowledgeAccess: ViewerAccess;
  createdAt: string;
  updatedAt: string;
}

export interface IProjectPermissionOverrideRepository
  extends IBasicRepository<ProjectPermissionOverride> {
  findByProject(projectId: number): Promise<ProjectPermissionOverride | null>;
  upsert(
    projectId: number,
    data: {
      viewerModelingAccess?: ViewerAccess;
      viewerKnowledgeAccess?: ViewerAccess;
    },
  ): Promise<ProjectPermissionOverride>;
}

export class ProjectPermissionOverrideRepository
  extends BaseRepository<ProjectPermissionOverride>
  implements IProjectPermissionOverrideRepository
{
  constructor(knexPg: Knex) {
    super({ knexPg, tableName: 'project_permission_override' });
  }

  public async findByProject(
    projectId: number,
  ): Promise<ProjectPermissionOverride | null> {
    return this.findOneBy({ projectId } as any);
  }

  public async upsert(
    projectId: number,
    data: {
      viewerModelingAccess?: ViewerAccess;
      viewerKnowledgeAccess?: ViewerAccess;
    },
  ): Promise<ProjectPermissionOverride> {
    const existing = await this.findByProject(projectId);
    if (existing) {
      return this.updateOne(existing.id, {
        ...(data.viewerModelingAccess !== undefined && {
          viewerModelingAccess: data.viewerModelingAccess,
        }),
        ...(data.viewerKnowledgeAccess !== undefined && {
          viewerKnowledgeAccess: data.viewerKnowledgeAccess,
        }),
      } as any);
    }
    return this.createOne({
      projectId,
      viewerModelingAccess: data.viewerModelingAccess ?? ViewerAccess.READ_ONLY,
      viewerKnowledgeAccess: data.viewerKnowledgeAccess ?? ViewerAccess.READ_ONLY,
    } as any);
  }
}
