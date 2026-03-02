import { useEffect, useRef, useMemo } from 'react';
import styled from 'styled-components';
import { Alert, Spin } from 'antd';
import { ApolloError } from '@apollo/client';
import { parseGraphQLError } from '@/utils/errorHandler';
import type { ColumnConfig } from './ColumnManager';

// Univer imports — these are client-only (canvas-based rendering)
import { UniverSheetsCorePreset } from '@univerjs/preset-sheets-core';
import UniverPresetSheetsCoreEnUS from '@univerjs/preset-sheets-core/locales/en-US';
import { createUniver, LocaleType, mergeLocales } from '@univerjs/presets';
import type { FUniver } from '@univerjs/presets';
import '@univerjs/preset-sheets-core/lib/index.css';

// ── Styles ──────────────────────────────────────────────

const Container = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  position: relative;
`;

const UniverContainer = styled.div`
  flex: 1;
  min-height: 0;
  position: relative;

  /* Hide Univer's own toolbar, formula bar, sheet tabs — we only want the grid */
  .univer-toolbar,
  .univer-formula-bar,
  .univer-sheet-bar,
  .univer-header {
    display: none !important;
  }
  .univer-context-menu {
    z-index: 1050 !important;
  }
`;

const StatusBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 12px;
  background: var(--gray-2, #fafafa);
  border-top: 1px solid var(--gray-4, #d9d9d9);
  font-size: 11px;
  color: var(--gray-7, #8c8c8c);
  flex-shrink: 0;
  min-height: 26px;
  user-select: none;
`;

const StatusSection = styled.span`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const StatusDot = styled.span<{ $color: string }>`
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${(props) => props.$color};
  margin-right: 4px;
`;

const SpinOverlay = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 15;
  background: rgba(255, 255, 255, 0.7);
`;

const ErrorContainer = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
`;

// ── Types ───────────────────────────────────────────────

interface ColumnMeta {
  name: string;
  type: string;
}

export interface UniverSheetProps {
  columns?: ColumnMeta[];
  data?: any[][];
  loading?: boolean;
  error?: ApolloError | null;
  /** Overlay element to render on top of the empty grid */
  overlay?: React.ReactNode;
  /** Column configs controlling visibility and order */
  columnConfigs?: ColumnConfig[];
}

// ── Type classification helpers ─────────────────────────

/** Type emoji/icon prefixes for header cells */
const TYPE_ICONS: Record<string, string> = {
  number: '#',
  integer: '#',
  int: '#',
  bigint: '#',
  smallint: '#',
  float: '#',
  double: '#',
  decimal: '#',
  numeric: '#',
  real: '#',
  boolean: '◉',
  bool: '◉',
  date: '📅',
  timestamp: '📅',
  timestamptz: '📅',
  datetime: '📅',
  time: '🕐',
  json: '{}',
  jsonb: '{}',
  array: '[]',
  text: 'Aa',
  varchar: 'Aa',
  char: 'Aa',
  string: 'Aa',
};

function getTypeIcon(type: string): string {
  const normalized = type.toLowerCase().replace(/[^a-z]/g, '');
  return TYPE_ICONS[normalized] || 'Aa';
}

function isNumericType(type: string): boolean {
  const t = type.toLowerCase();
  return /int|float|double|decimal|numeric|number|real|bigint|smallint/.test(t);
}

function isBooleanType(type: string): boolean {
  const t = type.toLowerCase();
  return t === 'boolean' || t === 'bool';
}

function isDateType(type: string): boolean {
  const t = type.toLowerCase();
  return /date|timestamp|datetime/.test(t);
}

// ── Helpers ─────────────────────────────────────────────

/**
 * Convert PreviewDataResponse (columns + rows) into Univer's IWorkbookData
 * cell format: { [rowIndex]: { [colIndex]: { v: value } } }
 *
 * Type-aware formatting:
 *  - Header: bold, gray bg, type icon prefix
 *  - Numbers: right-aligned, blue-tinted text
 *  - Booleans: centered, ✓ (green) / ✗ (red)
 *  - Dates: formatted if parseable
 *  - Nulls: italic gray "NULL"
 *  - Objects: JSON stringified, monospace-ish
 */
function buildCellData(
  columns: ColumnMeta[],
  data: any[][],
): Record<number, Record<number, any>> {
  const cellData: Record<number, Record<number, any>> = {};

  // Row 0: Header row with type icon prefix + bold styling
  cellData[0] = {};
  columns.forEach((col, colIdx) => {
    const icon = getTypeIcon(col.type);
    cellData[0][colIdx] = {
      v: `${icon}  ${col.name}`,
      s: {
        bl: 1,
        fs: 11,
        bg: { rgb: '#F0F0F0' },
        cl: { rgb: '#434343' },
      },
    };
  });

  // Data rows (offset by 1 for header)
  data.forEach((row, rowIdx) => {
    cellData[rowIdx + 1] = {};
    row.forEach((value, colIdx) => {
      if (colIdx >= columns.length) return;

      const colType = columns[colIdx].type;

      // NULL / undefined — italic gray
      if (value === null || value === undefined) {
        cellData[rowIdx + 1][colIdx] = {
          v: 'NULL',
          s: {
            it: 1,
            cl: { rgb: '#BFBFBF' },
            fs: 11,
          },
        };
        return;
      }

      // Boolean
      if (isBooleanType(colType)) {
        const boolVal = value === true || value === 'true' || value === 1;
        cellData[rowIdx + 1][colIdx] = {
          v: boolVal ? '✓' : '✗',
          s: {
            ht: 2, // center align
            cl: { rgb: boolVal ? '#389E0D' : '#CF1322' },
            fs: 12,
            bl: 1,
          },
        };
        return;
      }

      // Numeric
      if (isNumericType(colType)) {
        cellData[rowIdx + 1][colIdx] = {
          v: value,
          s: {
            ht: 3, // right align
            cl: { rgb: '#1D39C4' },
            fs: 11,
          },
        };
        return;
      }

      // Date/timestamp — try to format nicely
      if (isDateType(colType) && value) {
        const dateStr = String(value);
        // Try to parse and reformat
        const d = new Date(dateStr);
        const formatted = isNaN(d.getTime()) ? dateStr : formatDate(d, colType);
        cellData[rowIdx + 1][colIdx] = {
          v: formatted,
          s: {
            cl: { rgb: '#531DAB' },
            fs: 11,
          },
        };
        return;
      }

      // Object / JSON
      if (typeof value === 'object') {
        cellData[rowIdx + 1][colIdx] = {
          v: JSON.stringify(value),
          s: {
            cl: { rgb: '#8C8C8C' },
            fs: 10,
          },
        };
        return;
      }

      // Default — plain text
      cellData[rowIdx + 1][colIdx] = {
        v: value,
        s: { fs: 11 },
      };
    });
  });

  return cellData;
}

/** Format a Date object based on the SQL column type */
function formatDate(d: Date, colType: string): string {
  const t = colType.toLowerCase();
  const pad = (n: number) => String(n).padStart(2, '0');

  const datePart = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  if (t === 'date') return datePart;

  const timePart = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  return `${datePart} ${timePart}`;
}

function buildWorkbookData(columns: ColumnMeta[], data: any[][]) {
  return {
    id: 'spreadsheet-preview',
    name: 'Preview',
    appVersion: '0.16.0',
    locale: LocaleType.EN_US,
    sheetOrder: ['sheet1'],
    styles: {},
    sheets: {
      sheet1: {
        id: 'sheet1',
        name: 'Results',
        rowCount: Math.max(data.length + 2, 50),
        columnCount: Math.max(columns.length, 26),
        cellData: buildCellData(columns, data),
        columnData: columns.reduce(
          (acc, col, idx) => {
            acc[idx] = {
              w: Math.max(col.name.length * 9 + 24, 120),
            };
            return acc;
          },
          {} as Record<number, { w: number }>,
        ),
        freeze: {
          startRow: 1,
          startColumn: 0,
          ySplit: 1,
          xSplit: 0,
        },
      },
    },
  };
}

// ── Component ───────────────────────────────────────────

export default function UniverSheet(props: UniverSheetProps) {
  const { columns = [], data = [], loading = false, error, overlay, columnConfigs } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const univerAPIRef = useRef<FUniver | null>(null);

  // Apply column configs: filter visible + reorder
  const { filteredColumns, filteredData } = useMemo(() => {
    if (!columnConfigs || columnConfigs.length === 0 || columns.length === 0) {
      return { filteredColumns: columns, filteredData: data };
    }

    // Build a map from column name to original index
    const colIndexMap = new Map<string, number>();
    columns.forEach((col, idx) => colIndexMap.set(col.name, idx));

    // Filter to visible columns in config order
    const visibleConfigs = columnConfigs.filter((c) => c.visible && colIndexMap.has(c.name));

    if (visibleConfigs.length === 0) {
      // All hidden — show empty grid
      return { filteredColumns: [], filteredData: [] };
    }

    const indices = visibleConfigs.map((c) => colIndexMap.get(c.name)!);
    const fc = indices.map((i) => columns[i]);
    const fd = data.map((row) => indices.map((i) => row[i]));

    return { filteredColumns: fc, filteredData: fd };
  }, [columns, data, columnConfigs]);

  const hasData = filteredColumns.length > 0;

  // Build workbook data — either real data or empty sheet
  const workbookData = useMemo(() => {
    if (hasData) {
      return buildWorkbookData(filteredColumns, filteredData);
    }
    // Empty workbook — just an empty grid (Univer shows Column A, B, C… headers)
    return {
      id: 'spreadsheet-empty',
      name: 'New Spreadsheet',
      appVersion: '0.16.0',
      locale: LocaleType.EN_US,
      sheetOrder: ['sheet1'],
      styles: {},
      sheets: {
        sheet1: {
          id: 'sheet1',
          name: 'Sheet1',
          rowCount: 100,
          columnCount: 26,
          cellData: {},
        },
      },
    };
  }, [filteredColumns, filteredData, hasData]);

  // Initialize and update Univer instance
  useEffect(() => {
    if (!containerRef.current) return;

    // Clean up previous instance
    if (univerAPIRef.current) {
      try {
        univerAPIRef.current.dispose();
      } catch {
        // ignore disposal errors
      }
      univerAPIRef.current = null;
    }

    const { univerAPI } = createUniver({
      locale: LocaleType.EN_US,
      locales: {
        [LocaleType.EN_US]: mergeLocales(UniverPresetSheetsCoreEnUS),
      },
      presets: [
        UniverSheetsCorePreset({
          container: containerRef.current,
        }),
      ],
    });

    univerAPIRef.current = univerAPI;
    univerAPI.createWorkbook(workbookData as any);

    return () => {
      try {
        univerAPI.dispose();
      } catch {
        // ignore disposal errors
      }
      univerAPIRef.current = null;
    };
  }, [workbookData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (univerAPIRef.current) {
        try {
          univerAPIRef.current.dispose();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  // Error state — show above the grid
  if (error) {
    const { message: msg, shortMessage } = parseGraphQLError(error);
    return (
      <Container>
        <ErrorContainer>
          <Alert
            message={shortMessage}
            description={msg}
            type="error"
            showIcon
            style={{ maxWidth: 600 }}
          />
        </ErrorContainer>
      </Container>
    );
  }

  return (
    <Container>
      <UniverContainer ref={containerRef} />

      {/* Loading spinner overlay */}
      {loading && (
        <SpinOverlay>
          <Spin tip="Running query..." />
        </SpinOverlay>
      )}

      {/* Data source selection overlay (when no data yet) */}
      {!hasData && !loading && overlay}

      {/* Status bar */}
      {hasData && (
        <StatusBar>
          <StatusSection>
            <span>
              <StatusDot $color="var(--green-5, #52c41a)" />
              {filteredData.length.toLocaleString()} row{filteredData.length !== 1 ? 's' : ''}
            </span>
            <span>
              <StatusDot $color="var(--geekblue-5, #597ef7)" />
              {filteredColumns.length} column{filteredColumns.length !== 1 ? 's' : ''}
            </span>
            {columnConfigs && columnConfigs.length > 0 && (
              <span>
                {columnConfigs.filter((c) => !c.visible).length > 0 && (
                  <>· {columnConfigs.filter((c) => !c.visible).length} hidden</>
                )}
              </span>
            )}
          </StatusSection>
          <StatusSection>
            <span style={{ color: 'var(--gray-6)' }}>
              {filteredColumns.map((c) => c.type).filter((v, i, a) => a.indexOf(v) === i).length} data type{filteredColumns.map((c) => c.type).filter((v, i, a) => a.indexOf(v) === i).length !== 1 ? 's' : ''}
            </span>
          </StatusSection>
        </StatusBar>
      )}
    </Container>
  );
}
