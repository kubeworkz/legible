import { Knex } from 'knex';

export interface SpreadsheetHistory {
  id: number;
  spreadsheetId: number;
  version: number;
  changeType: string; // 'created' | 'saved' | 'restored'
  sourceSql: string | null;
  columnsMetadata: string | null;
  changeSummary: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISpreadsheetHistoryRepository {
  createEntry(data: Partial<SpreadsheetHistory>): Promise<SpreadsheetHistory>;
  listBySpreadsheetId(spreadsheetId: number): Promise<SpreadsheetHistory[]>;
  findById(id: number): Promise<SpreadsheetHistory | null>;
  getNextVersion(spreadsheetId: number): Promise<number>;
  deleteBySpreadsheetId(spreadsheetId: number): Promise<void>;
}

export class SpreadsheetHistoryRepository
  implements ISpreadsheetHistoryRepository
{
  private knex: Knex;
  private tableName = 'spreadsheet_history';

  constructor(knexPg: Knex) {
    this.knex = knexPg;
  }

  public async createEntry(
    data: Partial<SpreadsheetHistory>,
  ): Promise<SpreadsheetHistory> {
    const [row] = await this.knex(this.tableName)
      .insert({
        spreadsheet_id: data.spreadsheetId,
        version: data.version,
        change_type: data.changeType || 'saved',
        source_sql: data.sourceSql,
        columns_metadata: data.columnsMetadata,
        change_summary: data.changeSummary,
      })
      .returning('*');

    return this.toEntity(row);
  }

  public async listBySpreadsheetId(
    spreadsheetId: number,
  ): Promise<SpreadsheetHistory[]> {
    const rows = await this.knex(this.tableName)
      .where({ spreadsheet_id: spreadsheetId })
      .orderBy('version', 'desc');

    return rows.map((r) => this.toEntity(r));
  }

  public async findById(id: number): Promise<SpreadsheetHistory | null> {
    const row = await this.knex(this.tableName).where({ id }).first();
    return row ? this.toEntity(row) : null;
  }

  public async getNextVersion(spreadsheetId: number): Promise<number> {
    const result = await this.knex(this.tableName)
      .where({ spreadsheet_id: spreadsheetId })
      .max('version as maxVersion')
      .first();
    return (result?.maxVersion ?? 0) + 1;
  }

  public async deleteBySpreadsheetId(spreadsheetId: number): Promise<void> {
    await this.knex(this.tableName)
      .where({ spreadsheet_id: spreadsheetId })
      .delete();
  }

  private toEntity(row: any): SpreadsheetHistory {
    return {
      id: row.id,
      spreadsheetId: row.spreadsheet_id ?? row.spreadsheetId,
      version: row.version,
      changeType: row.change_type ?? row.changeType,
      sourceSql: row.source_sql ?? row.sourceSql,
      columnsMetadata: row.columns_metadata ?? row.columnsMetadata,
      changeSummary: row.change_summary ?? row.changeSummary,
      createdAt: row.created_at ?? row.createdAt,
      updatedAt: row.updated_at ?? row.updatedAt,
    };
  }
}
