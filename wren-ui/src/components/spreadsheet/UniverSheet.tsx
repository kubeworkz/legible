import { useEffect, useRef, useMemo, useCallback } from 'react';
import styled from 'styled-components';
import { Alert, Spin } from 'antd';
import { ApolloError } from '@apollo/client';
import { parseGraphQLError } from '@/utils/errorHandler';
import type { ColumnConfig, SortState } from './ColumnManager';
import type { SearchMatch } from './SpreadsheetSearch';

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
  /** Current sort state */
  sort?: SortState | null;
  /** Search term for highlighting */
  searchTerm?: string;
  /** Search matches for highlighting */
  searchMatches?: SearchMatch[];
  /** Active search match index */
  activeMatchIndex?: number;
  /** Search bar overlay element */
  searchOverlay?: React.ReactNode;
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
  sort?: SortState | null,
  searchMatches?: SearchMatch[],
  activeMatchIndex?: number,
): Record<number, Record<number, any>> {
  const cellData: Record<number, Record<number, any>> = {};

  // Build a set of highlighted cells for fast lookup
  const matchSet = new Set<string>();
  let activeKey = '';
  if (searchMatches && searchMatches.length > 0) {
    searchMatches.forEach((m, idx) => {
      // rowIndex -1 = header row (grid row 0), data rows offset by 1
      const gridRow = m.rowIndex === -1 ? 0 : m.rowIndex + 1;
      const key = `${gridRow}:${m.colIndex}`;
      matchSet.add(key);
      if (idx === activeMatchIndex) activeKey = key;
    });
  }

  // Row 0: Header row with type icon prefix + bold styling + sort indicator
  cellData[0] = {};
  columns.forEach((col, colIdx) => {
    const icon = getTypeIcon(col.type);
    const sortArrow =
      sort?.columnName === col.name
        ? sort.direction === 'asc'
          ? ' ▲'
          : ' ▼'
        : '';
    const key = `0:${colIdx}`;
    const isMatch = matchSet.has(key);
    const isActive = key === activeKey;
    cellData[0][colIdx] = {
      v: `${icon}  ${col.name}${sortArrow}`,
      s: {
        bl: 1,
        fs: 11,
        bg: { rgb: isActive ? '#FFF566' : isMatch ? '#FFFBE6' : sort?.columnName === col.name ? '#E6F7FF' : '#F0F0F0' },
        cl: { rgb: sort?.columnName === col.name ? '#1D39C4' : '#434343' },
      },
    };
  });

  // Data rows (offset by 1 for header)
  data.forEach((row, rowIdx) => {
    cellData[rowIdx + 1] = {};
    row.forEach((value, colIdx) => {
      if (colIdx >= columns.length) return;

      const colType = columns[colIdx].type;
      const cellKey = `${rowIdx + 1}:${colIdx}`;
      const isMatch = matchSet.has(cellKey);
      const isActive = cellKey === activeKey;
      const highlightBg = isActive ? '#FFF566' : isMatch ? '#FFFBE6' : undefined;

      // NULL / undefined — italic gray
      if (value === null || value === undefined) {
        cellData[rowIdx + 1][colIdx] = {
          v: 'NULL',
          s: {
            it: 1,
            cl: { rgb: '#BFBFBF' },
            fs: 11,
            ...(highlightBg && { bg: { rgb: highlightBg } }),
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
            ...(highlightBg && { bg: { rgb: highlightBg } }),
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
            ...(highlightBg && { bg: { rgb: highlightBg } }),
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
            ...(highlightBg && { bg: { rgb: highlightBg } }),
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
            ...(highlightBg && { bg: { rgb: highlightBg } }),
          },
        };
        return;
      }

      // Default — plain text
      cellData[rowIdx + 1][colIdx] = {
        v: value,
        s: {
          fs: 11,
          ...(highlightBg && { bg: { rgb: highlightBg } }),
        },
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

function buildWorkbookData(
  columns: ColumnMeta[],
  data: any[][],
  sort?: SortState | null,
  searchMatchesList?: SearchMatch[],
  activeMatchIdx?: number,
) {
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
        cellData: buildCellData(columns, data, sort, searchMatchesList, activeMatchIdx),
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
  const {
    columns = [], data = [], loading = false, error, overlay,
    columnConfigs, sort, searchTerm, searchMatches, activeMatchIndex,
    searchOverlay,
  } = props;
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

  // Apply sort to filtered data
  const sortedData = useMemo(() => {
    if (!sort || !sort.columnName || filteredColumns.length === 0) {
      return filteredData;
    }

    const sortColIdx = filteredColumns.findIndex((c) => c.name === sort.columnName);
    if (sortColIdx === -1) return filteredData;

    const colType = filteredColumns[sortColIdx].type;
    const isNum = isNumericType(colType);
    const multiplier = sort.direction === 'asc' ? 1 : -1;

    return [...filteredData].sort((a, b) => {
      const va = a[sortColIdx];
      const vb = b[sortColIdx];

      // Nulls always last
      if (va === null || va === undefined) return 1;
      if (vb === null || vb === undefined) return -1;

      if (isNum) {
        return (Number(va) - Number(vb)) * multiplier;
      }
      return String(va).localeCompare(String(vb)) * multiplier;
    });
  }, [filteredData, filteredColumns, sort]);

  const hasData = filteredColumns.length > 0;

  // Build workbook data — either real data or empty sheet
  const workbookData = useMemo(() => {
    if (hasData) {
      return buildWorkbookData(filteredColumns, sortedData, sort, searchMatches, activeMatchIndex);
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
  }, [filteredColumns, sortedData, hasData, sort, searchMatches, activeMatchIndex]);

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
      {/* Search overlay (floating bar) */}
      {searchOverlay}

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
            {sort && (
              <span style={{ color: 'var(--geekblue-6, #2f54eb)' }}>
                Sorted by {sort.columnName} {sort.direction === 'asc' ? '↑' : '↓'}
              </span>
            )}
          </StatusSection>
        </StatusBar>
      )}
    </Container>
  );
}
