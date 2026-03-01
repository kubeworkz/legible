import {
  IFolderRepository,
  Folder,
  FolderType,
  FolderVisibility,
} from '@server/repositories/folderRepository';
import {
  IFolderAccessRepository,
  FolderAccess,
  FolderAccessRole,
} from '@server/repositories/folderAccessRepository';
import { IDashboardRepository } from '@server/repositories';
import { IThreadRepository } from '@server/repositories';
import { getLogger } from '@server/utils';

const logger = getLogger('FolderService');
logger.level = 'debug';

export interface CreateFolderInput {
  name: string;
  type?: FolderType;
  visibility?: FolderVisibility;
}

export interface UpdateFolderInput {
  name?: string;
  visibility?: FolderVisibility;
  sortOrder?: number;
}

export interface SetFolderAccessInput {
  userId: number;
  role: FolderAccessRole;
}

export interface MoveItemInput {
  itemId: number;
  folderId: number | null;
}

export interface IFolderService {
  // Folder CRUD
  listFolders(projectId: number, userId: number): Promise<Folder[]>;
  getFolder(folderId: number): Promise<Folder>;
  createFolder(
    projectId: number,
    userId: number,
    input: CreateFolderInput,
  ): Promise<Folder>;
  updateFolder(folderId: number, input: UpdateFolderInput): Promise<Folder>;
  deleteFolder(folderId: number): Promise<boolean>;

  // System folders
  ensureSystemFolders(
    projectId: number,
    userId: number,
  ): Promise<{ personal: Folder; public: Folder }>;

  // Access control
  getFolderAccess(folderId: number): Promise<FolderAccess[]>;
  setFolderAccess(
    folderId: number,
    entries: SetFolderAccessInput[],
  ): Promise<FolderAccess[]>;

  // Move items
  moveDashboardToFolder(
    dashboardId: number,
    folderId: number | null,
  ): Promise<boolean>;
  moveThreadToFolder(
    threadId: number,
    folderId: number | null,
  ): Promise<boolean>;
}

export class FolderService implements IFolderService {
  private folderRepository: IFolderRepository;
  private folderAccessRepository: IFolderAccessRepository;
  private dashboardRepository: IDashboardRepository;
  private threadRepository: IThreadRepository;

  constructor({
    folderRepository,
    folderAccessRepository,
    dashboardRepository,
    threadRepository,
  }: {
    folderRepository: IFolderRepository;
    folderAccessRepository: IFolderAccessRepository;
    dashboardRepository: IDashboardRepository;
    threadRepository: IThreadRepository;
  }) {
    this.folderRepository = folderRepository;
    this.folderAccessRepository = folderAccessRepository;
    this.dashboardRepository = dashboardRepository;
    this.threadRepository = threadRepository;
  }

  public async listFolders(
    projectId: number,
    userId: number,
  ): Promise<Folder[]> {
    return this.folderRepository.findAccessibleFolders(projectId, userId);
  }

  public async getFolder(folderId: number): Promise<Folder> {
    const folder = await this.folderRepository.findOneBy({ id: folderId });
    if (!folder) {
      throw new Error(`Folder not found: ${folderId}`);
    }
    return folder;
  }

  public async createFolder(
    projectId: number,
    userId: number,
    input: CreateFolderInput,
  ): Promise<Folder> {
    const type = input.type || 'custom';
    const visibility = input.visibility || 'private';

    // Only allow one personal/public folder per project
    if (type === 'personal') {
      const existing = await this.folderRepository.findPersonalFolder(
        projectId,
        userId,
      );
      if (existing) {
        return existing;
      }
    }
    if (type === 'public') {
      const existing = await this.folderRepository.findPublicFolder(projectId);
      if (existing) {
        return existing;
      }
    }

    // Find max sort_order for this project
    const allFolders =
      await this.folderRepository.findAllByProjectId(projectId);
    const maxSort = allFolders.reduce(
      (max, f) => Math.max(max, f.sortOrder || 0),
      0,
    );

    const folder = await this.folderRepository.createOne({
      projectId,
      name: input.name,
      type,
      ownerId: userId,
      visibility,
      sortOrder: maxSort + 1,
    });

    logger.info(`Created folder: ${folder.id} (${type}) for project ${projectId}`);

    // If custom + shared, give owner editor access
    if (type === 'custom') {
      await this.folderAccessRepository.upsert(folder.id, userId, 'editor');
    }

    return folder;
  }

  public async updateFolder(
    folderId: number,
    input: UpdateFolderInput,
  ): Promise<Folder> {
    const folder = await this.getFolder(folderId);

    // Prevent renaming system folders
    if (
      (folder.type === 'personal' || folder.type === 'public') &&
      input.name
    ) {
      throw new Error('Cannot rename system folders');
    }

    await this.folderRepository.updateOne(folderId, input);
    return this.getFolder(folderId);
  }

  public async deleteFolder(folderId: number): Promise<boolean> {
    const folder = await this.getFolder(folderId);

    // Prevent deleting system folders
    if (folder.type === 'personal' || folder.type === 'public') {
      throw new Error('Cannot delete system folders');
    }

    // Items in this folder will have folder_id set to NULL (ON DELETE SET NULL)
    await this.folderRepository.deleteOne(folderId);
    logger.info(`Deleted folder: ${folderId}`);
    return true;
  }

  public async ensureSystemFolders(
    projectId: number,
    userId: number,
  ): Promise<{ personal: Folder; public: Folder }> {
    const personal = await this.createFolder(projectId, userId, {
      name: 'Personal Folder',
      type: 'personal',
      visibility: 'private',
    });

    const publicFolder = await this.createFolder(projectId, userId, {
      name: 'Public Folder',
      type: 'public',
      visibility: 'shared',
    });

    return { personal, public: publicFolder };
  }

  public async getFolderAccess(folderId: number): Promise<FolderAccess[]> {
    return this.folderAccessRepository.findAllByFolderId(folderId);
  }

  public async setFolderAccess(
    folderId: number,
    entries: SetFolderAccessInput[],
  ): Promise<FolderAccess[]> {
    const folder = await this.getFolder(folderId);

    // Only custom folders have access control
    if (folder.type !== 'custom') {
      throw new Error('Access control is only available for custom folders');
    }

    return this.folderAccessRepository.setAccess(
      folderId,
      entries.map((e) => ({ userId: e.userId, role: e.role })),
    );
  }

  public async moveDashboardToFolder(
    dashboardId: number,
    folderId: number | null,
  ): Promise<boolean> {
    // Validate folder exists if provided
    if (folderId !== null) {
      await this.getFolder(folderId);
    }

    await this.dashboardRepository.updateOne(dashboardId, {
      folderId,
    });

    logger.info(
      `Moved dashboard ${dashboardId} to folder ${folderId ?? 'none'}`,
    );
    return true;
  }

  public async moveThreadToFolder(
    threadId: number,
    folderId: number | null,
  ): Promise<boolean> {
    if (folderId !== null) {
      await this.getFolder(folderId);
    }

    await this.threadRepository.updateOne(threadId, {
      folderId,
    });

    logger.info(`Moved thread ${threadId} to folder ${folderId ?? 'none'}`);
    return true;
  }
}
