import { useEffect, useRef, useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { Alert, Spin, Empty } from 'antd';
import { ApolloError } from '@apollo/client';
import { parseGraphQLError } from '@/utils/errorHandler';

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
  border: 1px solid var(--gray-4);
  border-radius: 8px;
  overflow: hidden;
  background: white;
`;

const UniverContainer = styled.div`
  flex: 1;
  min-height: 0;
  position: relative;

  /* Hide Univer's own toolbar and header — we only want the grid */
  .univer-toolbar {
    display: none !important;
  }
  .univer-formula-bar {
    display: none !important;
  }
  .univer-sheet-bar {
    display: none !important;
  }
  .univer-header {
    display: none !important;
  }
  .univer-context-menu {
    z-index: 1050 !important;
  }
`;

const CenteredState = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
`;

const TableHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: var(--gray-2);
  border-bottom: 1px solid var(--gray-4);
  min-height: 36px;

  .header-left {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--gray-7);
  }

  .row-count {
    font-size: 11px;
    font-weight: 400;
    color: var(--gray-6);
    text-transform: none;
    letter-spacing: 0;
  }
`;

// ── Types ───────────────────────────────────────────────

interface ColumnMeta {
  name: string;
  type: string;
}

interface Props {
  columns?: ColumnMeta[];
  data?: any[][];
  loading?: boolean;
  error?: ApolloError | null;
  /** True when no SQL has been run yet */
  empty?: boolean;
}

// ── Helpers ─────────────────────────────────────────────

/**
 * Convert PreviewDataResponse (columns + rows) into Univer's IWorkbookData
 * cell format: { [rowIndex]: { [colIndex]: { v: value } } }
 */
function buildCellData(
  columns: ColumnMeta[],
  data: any[][],
): Record<number, Record<number, { v: string | number | boolean }>> {
  const cellData: Record<
    number,
    Record<number, { v: string | number | boolean }>
  > = {};

  // Row 0: Header row with bold styling
  cellData[0] = {};
  columns.forEach((col, colIdx) => {
    cellData[0][colIdx] = {
      v: col.name,
      // Bold header
      s: { bl: 1, fs: 11, bg: { rgb: '#F5F5F5' } },
    } as any;
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

// ── Component ───────────────────────────────────────────

export default function UniverSheet(props: Props) {
  const { columns = [], data = [], loading = false, error, empty } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const univerAPIRef = useRef<FUniver | null>(null);

  // Build the workbook data whenever columns/data change
  const workbookData = useMemo(() => {
    if (columns.length === 0) return null;

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
          rowCount: data.length + 2, // +1 for header, +1 buffer
          columnCount: columns.length,
          cellData: buildCellData(columns, data),
          // Set column widths based on header text length
          columnData: columns.reduce(
            (acc, col, idx) => {
              acc[idx] = {
                w: Math.max(col.name.length * 9 + 24, 100),
              };
              return acc;
            },
            {} as Record<number, { w: number }>,
          ),
          // Freeze the header row
          freeze: {
            startRow: 1,
            startColumn: 0,
            ySplit: 1,
            xSplit: 0,
          },
        },
      },
    };
  }, [columns, data]);

  // Initialize and update Univer instance
  useEffect(() => {
    if (!containerRef.current || !workbookData || loading) return;

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
  }, [workbookData, loading]);

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

  // Error state
  if (error) {
    const { message, shortMessage } = parseGraphQLError(error);
    return (
      <Container>
        <TableHeader>
          <span className="header-left">Results</span>
        </TableHeader>
        <CenteredState>
          <Alert
            message={shortMessage}
            description={message}
            type="error"
            showIcon
            style={{ maxWidth: 600 }}
          />
        </CenteredState>
      </Container>
    );
  }

  // Empty state — no SQL has been run yet
  if (empty && !loading && columns.length === 0) {
    return (
      <Container>
        <TableHeader>
          <span className="header-left">Results</span>
        </TableHeader>
        <CenteredState>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="Write a SQL query above and click Run to see results"
          />
        </CenteredState>
      </Container>
    );
  }

  return (
    <Container>
      <TableHeader>
        <span className="header-left">
          Results
          {data.length > 0 && (
            <span className="row-count">
              ({data.length} row{data.length !== 1 ? 's' : ''})
            </span>
          )}
        </span>
      </TableHeader>
      {loading ? (
        <CenteredState>
          <Spin tip="Running query..." />
        </CenteredState>
      ) : (
        <UniverContainer ref={containerRef} />
      )}
    </Container>
  );
}
