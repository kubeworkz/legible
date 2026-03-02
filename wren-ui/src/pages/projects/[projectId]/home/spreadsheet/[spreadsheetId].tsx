import { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { message, Input, Button, Tooltip } from 'antd';
import styled from 'styled-components';
import EditOutlined from '@ant-design/icons/EditOutlined';
import CheckOutlined from '@ant-design/icons/CheckOutlined';
import CloseOutlined from '@ant-design/icons/CloseOutlined';
import { Path, buildPath } from '@/utils/enum';
import useProject from '@/hooks/useProject';
import { useRouter } from 'next/router';
import SiderLayout from '@/components/layouts/SiderLayout';
import useHomeSidebar from '@/hooks/useHomeSidebar';
import SpreadsheetSqlEditor from '@/components/spreadsheet/SpreadsheetSqlEditor';
import SpreadsheetToolbar from '@/components/spreadsheet/SpreadsheetToolbar';
import type { ColumnConfig } from '@/components/spreadsheet/ColumnManager';
import UniverSheetDynamic from '@/components/spreadsheet/UniverSheetDynamic';
import DataSourceOverlay from '@/components/spreadsheet/DataSourceOverlay';
import {
  useSpreadsheetQuery,
  useUpdateSpreadsheetMutation,
  usePreviewSpreadsheetDataMutation,
} from '@/apollo/client/graphql/spreadsheet.generated';

const PageContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 16px 24px;
  gap: 12px;
`;

const Header = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-shrink: 0;

  .title-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  h2 {
    margin: 0;
    font-size: 20px;
    font-weight: 600;
    color: var(--gray-9);
  }

  .description {
    margin-top: 4px;
    font-size: 13px;
    color: var(--gray-7);
    max-width: 600px;
  }

  .edit-btn {
    color: var(--gray-6);
    &:hover {
      color: var(--gray-8);
    }
  }
`;

const TitleInput = styled(Input)`
  font-size: 20px;
  font-weight: 600;
  padding: 0 8px;
  width: 400px;
`;

const GridArea = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
`;

export default function SpreadsheetDetail() {
  const router = useRouter();
  const { currentProjectId } = useProject();
  const spreadsheetId = router.query.spreadsheetId as string;
  const homeSidebar = useHomeSidebar();

  const { data, loading: queryLoading, refetch } = useSpreadsheetQuery({
    variables: { where: { id: Number(spreadsheetId) } },
    skip: !spreadsheetId,
    fetchPolicy: 'cache-and-network',
    onError: () => {
      message.error('Failed to fetch spreadsheet.');
      router.push(buildPath(Path.Home, currentProjectId));
    },
  });

  const spreadsheet = useMemo(() => data?.spreadsheet, [data]);

  // ── Inline name editing ──────────────────────────────
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState('');

  const [updateSpreadsheet] = useUpdateSpreadsheetMutation({
    onError: (err) => message.error(err.message),
  });

  const startEditingName = useCallback(() => {
    setEditName(spreadsheet?.name || '');
    setIsEditingName(true);
  }, [spreadsheet?.name]);

  const saveName = useCallback(async () => {
    if (editName.trim() && editName.trim() !== spreadsheet?.name) {
      await updateSpreadsheet({
        variables: {
          where: { id: Number(spreadsheetId) },
          data: { name: editName.trim() },
        },
      });
      refetch();
      homeSidebar.refetchSpreadsheets();
    }
    setIsEditingName(false);
  }, [editName, spreadsheet?.name, spreadsheetId, updateSpreadsheet, refetch]);

  const cancelEditingName = useCallback(() => {
    setIsEditingName(false);
  }, []);

  // ── SQL editor state ─────────────────────────────────
  const [currentSql, setCurrentSql] = useState('');
  const [sqlDirty, setSqlDirty] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const [showSqlEditor, setShowSqlEditor] = useState(false);
  const [externalSql, setExternalSql] = useState<string | undefined>(undefined);

  // Sync initial SQL from the loaded spreadsheet
  useEffect(() => {
    if (spreadsheet?.sourceSql && !hasRun) {
      setCurrentSql(spreadsheet.sourceSql);
      setShowSqlEditor(true); // Show editor if spreadsheet already has SQL
    }
  }, [spreadsheet?.sourceSql]);

  // ── Preview data (run SQL) ───────────────────────────
  const [previewSpreadsheetData, { data: previewResult, loading: previewLoading, error: previewError }] =
    usePreviewSpreadsheetDataMutation();

  const resultData = useMemo(() => {
    if (!previewResult?.previewSpreadsheetData) return null;
    return previewResult.previewSpreadsheetData;
  }, [previewResult]);

  const handleRunSql = useCallback(
    async (sql: string) => {
      setCurrentSql(sql);
      setHasRun(true);
      setSqlDirty(sql !== spreadsheet?.sourceSql);
      try {
        await previewSpreadsheetData({
          variables: {
            data: {
              spreadsheetId: Number(spreadsheetId),
              sql,
              limit: 500,
            },
          },
        });
      } catch {
        // Error is handled in the grid via previewError
      }
    },
    [spreadsheetId, spreadsheet?.sourceSql, previewSpreadsheetData],
  );

  const handleSaveSql = useCallback(
    async (sql: string) => {
      await updateSpreadsheet({
        variables: {
          where: { id: Number(spreadsheetId) },
          data: { sourceSql: sql },
        },
      });
      setSqlDirty(false);
      refetch();
      message.success('SQL saved');
    },
    [spreadsheetId, updateSpreadsheet, refetch],
  );

  // Auto-run if spreadsheet already has SQL
  useEffect(() => {
    if (spreadsheet?.sourceSql && !hasRun && spreadsheetId) {
      handleRunSql(spreadsheet.sourceSql);
    }
  }, [spreadsheet?.sourceSql, spreadsheetId]);

  // ── Column config state ──────────────────────────────
  const [columnConfigs, setColumnConfigs] = useState<ColumnConfig[]>([]);
  const columnConfigsInitialized = useRef(false);

  // Initialize column configs when query results arrive
  useEffect(() => {
    if (!resultData?.columns || resultData.columns.length === 0) return;

    const queryCols = resultData.columns as { name: string; type: string }[];

    // Try to load saved config
    let savedConfigs: ColumnConfig[] = [];
    if (spreadsheet?.columnsMetadata) {
      try {
        savedConfigs = JSON.parse(spreadsheet.columnsMetadata);
      } catch {
        savedConfigs = [];
      }
    }

    if (savedConfigs.length > 0 && !columnConfigsInitialized.current) {
      // Merge: keep saved order/visibility for known columns, add new ones
      const savedMap = new Map(savedConfigs.map((c) => [c.name, c]));
      const knownNames = new Set(queryCols.map((c) => c.name));
      const merged: ColumnConfig[] = [];

      // First: saved columns that still exist
      for (const sc of savedConfigs) {
        if (knownNames.has(sc.name)) {
          const qc = queryCols.find((q) => q.name === sc.name)!;
          merged.push({ name: sc.name, type: qc.type, visible: sc.visible });
        }
      }

      // Then: new columns not in saved config
      for (const qc of queryCols) {
        if (!savedMap.has(qc.name)) {
          merged.push({ name: qc.name, type: qc.type, visible: true });
        }
      }

      setColumnConfigs(merged);
      columnConfigsInitialized.current = true;
    } else if (!columnConfigsInitialized.current) {
      // No saved config — all visible in query order
      setColumnConfigs(
        queryCols.map((c) => ({ name: c.name, type: c.type, visible: true })),
      );
      columnConfigsInitialized.current = true;
    } else {
      // Config already initialized, but new query results — reconcile
      const knownNames = new Set(queryCols.map((c) => c.name));
      const existingMap = new Map(columnConfigs.map((c) => [c.name, c]));
      const merged: ColumnConfig[] = [];

      // Keep existing order for columns that still exist
      for (const ec of columnConfigs) {
        if (knownNames.has(ec.name)) {
          const qc = queryCols.find((q) => q.name === ec.name)!;
          merged.push({ ...ec, type: qc.type });
        }
      }

      // Add new columns
      for (const qc of queryCols) {
        if (!existingMap.has(qc.name)) {
          merged.push({ name: qc.name, type: qc.type, visible: true });
        }
      }

      setColumnConfigs(merged);
    }
  }, [resultData?.columns, spreadsheet?.columnsMetadata]);

  // Handle column config changes from ColumnManager
  const handleColumnConfigsChange = useCallback(
    (configs: ColumnConfig[]) => {
      setColumnConfigs(configs);
      setSqlDirty(true); // Mark as dirty so user can save
    },
    [],
  );

  // ── Toolbar handlers ──────────────────────────────────
  const handleToolbarSave = useCallback(() => {
    // Save both SQL and column configs
    const saveData: Record<string, any> = {};
    if (currentSql) saveData.sourceSql = currentSql;
    saveData.columnsMetadata = JSON.stringify(columnConfigs);

    updateSpreadsheet({
      variables: {
        where: { id: Number(spreadsheetId) },
        data: saveData,
      },
    }).then(() => {
      setSqlDirty(false);
      refetch();
      message.success('Saved');
    });
  }, [currentSql, columnConfigs, spreadsheetId, updateSpreadsheet, refetch]);

  const handleDiscard = useCallback(() => {
    const savedSql = spreadsheet?.sourceSql || '';
    setCurrentSql(savedSql);
    setExternalSql(savedSql); // Push back into the editor
    setSqlDirty(false);

    // Reset column configs to saved state
    if (spreadsheet?.columnsMetadata) {
      try {
        const saved = JSON.parse(spreadsheet.columnsMetadata) as ColumnConfig[];
        setColumnConfigs(saved);
      } catch {
        // leave current configs
      }
    } else if (resultData?.columns) {
      // No saved config — reset to all visible
      setColumnConfigs(
        (resultData.columns as { name: string; type: string }[]).map((c) => ({
          name: c.name,
          type: c.type,
          visible: true,
        })),
      );
    }

    if (savedSql) {
      handleRunSql(savedSql);
    }
    message.info('Changes discarded');
  }, [spreadsheet?.sourceSql, spreadsheet?.columnsMetadata, resultData?.columns, handleRunSql]);

  const handleToggleSqlEditor = useCallback(() => {
    setShowSqlEditor((prev) => !prev);
  }, []);

  // ── Data source overlay handlers ─────────────────────
  const handleSelectModelView = useCallback(
    (sql: string, _name: string) => {
      setExternalSql(sql);
      setShowSqlEditor(true);
      // Auto-run the generated SQL
      handleRunSql(sql);
    },
    [handleRunSql],
  );

  const handleCreateFromSql = useCallback(() => {
    setShowSqlEditor(true);
  }, []);

  return (
    <SiderLayout loading={false} sidebar={homeSidebar}>
      <PageContainer>
        <Header>
          <div>
            {isEditingName ? (
              <div className="title-row">
                <TitleInput
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onPressEnter={saveName}
                  autoFocus
                />
                <Tooltip title="Save">
                  <Button
                    type="text"
                    size="small"
                    icon={<CheckOutlined />}
                    onClick={saveName}
                  />
                </Tooltip>
                <Tooltip title="Cancel">
                  <Button
                    type="text"
                    size="small"
                    icon={<CloseOutlined />}
                    onClick={cancelEditingName}
                  />
                </Tooltip>
              </div>
            ) : (
              <div className="title-row">
                <h2>{spreadsheet?.name || 'Loading...'}</h2>
                <Tooltip title="Rename">
                  <Button
                    type="text"
                    size="small"
                    className="edit-btn"
                    icon={<EditOutlined />}
                    onClick={startEditingName}
                  />
                </Tooltip>
              </div>
            )}
            {spreadsheet?.description && (
              <div className="description">{spreadsheet.description}</div>
            )}
          </div>
        </Header>

        {hasRun && (
          <SpreadsheetToolbar
            dirty={sqlDirty}
            loading={previewLoading}
            sqlEditorVisible={showSqlEditor}
            onSave={handleToolbarSave}
            onDiscard={handleDiscard}
            onToggleSqlEditor={handleToggleSqlEditor}
            columnConfigs={columnConfigs}
            onColumnConfigsChange={handleColumnConfigsChange}
          />
        )}

        {showSqlEditor && (
          <SpreadsheetSqlEditor
            initialSql={spreadsheet?.sourceSql || ''}
            externalSql={externalSql}
            loading={previewLoading}
            onRun={handleRunSql}
            onSave={handleSaveSql}
            dirty={sqlDirty}
          />
        )}

        <GridArea>
          <UniverSheetDynamic
            columns={resultData?.columns}
            data={resultData?.data}
            loading={previewLoading}
            error={previewError || null}
            columnConfigs={columnConfigs}
            overlay={
              !hasRun ? (
                <DataSourceOverlay
                  onSelectModelView={handleSelectModelView}
                  onCreateFromSql={handleCreateFromSql}
                />
              ) : undefined
            }
          />
        </GridArea>
      </PageContainer>
    </SiderLayout>
  );
}
