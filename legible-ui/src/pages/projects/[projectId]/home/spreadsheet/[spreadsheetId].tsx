import { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { message, Input, Button, Tooltip, Modal } from 'antd';
import styled from 'styled-components';
import EditOutlined from '@ant-design/icons/EditOutlined';
import CheckOutlined from '@ant-design/icons/CheckOutlined';
import CloseOutlined from '@ant-design/icons/CloseOutlined';
import InfoCircleOutlined from '@ant-design/icons/InfoCircleOutlined';
import CopyOutlined from '@ant-design/icons/CopyOutlined';
import { format as formatSQL } from 'sql-formatter';

const SQLCodeBlock = dynamic(() => import('@/components/code/SQLCodeBlock'), {
  ssr: false,
});
import { getCompactTime } from '@/utils/time';
import { Path, buildPath } from '@/utils/enum';
import useProject from '@/hooks/useProject';
import { useRouter } from 'next/router';
import SiderLayout from '@/components/layouts/SiderLayout';
import useHomeSidebar from '@/hooks/useHomeSidebar';
import SpreadsheetSqlEditor from '@/components/spreadsheet/SpreadsheetSqlEditor';
import SpreadsheetToolbar from '@/components/spreadsheet/SpreadsheetToolbar';
import type { ColumnConfig, SortState } from '@/components/spreadsheet/ColumnManager';
import SpreadsheetSearch from '@/components/spreadsheet/SpreadsheetSearch';
import type { SearchMatch } from '@/components/spreadsheet/SpreadsheetSearch';
import {
  applyColumnConfigs,
  exportToCSV,
  exportToExcel,
} from '@/components/spreadsheet/exportSpreadsheet';
import UniverSheetDynamic from '@/components/spreadsheet/UniverSheetDynamic';
import DataSourceOverlay from '@/components/spreadsheet/DataSourceOverlay';
import SpreadsheetHistoryDrawer from '@/components/spreadsheet/SpreadsheetHistoryDrawer';
import SpreadsheetAIPanel from '@/components/spreadsheet/SpreadsheetAIPanel';
import AIOperationsBar from '@/components/spreadsheet/AIOperationsBar';
import {
  useSpreadsheetQuery,
  useUpdateSpreadsheetMutation,
  usePreviewSpreadsheetDataMutation,
  useSpreadsheetHistoryQuery,
  useSaveSpreadsheetWithHistoryMutation,
  useRestoreSpreadsheetVersionMutation,
  useDuplicateSpreadsheetMutation,
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

  .meta-row {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 4px;
    font-size: 12px;
    color: var(--gray-7, #8c8c8c);
    flex-wrap: wrap;
  }

  .meta-item {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background: var(--gray-3, #f5f5f5);
    border-radius: 4px;
    padding: 2px 8px;
    white-space: nowrap;
  }

  .meta-label {
    font-weight: 500;
    color: var(--gray-8, #595959);
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
  flex-direction: row;
  min-height: 0;
`;

const GridMain = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
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

  // ── History, Duplicate, Restore hooks ─────────────────
  const [historyDrawerVisible, setHistoryDrawerVisible] = useState(false);
  const [restoringId, setRestoringId] = useState<number | null>(null);

  const { data: historyData, loading: historyLoading, refetch: refetchHistory } = useSpreadsheetHistoryQuery({
    variables: { where: { spreadsheetId: Number(spreadsheetId) } },
    skip: !spreadsheetId || !historyDrawerVisible,
    fetchPolicy: 'network-only',
  });

  const historyEntries = useMemo(
    () => historyData?.spreadsheetHistory ?? [],
    [historyData],
  );

  const [saveWithHistory] = useSaveSpreadsheetWithHistoryMutation({
    onError: (err) => message.error(err.message),
  });

  const [restoreVersion] = useRestoreSpreadsheetVersionMutation({
    onError: (err) => message.error(err.message),
  });

  const [duplicateSpreadsheet] = useDuplicateSpreadsheetMutation({
    onError: (err) => message.error(err.message),
  });

  // ── AI Assistant state ────────────────────────────────
  const [aiPanelVisible, setAIPanelVisible] = useState(false);

  const handleToggleAIPanel = useCallback(() => {
    setAIPanelVisible((prev) => !prev);
  }, []);

  const handleCloseAIPanel = useCallback(() => {
    setAIPanelVisible(false);
  }, []);

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

  // ── Univer handles (undo / redo) ─────────────────────
  const univerHandlesRef = useRef<{ undo: () => void; redo: () => void } | null>(null);
  // ── Show SQL modal ────────────────────────────────────
  const [showSqlModalVisible, setShowSqlModalVisible] = useState(false);
  // ── SQL editor state ─────────────────────────────────
  const [currentSql, setCurrentSql] = useState('');
  const [sqlDirty, setSqlDirty] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const [showSqlEditor, setShowSqlEditor] = useState(false);
  const [externalSql, setExternalSql] = useState<string | undefined>(undefined);
  const [fetchLimit, setFetchLimit] = useState(500);

  // ── Search state ──────────────────────────────────────
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchMatches, setSearchMatches] = useState<SearchMatch[]>([]);
  const [activeMatchIndex, setActiveMatchIndex] = useState(0);

  // ── Sort state ────────────────────────────────────────
  const [sort, setSort] = useState<SortState | null>(null);

  // ── Preview data (run SQL) ───────────────────────────
  const [previewSpreadsheetData, { data: previewResult, loading: previewLoading, error: previewError, reset: resetPreview }] =
    usePreviewSpreadsheetDataMutation();

  // Reset all transient state when navigating to a different spreadsheet
  const prevSpreadsheetIdRef = useRef(spreadsheetId);
  useEffect(() => {
    if (prevSpreadsheetIdRef.current === spreadsheetId) return;
    prevSpreadsheetIdRef.current = spreadsheetId;
    setCurrentSql('');
    setSqlDirty(false);
    setHasRun(false);
    setShowSqlEditor(false);
    setExternalSql(undefined);
    setFetchLimit(500);
    setIsEditingName(false);
    setHistoryDrawerVisible(false);
    setAIPanelVisible(false);
    setSearchVisible(false);
    setSearchMatches([]);
    setActiveMatchIndex(0);
    setSort(null);
    resetPreview();
  }, [spreadsheetId, resetPreview]);

  // Sync initial SQL from the loaded spreadsheet
  useEffect(() => {
    if (spreadsheet?.sourceSql && !hasRun) {
      setCurrentSql(spreadsheet.sourceSql);
    }
  }, [spreadsheet?.sourceSql]);

  const resultData = useMemo(() => {
    if (!previewResult?.previewSpreadsheetData) return null;
    return previewResult.previewSpreadsheetData;
  }, [previewResult]);

  const handleRunSql = useCallback(
    async (sql: string, limit?: number) => {
      const effectiveLimit = limit ?? fetchLimit;
      setCurrentSql(sql);
      setHasRun(true);
      setSqlDirty(sql !== spreadsheet?.sourceSql);
      try {
        await previewSpreadsheetData({
          variables: {
            data: {
              spreadsheetId: Number(spreadsheetId),
              sql,
              limit: effectiveLimit,
            },
          },
        });
      } catch {
        // Error is handled in the grid via previewError
      }
    },
    [spreadsheetId, spreadsheet?.sourceSql, previewSpreadsheetData, fetchLimit],
  );

  const handleAIApplySql = useCallback(
    (sql: string) => {
      setExternalSql(sql);
      setShowSqlEditor(true);
      handleRunSql(sql);
      message.success('SQL applied from AI Assistant');
    },
    [handleRunSql],
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
  // Guard: only run when the loaded spreadsheet ID matches the current route
  useEffect(() => {
    if (
      spreadsheet?.sourceSql &&
      !hasRun &&
      spreadsheetId &&
      String(spreadsheet.id) === spreadsheetId
    ) {
      handleRunSql(spreadsheet.sourceSql);
    }
  }, [spreadsheet?.sourceSql, spreadsheet?.id, spreadsheetId]);

  // ── Column config state ──────────────────────────────
  const [columnConfigs, setColumnConfigs] = useState<ColumnConfig[]>([]);
  const columnConfigsInitialized = useRef(false);

  const handleSortChange = useCallback(
    (newSort: SortState | null) => {
      setSort(newSort);
    },
    [],
  );

  const handleSearchChange = useCallback(
    (_term: string, matches: SearchMatch[], activeIdx: number) => {
      setSearchMatches(matches);
      setActiveMatchIndex(activeIdx);
    },
    [],
  );

  // Ctrl+F / Cmd+F to open search (only from real user events)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f' && e.isTrusted) {
        e.preventDefault();
        e.stopPropagation();
        setSearchVisible((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, []);

  // ── Load More (pagination) ────────────────────────────
  const loadedRowCount = resultData?.data?.length ?? 0;
  const isAtLimit = loadedRowCount >= fetchLimit;

  const handleLoadMore = useCallback(() => {
    const newLimit = fetchLimit + 500;
    setFetchLimit(newLimit);
    if (currentSql) {
      handleRunSql(currentSql, newLimit);
    }
  }, [fetchLimit, currentSql, handleRunSql]);

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
    // Save with history tracking
    const saveInput: any = {
      spreadsheetId: Number(spreadsheetId),
    };
    if (currentSql) saveInput.sourceSql = currentSql;
    saveInput.columnsMetadata = JSON.stringify(columnConfigs);

    saveWithHistory({
      variables: { data: saveInput },
    }).then(() => {
      setSqlDirty(false);
      refetch();
      if (historyDrawerVisible) refetchHistory();
      message.success('Saved');
    });
  }, [currentSql, columnConfigs, spreadsheetId, saveWithHistory, refetch, historyDrawerVisible, refetchHistory]);

  const handleDiscard = useCallback(() => {
    const savedSql = spreadsheet?.sourceSql || '';
    setCurrentSql(savedSql);
    setExternalSql(savedSql); // Push back into the editor
    setSqlDirty(false);
    setSort(null); // Clear sort on discard
    setFetchLimit(500); // Reset fetch limit

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

  // ── Export handlers ──────────────────────────────────
  const getExportPayload = useCallback(() => {
    if (!resultData?.columns || !resultData?.data) return null;
    const { columns: cols, data: rows } = applyColumnConfigs(
      resultData.columns as { name: string; type: string }[],
      resultData.data as any[][],
      columnConfigs,
    );
    return {
      columns: cols,
      data: rows,
      fileName: spreadsheet?.name || 'spreadsheet',
    };
  }, [resultData, columnConfigs, spreadsheet?.name]);

  const handleExportCSV = useCallback(() => {
    const payload = getExportPayload();
    if (!payload || payload.columns.length === 0) {
      message.warning('No data to export');
      return;
    }
    exportToCSV(payload);
    message.success('CSV downloaded');
  }, [getExportPayload]);

  const handleExportExcel = useCallback(async () => {
    const payload = getExportPayload();
    if (!payload || payload.columns.length === 0) {
      message.warning('No data to export');
      return;
    }
    try {
      await exportToExcel(payload);
      message.success('Excel file downloaded');
    } catch {
      message.error('Failed to export Excel file');
    }
  }, [getExportPayload]);

  // ── History handlers ─────────────────────────────────
  const handleOpenHistory = useCallback(() => {
    setHistoryDrawerVisible(true);
  }, []);

  const handleCloseHistory = useCallback(() => {
    setHistoryDrawerVisible(false);
  }, []);

  const handleRestore = useCallback(
    async (historyId: number) => {
      setRestoringId(historyId);
      try {
        await restoreVersion({
          variables: {
            data: {
              spreadsheetId: Number(spreadsheetId),
              historyId,
            },
          },
        });
        await refetch();
        await refetchHistory();
        // Re-run the restored SQL
        const updated = await refetch();
        const restoredSql = updated.data?.spreadsheet?.sourceSql;
        if (restoredSql) {
          setCurrentSql(restoredSql);
          setExternalSql(restoredSql);
          setSqlDirty(false);
          handleRunSql(restoredSql);
        }
        // Restore column configs
        const restoredMeta = updated.data?.spreadsheet?.columnsMetadata;
        if (restoredMeta) {
          try {
            setColumnConfigs(JSON.parse(restoredMeta));
          } catch {
            // leave current
          }
        }
        message.success('Version restored');
      } catch {
        // Error handled in mutation hook
      } finally {
        setRestoringId(null);
      }
    },
    [spreadsheetId, restoreVersion, refetch, refetchHistory, handleRunSql],
  );

  const handleDuplicate = useCallback(async () => {
    try {
      const result = await duplicateSpreadsheet({
        variables: {
          data: { spreadsheetId: Number(spreadsheetId) },
        },
      });
      const newId = result.data?.duplicateSpreadsheet?.id;
      homeSidebar.refetchSpreadsheets();
      message.success('Spreadsheet duplicated');
      if (newId) {
        router.push(
          buildPath(Path.Home, currentProjectId) + `/spreadsheet/${newId}`,
        );
      }
    } catch {
      // Error handled in mutation hook
    }
  }, [spreadsheetId, duplicateSpreadsheet, homeSidebar, router, currentProjectId]);

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
    <SiderLayout loading={queryLoading && !spreadsheet} sidebar={homeSidebar}>
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
            {spreadsheet && (
              <div className="meta-row">
                {spreadsheet.creatorName && (
                  <span className="meta-item">
                    <span className="meta-label">Creator</span>
                    {spreadsheet.creatorName}
                  </span>
                )}
                {spreadsheet.updatedAt && (
                  <span className="meta-item">
                    <span className="meta-label">Last updated</span>
                    {getCompactTime(spreadsheet.updatedAt)}
                  </span>
                )}
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
            hasData={!!resultData?.columns && resultData.columns.length > 0}
            onExportCSV={handleExportCSV}
            onExportExcel={handleExportExcel}
            sort={sort}
            onSortChange={handleSortChange}
            onSearch={() => setSearchVisible((prev) => !prev)}
            searchActive={searchVisible}
            onHistory={handleOpenHistory}
            historyActive={historyDrawerVisible}
            onDuplicate={handleDuplicate}
            onAIAssistant={handleToggleAIPanel}
            aiAssistantActive={aiPanelVisible}
            onUndo={() => univerHandlesRef.current?.undo()}
            onRedo={() => univerHandlesRef.current?.redo()}
          />
        )}

        {hasRun && (
          <AIOperationsBar
            hasData={!!resultData?.columns && resultData.columns.length > 0}
            loading={previewLoading}
            onConfirm={(operation, prompt) => {
              // Send the AI operation prompt to the AI panel
              handleAIApplySql(`-- AI ${operation}: ${prompt}`);
              message.info(`AI ${operation} requested`);
            }}
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
          <GridMain>
            <UniverSheetDynamic
              columns={resultData?.columns}
              data={resultData?.data}
              loading={previewLoading}
              error={previewError || null}
              columnConfigs={columnConfigs}
              sort={sort}
              searchMatches={searchMatches}
              activeMatchIndex={activeMatchIndex}
              isAtLimit={isAtLimit}
              loadedRowCount={loadedRowCount}
              fetchLimit={fetchLimit}
              onLoadMore={handleLoadMore}
              onReady={(handles) => { univerHandlesRef.current = handles; }}
              onCellEdit={() => setSqlDirty(true)}
              onShowSQL={currentSql ? () => setShowSqlModalVisible(true) : undefined}
              searchOverlay={
                searchVisible ? (
                  <SpreadsheetSearch
                    visible={searchVisible}
                    onClose={() => {
                      setSearchVisible(false);
                      setSearchMatches([]);
                      setActiveMatchIndex(0);
                    }}
                    columnCount={resultData?.columns?.length || 0}
                    rowCount={resultData?.data?.length || 0}
                    onSearchChange={handleSearchChange}
                    data={resultData?.data as any[][] | undefined}
                    columnNames={
                      (resultData?.columns as { name: string }[] | undefined)?.map(
                        (c) => c.name,
                      ) || []
                    }
                  />
                ) : undefined
              }
              overlay={
                !hasRun && !queryLoading && !spreadsheet?.sourceSql ? (
                  <DataSourceOverlay
                    onSelectModelView={handleSelectModelView}
                    onCreateFromSql={handleCreateFromSql}
                  />
                ) : undefined
              }
            />
          </GridMain>

          <SpreadsheetAIPanel
            visible={aiPanelVisible}
            onClose={handleCloseAIPanel}
            currentSql={currentSql}
            onApplySql={handleAIApplySql}
            spreadsheetName={spreadsheet?.name}
          />
        </GridArea>

        <SpreadsheetHistoryDrawer
          visible={historyDrawerVisible}
          onClose={handleCloseHistory}
          entries={historyEntries as any[]}
          loading={historyLoading}
          onRestore={handleRestore}
          restoringId={restoringId}
        />

        <Modal
          title={
            <span>
              <InfoCircleOutlined style={{ marginRight: 8 }} />
              SQL Statement
            </span>
          }
          open={showSqlModalVisible}
          onCancel={() => setShowSqlModalVisible(false)}
          footer={
            <Button onClick={() => setShowSqlModalVisible(false)}>
              Close
            </Button>
          }
          width={680}
          bodyStyle={{ padding: 0 }}
        >
          {showSqlModalVisible && currentSql && (
            <div style={{ position: 'relative' }}>
              <Tooltip title="Copy SQL">
                <Button
                  type="text"
                  icon={<CopyOutlined />}
                  size="small"
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    zIndex: 1,
                    color: 'var(--gray-6)',
                  }}
                  onClick={() => {
                    navigator.clipboard.writeText(currentSql);
                    message.success('SQL copied to clipboard');
                  }}
                />
              </Tooltip>
              <SQLCodeBlock
                code={(() => {
                  try {
                    return formatSQL(currentSql, { language: 'postgresql' });
                  } catch {
                    return currentSql;
                  }
                })()}
                maxHeight="400"
                showLineNumbers
              />
            </div>
          )}
        </Modal>
      </PageContainer>
    </SiderLayout>
  );
}
