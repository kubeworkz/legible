import { Knex } from 'knex';
import {
  BaseRepository,
  IBasicRepository,
  IQueryOptions,
} from './baseRepository';

export type FolderType = 'personal' | 'public' | 'custom';
export type FolderVisibility = 'private' | 'shared';

export interface Folder {
  id: number;
  projectId: number;
  name: string;
  type: FolderType;
  ownerId: number;
  visibility: FolderVisibility;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface IFolderRepository extends IBasicRepository<Folder> {
  findAllByProjectId(
    projectId: number,
    queryOptions?: IQueryOptions,
  ): Promise<Folder[]>;

  findByType(
    projectId: number,
    type: FolderType,
    queryOptions?: IQueryOptions,
  ): Promise<Folder[]>;

  findPersonalFolder(
    projectId: number,
    ownerId: number,
    queryOptions?: IQueryOptions,
  ): Promise<Folder | null>;

  findPublicFolder(
    projectId: number,
    queryOptions?: IQueryOptions,
  ): Promise<Folder | null>;

  /**
   * Return folders the user can access:
   *  - all public folders
   *  - personal folder owned by the user
   *  - custom folders they own or have explicit access to
   */
  findAccessibleFolders(
    projectId: number,
    userId: number,
    queryOptions?: IQueryOptions,
  ): Promise<Folder[]>;
}

export class FolderRepository
  extends BaseRepository<Folder>
  implements IFolderRepository
{
  constructor(knexPg: Knex) {
    super({ knexPg, tableName: 'folder' });
  }

  public async findAllByProjectId(
    projectId: number,
    queryOptions?: IQueryOptions,
  ): Promise<Folder[]> {
    return this.findAllBy({ projectId } as Partial<Folder>, {
      ...queryOptions,
      order: 'sort_order',
    });
  }

  public async findByType(
    projectId: number,
    type: FolderType,
    queryOptions?: IQueryOptions,
  ): Promise<Folder[]> {
    return this.findAllBy(
      { projectId, type } as Partial<Folder>,
      queryOptions,
    );
  }

  public async findPersonalFolder(
    projectId: number,
    ownerId: number,
    queryOptions?: IQueryOptions,
  ): Promise<Folder | null> {
    return this.findOneBy(
      { projectId, type: 'personal', ownerId } as Partial<Folder>,
      queryOptions,
    );
  }

  public async findPublicFolder(
    projectId: number,
    queryOptions?: IQueryOptions,
  ): Promise<Folder | null> {
    return this.findOneBy(
      { projectId, type: 'public' } as Partial<Folder>,
      queryOptions,
    );
  }

  public async findAccessibleFolders(
    projectId: number,
    userId: number,
    queryOptions?: IQueryOptions,
  ): Promise<Folder[]> {
    const executer = queryOptions?.tx ? queryOptions.tx : this.knex;

    const rows = await executer('folder')
      .where('folder.project_id', projectId)
      .andWhere(function () {
        // Public folders are visible to everyone
        this.where('folder.type', 'public')
          // Personal folder owned by this user
          .orWhere(function () {
            this.where('folder.type', 'personal').andWhere(
              'folder.owner_id',
              userId,
            );
          })
          // Custom folders the user owns
          .orWhere(function () {
            this.where('folder.type', 'custom').andWhere(
              'folder.owner_id',
              userId,
            );
          })
          // Custom folders the user has explicit access to
          .orWhereIn(
            'folder.id',
            executer('folder_access')
              .select('folder_id')
              .where('user_id', userId),
          );
      })
      .orderBy('folder.sort_order', 'asc')
      .select('folder.*');

    return rows.map((row: any) => this.transformFromDBData(row));
  }
}
