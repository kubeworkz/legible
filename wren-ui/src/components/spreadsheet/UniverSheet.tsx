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

// ── Helpers ─────────────────────────────────────────────

/**
 * Convert PreviewDataResponse (columns + rows) into Univer's IWorkbookData
 * cell format: { [rowIndex]: { [colIndex]: { v: value } } }
 */
function buildCellData(
  columns: ColumnMeta[],
  data: any[][],
): Record<number, Record<number, any>> {
  const cellData: Record<number, Record<number, any>> = {};

  // Row 0: Header row with bold styling
  cellData[0] = {};
  columns.forEach((col, colIdx) => {
    cellData[0][colIdx] = {
      v: col.name,
      s: { bl: 1, fs: 11, bg: { rgb: '#F5F5F5' } },
    };
  });

  // Data rows (offset by 1 for header)
  data.forEach((row, rowIdx) => {
    cellData[rowIdx + 1] = {};
    row.forEach((value, colIdx) => {
      if (colIdx < columns.length) {
        const cellValue =
          value === null || value === undefined
            ? ''
            : typeof value === 'object'
              ? JSON.stringify(value)
              : value;
        cellData[rowIdx + 1][colIdx] = { v: cellValue };
      }
    });
  });

  return cellData;
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
    </Container>
  );
}
