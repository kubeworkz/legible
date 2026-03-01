import { IContext } from '@server/types';
import { Folder } from '@server/repositories/folderRepository';
import { FolderAccess } from '@server/repositories/folderAccessRepository';
import { getLogger } from '@server/utils';

const logger = getLogger('FolderResolver');
logger.level = 'debug';

export class FolderResolver {
  constructor() {
    this.listFolders = this.listFolders.bind(this);
    this.getFolder = this.getFolder.bind(this);
    this.createFolder = this.createFolder.bind(this);
    this.updateFolder = this.updateFolder.bind(this);
    this.deleteFolder = this.deleteFolder.bind(this);
    this.ensureSystemFolders = this.ensureSystemFolders.bind(this);
    this.getFolderAccess = this.getFolderAccess.bind(this);
    this.setFolderAccess = this.setFolderAccess.bind(this);
    this.moveDashboardToFolder = this.moveDashboardToFolder.bind(this);
    this.moveThreadToFolder = this.moveThreadToFolder.bind(this);
    this.reorderFolders = this.reorderFolders.bind(this);
  }

  public async listFolders(
    _root: any,
    _args: any,
    ctx: IContext,
  ): Promise<Folder[]> {
    const project = await ctx.projectService.getCurrentProject(ctx.projectId);
    const userId = ctx.currentUser?.id;
    if (!userId) {
      throw new Error('Authentication required');
    }

    // Ensure system folders exist before listing
    await ctx.folderService.ensureSystemFolders(project.id, userId);

    return ctx.folderService.listFolders(project.id, userId);
  }

  public async getFolder(
    _root: any,
    args: { where: { id: number } },
    ctx: IContext,
  ): Promise<Folder> {
    return ctx.folderService.getFolder(args.where.id);
  }

  public async createFolder(
    _root: any,
    args: {
      data: {
        name: string;
        type?: string;
        visibility?: string;
      };
    },
    ctx: IContext,
  ): Promise<Folder> {
    const project = await ctx.projectService.getCurrentProject(ctx.projectId);
    const userId = ctx.currentUser?.id;
    if (!userId) {
      throw new Error('Authentication required');
    }
    return ctx.folderService.createFolder(project.id, userId, {
      name: args.data.name,
      type: args.data.type as any,
      visibility: args.data.visibility as any,
    });
  }

  public async updateFolder(
    _root: any,
    args: {
      where: { id: number };
      data: { name?: string; visibility?: string; sortOrder?: number };
    },
    ctx: IContext,
  ): Promise<Folder> {
    return ctx.folderService.updateFolder(args.where.id, {
      name: args.data.name,
      visibility: args.data.visibility as any,
      sortOrder: args.data.sortOrder,
    });
  }

  public async deleteFolder(
    _root: any,
    args: { where: { id: number } },
    ctx: IContext,
  ): Promise<boolean> {
    return ctx.folderService.deleteFolder(args.where.id);
  }

  public async ensureSystemFolders(
    _root: any,
    _args: any,
    ctx: IContext,
  ): Promise<{ personal: Folder; public: Folder }> {
    const project = await ctx.projectService.getCurrentProject(ctx.projectId);
    const userId = ctx.currentUser?.id;
    if (!userId) {
      throw new Error('Authentication required');
    }
    return ctx.folderService.ensureSystemFolders(project.id, userId);
  }

  public async getFolderAccess(
    _root: any,
    args: { where: { folderId: number } },
    ctx: IContext,
  ): Promise<FolderAccess[]> {
    return ctx.folderService.getFolderAccess(args.where.folderId);
  }

  public async setFolderAccess(
    _root: any,
    args: {
      where: { folderId: number };
      data: { entries: Array<{ userId: number; role: string }> };
    },
    ctx: IContext,
  ): Promise<FolderAccess[]> {
    return ctx.folderService.setFolderAccess(
      args.where.folderId,
      args.data.entries.map((e) => ({
        userId: e.userId,
        role: e.role as any,
      })),
    );
  }

  public async moveDashboardToFolder(
    _root: any,
    args: { data: { dashboardId: number; folderId: number | null } },
    ctx: IContext,
  ): Promise<boolean> {
    return ctx.folderService.moveDashboardToFolder(
      args.data.dashboardId,
      args.data.folderId,
    );
  }

  public async moveThreadToFolder(
    _root: any,
    args: { data: { threadId: number; folderId: number | null } },
    ctx: IContext,
  ): Promise<boolean> {
    return ctx.folderService.moveThreadToFolder(
      args.data.threadId,
      args.data.folderId,
    );
  }

  public async reorderFolders(
    _root: any,
    args: {
      data: { orders: Array<{ id: number; sortOrder: number }> };
    },
    ctx: IContext,
  ): Promise<Folder[]> {
    return ctx.folderService.reorderFolders(args.data.orders);
  }

  public getFolderNestedResolver() {
    return {
      access: async (folder: Folder, _args: any, ctx: IContext) => {
        if (folder.type !== 'custom') return [];
        return ctx.folderService.getFolderAccess(folder.id);
      },
    };
  }
}
