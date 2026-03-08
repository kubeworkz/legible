import { IContext } from '@server/types';
import { Spreadsheet } from '@server/repositories/spreadsheetRepository';
import { SpreadsheetHistory } from '@server/repositories/spreadsheetHistoryRepository';
import { getLogger } from '@server/utils';
import { DEFAULT_PREVIEW_LIMIT, PreviewDataResponse } from '@server/services';
import { requireProjectRead, requireProjectWrite } from '../utils/authGuard';

const logger = getLogger('SpreadsheetResolver');
logger.level = 'debug';

export class SpreadsheetResolver {
  constructor() {
    this.getSpreadsheets = this.getSpreadsheets.bind(this);
    this.getSpreadsheet = this.getSpreadsheet.bind(this);
    this.createSpreadsheet = this.createSpreadsheet.bind(this);
    this.updateSpreadsheet = this.updateSpreadsheet.bind(this);
    this.deleteSpreadsheet = this.deleteSpreadsheet.bind(this);
    this.previewSpreadsheetData = this.previewSpreadsheetData.bind(this);
    this.getSpreadsheetHistory = this.getSpreadsheetHistory.bind(this);
    this.saveSpreadsheetWithHistory = this.saveSpreadsheetWithHistory.bind(this);
    this.restoreSpreadsheetVersion = this.restoreSpreadsheetVersion.bind(this);
    this.duplicateSpreadsheet = this.duplicateSpreadsheet.bind(this);
  }

  public async getSpreadsheets(
    _root: any,
    args: { folderId?: number },
    ctx: IContext,
  ): Promise<Spreadsheet[]> {
    await requireProjectRead(ctx);
    const all = await ctx.spreadsheetService.listSpreadsheets(ctx.projectId);
    if (args.folderId !== undefined && args.folderId !== null) {
      return all.filter((s) => s.folderId === args.folderId);
    }
    return all;
  }

  public async getSpreadsheet(
    _root: any,
    args: { where: { id: number } },
    ctx: IContext,
  ): Promise<Spreadsheet> {
    await requireProjectRead(ctx);
    return await ctx.spreadsheetService.getSpreadsheet(args.where.id);
  }

  public async createSpreadsheet(
    _root: any,
    args: {
      data: { name: string; folderId?: number; sourceSql?: string; creatorName?: string };
    },
    ctx: IContext,
  ): Promise<Spreadsheet> {
    await requireProjectWrite(ctx);
    const project = await ctx.projectService.getCurrentProject(ctx.projectId);
    // Auto-set creator name from the logged-in user if not explicitly provided
    const creatorName =
      args.data.creatorName ||
      ctx.currentUser?.displayName ||
      ctx.currentUser?.email ||
      null;
    return await ctx.spreadsheetService.createSpreadsheet(project.id, {
      name: args.data.name,
      folderId: args.data.folderId,
      sourceSql: args.data.sourceSql,
      creatorName,
    });
  }

  public async updateSpreadsheet(
    _root: any,
    args: {
      where: { id: number };
      data: {
        name?: string;
        description?: string;
        sourceSql?: string;
        columnsMetadata?: string;
        creatorName?: string;
      };
    },
    ctx: IContext,
  ): Promise<Spreadsheet> {
    await requireProjectWrite(ctx);
    return await ctx.spreadsheetService.updateSpreadsheet(
      args.where.id,
      args.data,
    );
  }

  public async deleteSpreadsheet(
    _root: any,
    args: { where: { id: number } },
    ctx: IContext,
  ): Promise<boolean> {
    await requireProjectWrite(ctx);
    return await ctx.spreadsheetService.deleteSpreadsheet(args.where.id);
  }

  public async previewSpreadsheetData(
    _root: any,
    args: { data: { spreadsheetId: number; sql?: string; limit?: number } },
    ctx: IContext,
  ): Promise<any> {
    await requireProjectRead(ctx);
    const { spreadsheetId, sql: overrideSql, limit } = args.data;
    const spreadsheet =
      await ctx.spreadsheetService.getSpreadsheet(spreadsheetId);
    const sqlToRun = overrideSql || spreadsheet.sourceSql;
    if (!sqlToRun) {
      throw new Error('No SQL to execute. Please provide a SQL query.');
    }

    const project = await ctx.projectService.getCurrentProject(ctx.projectId);
    const deployment = await ctx.deployService.getLastDeployment(project.id);
    const mdl = deployment
      ? deployment.manifest
      : (await ctx.mdlService.makeCurrentModelMDL(project.id)).manifest;
    const result = (await ctx.queryService.preview(sqlToRun, {
      project,
      manifest: mdl,
      limit: limit ?? DEFAULT_PREVIEW_LIMIT,
    })) as PreviewDataResponse;

    // Update the stored SQL if we used an override
    if (overrideSql && overrideSql !== spreadsheet.sourceSql) {
      await ctx.spreadsheetService.updateSpreadsheet(spreadsheetId, {
        sourceSql: overrideSql,
      });
    }

    return result;
  }

  // ── History / Version Tracking ────────────────────────

  public async getSpreadsheetHistory(
    _root: any,
    args: { where: { spreadsheetId: number } },
    ctx: IContext,
  ): Promise<SpreadsheetHistory[]> {
    await requireProjectRead(ctx);
    return await ctx.spreadsheetService.listHistory(args.where.spreadsheetId);
  }

  public async saveSpreadsheetWithHistory(
    _root: any,
    args: {
      data: {
        spreadsheetId: number;
        sourceSql?: string;
        columnsMetadata?: string;
        changeSummary?: string;
      };
    },
    ctx: IContext,
  ): Promise<Spreadsheet> {
    await requireProjectWrite(ctx);
    const { spreadsheetId, changeSummary, ...updateData } = args.data;
    return await ctx.spreadsheetService.saveWithHistory(
      spreadsheetId,
      updateData,
      changeSummary,
    );
  }

  public async restoreSpreadsheetVersion(
    _root: any,
    args: { data: { spreadsheetId: number; historyId: number } },
    ctx: IContext,
  ): Promise<Spreadsheet> {
    await requireProjectWrite(ctx);
    return await ctx.spreadsheetService.restoreVersion(
      args.data.spreadsheetId,
      args.data.historyId,
    );
  }

  public async duplicateSpreadsheet(
    _root: any,
    args: { data: { spreadsheetId: number; name?: string } },
    ctx: IContext,
  ): Promise<Spreadsheet> {
    await requireProjectWrite(ctx);
    return await ctx.spreadsheetService.duplicateSpreadsheet(
      args.data.spreadsheetId,
      args.data.name,
    );
  }
}
