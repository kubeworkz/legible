import {
  ISpreadsheetRepository,
  Spreadsheet,
} from '@server/repositories/spreadsheetRepository';
import {
  ISpreadsheetHistoryRepository,
  SpreadsheetHistory,
} from '@server/repositories/spreadsheetHistoryRepository';
import { IProjectService } from './projectService';
import { getLogger } from '@server/utils';

const logger = getLogger('SpreadsheetService');
logger.level = 'debug';

export interface CreateSpreadsheetInput {
  name: string;
  folderId?: number | null;
  sourceSql?: string | null;
}

export interface UpdateSpreadsheetInput {
  name?: string;
  description?: string | null;
  sourceSql?: string | null;
  columnsMetadata?: string | null;
}

export interface ISpreadsheetService {
  listSpreadsheets(projectId?: number): Promise<Spreadsheet[]>;
  getSpreadsheet(spreadsheetId: number): Promise<Spreadsheet>;
  createSpreadsheet(
    projectId: number,
    input: CreateSpreadsheetInput,
  ): Promise<Spreadsheet>;
  updateSpreadsheet(
    spreadsheetId: number,
    input: UpdateSpreadsheetInput,
  ): Promise<Spreadsheet>;
  deleteSpreadsheet(spreadsheetId: number): Promise<boolean>;
  // History
  listHistory(spreadsheetId: number): Promise<SpreadsheetHistory[]>;
  getHistoryEntry(historyId: number): Promise<SpreadsheetHistory>;
  restoreVersion(spreadsheetId: number, historyId: number): Promise<Spreadsheet>;
  saveWithHistory(
    spreadsheetId: number,
    input: UpdateSpreadsheetInput,
    changeSummary?: string,
  ): Promise<Spreadsheet>;
  duplicateSpreadsheet(
    spreadsheetId: number,
    newName?: string,
  ): Promise<Spreadsheet>;
}

export class SpreadsheetService implements ISpreadsheetService {
  private projectService: IProjectService;
  private spreadsheetRepository: ISpreadsheetRepository;
  private historyRepository: ISpreadsheetHistoryRepository;

  constructor({
    projectService,
    spreadsheetRepository,
    spreadsheetHistoryRepository,
  }: {
    projectService: IProjectService;
    spreadsheetRepository: ISpreadsheetRepository;
    spreadsheetHistoryRepository: ISpreadsheetHistoryRepository;
  }) {
    this.projectService = projectService;
    this.spreadsheetRepository = spreadsheetRepository;
    this.historyRepository = spreadsheetHistoryRepository;
  }

  public async listSpreadsheets(projectId?: number): Promise<Spreadsheet[]> {
    const project = await this.projectService.getCurrentProject(projectId);
    const spreadsheets = await this.spreadsheetRepository.findAllBy({
      projectId: project.id,
    });
    return spreadsheets.sort((a, b) => a.sortOrder - b.sortOrder);
  }

  public async getSpreadsheet(spreadsheetId: number): Promise<Spreadsheet> {
    const spreadsheet = await this.spreadsheetRepository.findOneBy({
      id: spreadsheetId,
    });
    if (!spreadsheet) {
      throw new Error(`Spreadsheet with id ${spreadsheetId} not found`);
    }
    return spreadsheet;
  }

  public async createSpreadsheet(
    projectId: number,
    input: CreateSpreadsheetInput,
  ): Promise<Spreadsheet> {
    const existing = await this.spreadsheetRepository.findAllBy({ projectId });
    const maxSortOrder =
      existing.length > 0
        ? Math.max(...existing.map((s) => s.sortOrder))
        : -1;
    const createData: Partial<Spreadsheet> = {
      name: input.name,
      projectId,
      sortOrder: maxSortOrder + 1,
    };
    if (input.folderId !== undefined) {
      createData.folderId = input.folderId;
    }
    if (input.sourceSql !== undefined) {
      createData.sourceSql = input.sourceSql;
    }
    return await this.spreadsheetRepository.createOne(createData);
  }

  public async updateSpreadsheet(
    spreadsheetId: number,
    input: UpdateSpreadsheetInput,
  ): Promise<Spreadsheet> {
    const existing = await this.spreadsheetRepository.findOneBy({
      id: spreadsheetId,
    });
    if (!existing) {
      throw new Error(`Spreadsheet with id ${spreadsheetId} not found`);
    }
    return await this.spreadsheetRepository.updateOne(spreadsheetId, input);
  }

  public async deleteSpreadsheet(spreadsheetId: number): Promise<boolean> {
    const existing = await this.spreadsheetRepository.findOneBy({
      id: spreadsheetId,
    });
    if (!existing) {
      throw new Error(`Spreadsheet with id ${spreadsheetId} not found`);
    }
    // History cascade-deletes via FK
    await this.spreadsheetRepository.deleteOne(spreadsheetId);
    return true;
  }

  // ── History methods ────────────────────────────────────

  public async listHistory(
    spreadsheetId: number,
  ): Promise<SpreadsheetHistory[]> {
    return this.historyRepository.listBySpreadsheetId(spreadsheetId);
  }

  public async getHistoryEntry(
    historyId: number,
  ): Promise<SpreadsheetHistory> {
    const entry = await this.historyRepository.findById(historyId);
    if (!entry) {
      throw new Error(`History entry with id ${historyId} not found`);
    }
    return entry;
  }

  public async saveWithHistory(
    spreadsheetId: number,
    input: UpdateSpreadsheetInput,
    changeSummary?: string,
  ): Promise<Spreadsheet> {
    // Get current state before update
    const current = await this.getSpreadsheet(spreadsheetId);

    // Create history snapshot of the NEW state (what we're saving)
    const version = await this.historyRepository.getNextVersion(spreadsheetId);

    const newSql = input.sourceSql !== undefined ? input.sourceSql : current.sourceSql;
    const newMeta = input.columnsMetadata !== undefined ? input.columnsMetadata : current.columnsMetadata;

    await this.historyRepository.createEntry({
      spreadsheetId,
      version,
      changeType: 'saved',
      sourceSql: newSql,
      columnsMetadata: newMeta,
      changeSummary: changeSummary || `Version ${version}`,
    });

    // Now update the spreadsheet
    return await this.spreadsheetRepository.updateOne(spreadsheetId, input);
  }

  public async restoreVersion(
    spreadsheetId: number,
    historyId: number,
  ): Promise<Spreadsheet> {
    const entry = await this.getHistoryEntry(historyId);
    if (entry.spreadsheetId !== spreadsheetId) {
      throw new Error('History entry does not belong to this spreadsheet');
    }

    // Create a new history entry for the restore action
    const version = await this.historyRepository.getNextVersion(spreadsheetId);
    await this.historyRepository.createEntry({
      spreadsheetId,
      version,
      changeType: 'restored',
      sourceSql: entry.sourceSql,
      columnsMetadata: entry.columnsMetadata,
      changeSummary: `Restored from version ${entry.version}`,
    });

    // Update the spreadsheet to the restored state
    return await this.spreadsheetRepository.updateOne(spreadsheetId, {
      sourceSql: entry.sourceSql,
      columnsMetadata: entry.columnsMetadata,
    });
  }

  public async duplicateSpreadsheet(
    spreadsheetId: number,
    newName?: string,
  ): Promise<Spreadsheet> {
    const original = await this.getSpreadsheet(spreadsheetId);
    const existing = await this.spreadsheetRepository.findAllBy({
      projectId: original.projectId,
    });
    const maxSortOrder =
      existing.length > 0
        ? Math.max(...existing.map((s) => s.sortOrder))
        : -1;

    const duplicated = await this.spreadsheetRepository.createOne({
      name: newName || `${original.name} (Copy)`,
      projectId: original.projectId,
      sortOrder: maxSortOrder + 1,
      folderId: original.folderId,
      sourceSql: original.sourceSql,
      columnsMetadata: original.columnsMetadata,
    });

    // Create initial history entry for the duplicate
    await this.historyRepository.createEntry({
      spreadsheetId: duplicated.id,
      version: 1,
      changeType: 'created',
      sourceSql: duplicated.sourceSql,
      columnsMetadata: duplicated.columnsMetadata,
      changeSummary: `Duplicated from "${original.name}"`,
    });

    return duplicated;
  }
}
