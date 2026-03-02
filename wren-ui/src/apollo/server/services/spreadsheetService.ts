import {
  ISpreadsheetRepository,
  Spreadsheet,
} from '@server/repositories/spreadsheetRepository';
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
}

export class SpreadsheetService implements ISpreadsheetService {
  private projectService: IProjectService;
  private spreadsheetRepository: ISpreadsheetRepository;

  constructor({
    projectService,
    spreadsheetRepository,
  }: {
    projectService: IProjectService;
    spreadsheetRepository: ISpreadsheetRepository;
  }) {
    this.projectService = projectService;
    this.spreadsheetRepository = spreadsheetRepository;
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
    await this.spreadsheetRepository.deleteOne(spreadsheetId);
    return true;
  }
}
