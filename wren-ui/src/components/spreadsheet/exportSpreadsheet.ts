/**
 * Spreadsheet export utilities — CSV and Excel (.xlsx).
 *
 * All export functions operate on the *visible* columns/data
 * (after ColumnConfig filtering has been applied by the caller).
 */

import type { ColumnConfig } from './ColumnManager';

// ── Types ───────────────────────────────────────────────

interface ColumnMeta {
  name: string;
  type: string;
}

interface ExportPayload {
  /** Column metadata (already filtered/ordered by ColumnConfig) */
  columns: ColumnMeta[];
  /** Row data matching the column order */
  data: any[][];
  /** File name (without extension) */
  fileName: string;
}

// ── Helpers ─────────────────────────────────────────────

/** Apply column configs to raw columns + data, returning only visible in order */
export function applyColumnConfigs(
  columns: ColumnMeta[],
  data: any[][],
  columnConfigs?: ColumnConfig[],
): { columns: ColumnMeta[]; data: any[][] } {
  if (!columnConfigs || columnConfigs.length === 0) {
    return { columns, data };
  }

  const colIndexMap = new Map<string, number>();
  columns.forEach((col, idx) => colIndexMap.set(col.name, idx));

  const visibleConfigs = columnConfigs.filter(
    (c) => c.visible && colIndexMap.has(c.name),
  );

  if (visibleConfigs.length === 0) {
    return { columns: [], data: [] };
  }

  const indices = visibleConfigs.map((c) => colIndexMap.get(c.name)!);
  return {
    columns: indices.map((i) => columns[i]),
    data: data.map((row) => indices.map((i) => row[i])),
  };
}

/** Escape a value for CSV (RFC 4180) */
function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str =
    typeof value === 'object' ? JSON.stringify(value) : String(value);
  // Wrap in quotes if the value contains comma, newline, or double-quote
  if (str.includes(',') || str.includes('\n') || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/** Trigger a browser file download from a Blob */
function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  // Cleanup
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

// ── CSV Export ──────────────────────────────────────────

export function exportToCSV({ columns, data, fileName }: ExportPayload): void {
  const header = columns.map((c) => csvEscape(c.name)).join(',');
  const rows = data.map((row) => row.map(csvEscape).join(','));
  const csv = [header, ...rows].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `${fileName}.csv`);
}

// ── Excel Export ────────────────────────────────────────

export async function exportToExcel({
  columns,
  data,
  fileName,
}: ExportPayload): Promise<void> {
  // Dynamic import to avoid bundling xlsx when not needed
  const XLSX = await import('xlsx');

  // Build an array-of-arrays: header row + data rows
  const aoa = [
    columns.map((c) => c.name),
    ...data.map((row) =>
      row.map((v) => {
        if (v === null || v === undefined) return '';
        if (typeof v === 'object') return JSON.stringify(v);
        return v;
      }),
    ),
  ];

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Auto-size columns based on header length (rough approximation)
  ws['!cols'] = columns.map((c) => ({
    wch: Math.max(c.name.length + 2, 12),
  }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  XLSX.writeFile(wb, `${fileName}.xlsx`);
}
