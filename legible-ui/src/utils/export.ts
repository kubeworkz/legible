/**
 * Generic export utilities — CSV and Excel (.xlsx).
 *
 * Extracted from spreadsheet-specific helpers so any page
 * (API history, usage dashboard, billing, etc.) can reuse them.
 */

// ── Types ───────────────────────────────────────────────

export interface ExportColumn {
  /** Column header label */
  name: string;
  /** Optional type hint (not used for CSV, may inform Excel formatting) */
  type?: string;
}

export interface ExportPayload {
  /** Column metadata */
  columns: ExportColumn[];
  /** Row data — each inner array matches the column order */
  data: any[][];
  /** File name (without extension) */
  fileName: string;
  /** Optional sheet name for Excel (default: Sheet1) */
  sheetName?: string;
}

export interface MultiSheetExportPayload {
  /** File name (without extension) */
  fileName: string;
  /** One entry per sheet */
  sheets: {
    name: string;
    columns: ExportColumn[];
    data: any[][];
  }[];
}

// ── Helpers ─────────────────────────────────────────────

/** Escape a value for CSV (RFC 4180) */
export function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str =
    typeof value === 'object' ? JSON.stringify(value) : String(value);
  if (str.includes(',') || str.includes('\n') || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/** Trigger a browser file download from a Blob */
export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
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

// ── Excel Export (single sheet) ─────────────────────────

export async function exportToExcel({
  columns,
  data,
  fileName,
  sheetName = 'Sheet1',
}: ExportPayload): Promise<void> {
  const XLSX = await import('xlsx');

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
  ws['!cols'] = columns.map((c) => ({
    wch: Math.max(c.name.length + 2, 12),
  }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${fileName}.xlsx`);
}

// ── Excel Export (multi-sheet) ──────────────────────────

export async function exportToExcelMultiSheet({
  fileName,
  sheets,
}: MultiSheetExportPayload): Promise<void> {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();

  for (const sheet of sheets) {
    const aoa = [
      sheet.columns.map((c) => c.name),
      ...sheet.data.map((row) =>
        row.map((v) => {
          if (v === null || v === undefined) return '';
          if (typeof v === 'object') return JSON.stringify(v);
          return v;
        }),
      ),
    ];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = sheet.columns.map((c) => ({
      wch: Math.max(c.name.length + 2, 12),
    }));
    XLSX.utils.book_append_sheet(wb, ws, sheet.name);
  }

  XLSX.writeFile(wb, `${fileName}.xlsx`);
}

// ── Date Formatting Helper ──────────────────────────────

export function formatDateForExport(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  return new Date(dateStr).toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC');
}

export function formatMonthYear(year: number, month: number): string {
  const d = new Date(year, month - 1, 1);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
}
