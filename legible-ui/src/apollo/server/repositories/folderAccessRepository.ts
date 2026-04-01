import { Knex } from 'knex';
import {
  BaseRepository,
  IBasicRepository,
  IQueryOptions,
} from './baseRepository';

export type FolderAccessRole = 'editor' | 'viewer';

export interface FolderAccess {
  id: number;
  folderId: number;
  userId: number;
  role: FolderAccessRole;
  createdAt: string;
  updatedAt: string;
}

export interface IFolderAccessRepository
  extends IBasicRepository<FolderAccess> {
  findAllByFolderId(
    folderId: number,
    queryOptions?: IQueryOptions,
  ): Promise<FolderAccess[]>;

  findAllByUserId(
    userId: number,
    queryOptions?: IQueryOptions,
  ): Promise<FolderAccess[]>;

  upsert(
    folderId: number,
    userId: number,
    role: FolderAccessRole,
    queryOptions?: IQueryOptions,
  ): Promise<FolderAccess>;

  deleteByFolderAndUser(
    folderId: number,
    userId: number,
    queryOptions?: IQueryOptions,
  ): Promise<number>;

  /** Replace all access entries for a folder with the given list */
  setAccess(
    folderId: number,
    entries: Array<{ userId: number; role: FolderAccessRole }>,
    queryOptions?: IQueryOptions,
  ): Promise<FolderAccess[]>;
}

export class FolderAccessRepository
  extends BaseRepository<FolderAccess>
  implements IFolderAccessRepository
{
  constructor(knexPg: Knex) {
    super({ knexPg, tableName: 'folder_access' });
  }

  public async findAllByFolderId(
    folderId: number,
    queryOptions?: IQueryOptions,
  ): Promise<FolderAccess[]> {
    return this.findAllBy({ folderId } as Partial<FolderAccess>, queryOptions);
  }

  public async findAllByUserId(
    userId: number,
    queryOptions?: IQueryOptions,
  ): Promise<FolderAccess[]> {
    return this.findAllBy({ userId } as Partial<FolderAccess>, queryOptions);
  }

  public async upsert(
    folderId: number,
    userId: number,
    role: FolderAccessRole,
    queryOptions?: IQueryOptions,
  ): Promise<FolderAccess> {
    const existing = await this.findOneBy(
      { folderId, userId } as Partial<FolderAccess>,
      queryOptions,
    );
    if (existing) {
      return this.updateOne(existing.id, { role } as Partial<FolderAccess>, queryOptions);
    }
    return this.createOne(
      { folderId, userId, role } as Partial<FolderAccess>,
      queryOptions,
    );
  }

  public async deleteByFolderAndUser(
    folderId: number,
    userId: number,
    queryOptions?: IQueryOptions,
  ): Promise<number> {
    return this.deleteAllBy(
      { folderId, userId } as Partial<FolderAccess>,
      queryOptions,
    );
  }

  public async setAccess(
    folderId: number,
    entries: Array<{ userId: number; role: FolderAccessRole }>,
    queryOptions?: IQueryOptions,
  ): Promise<FolderAccess[]> {
    // Remove all existing access for this folder
    await this.deleteAllBy(
      { folderId } as Partial<FolderAccess>,
      queryOptions,
    );
    // Insert the new entries
    if (entries.length === 0) return [];
    return this.createMany(
      entries.map((e) => ({
        folderId,
        userId: e.userId,
        role: e.role,
      })) as Partial<FolderAccess>[],
      queryOptions,
    );
  }
}
