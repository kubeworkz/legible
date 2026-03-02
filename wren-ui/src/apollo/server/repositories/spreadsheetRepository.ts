import {
  BaseRepository,
  IBasicRepository,
  PaginationRequest,
  PaginationResponse,
} from './baseRepository';

export interface Spreadsheet {
  id: number;
  projectId: number;
  name: string;
  description: string | null;
  folderId: number | null;
  sortOrder: number;
  sourceSql: string | null;
  columnsMetadata: string | null; // JSON string
  createdAt: Date;
  updatedAt: Date;
}

export interface ISpreadsheetRepository extends IBasicRepository<Spreadsheet> {
  paginatedFindAllBy(
    filter: Partial<Spreadsheet>,
    pagination: PaginationRequest,
  ): Promise<PaginationResponse<Spreadsheet>>;
}

export class SpreadsheetRepository
  extends BaseRepository<Spreadsheet>
  implements ISpreadsheetRepository
{
  constructor(knexPg) {
    super({ knexPg, tableName: 'spreadsheet' });
  }

  public async paginatedFindAllBy(
    filter: Partial<Spreadsheet>,
    pagination: PaginationRequest,
  ): Promise<PaginationResponse<Spreadsheet>> {
    return await super.paginatedFindAllBy(filter, pagination);
  }
}
