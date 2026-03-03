import { useCallback } from 'react';
import styled from 'styled-components';
import { Button, Tooltip, Divider, Dropdown, Menu } from 'antd';
import SaveOutlined from '@ant-design/icons/SaveOutlined';
import UndoOutlined from '@ant-design/icons/UndoOutlined';
import RedoOutlined from '@ant-design/icons/RedoOutlined';
import DeleteOutlined from '@ant-design/icons/DeleteOutlined';
import HistoryOutlined from '@ant-design/icons/HistoryOutlined';
import CodeOutlined from '@ant-design/icons/CodeOutlined';
import DownOutlined from '@ant-design/icons/DownOutlined';
import ExportOutlined from '@ant-design/icons/ExportOutlined';
import FileExcelOutlined from '@ant-design/icons/FileExcelOutlined';
import FileTextOutlined from '@ant-design/icons/FileTextOutlined';
import SearchOutlined from '@ant-design/icons/SearchOutlined';
import CopyOutlined from '@ant-design/icons/CopyOutlined';
import ThunderboltOutlined from '@ant-design/icons/ThunderboltOutlined';
import ColumnManager, { ColumnConfig, SortState } from './ColumnManager';

// ── Styles ──────────────────────────────────────────────

const ToolbarContainer = styled.div`
  display: flex;
  align-items: center;
  padding: 6px 12px;
  background: var(--gray-2, #fafafa);
  border: 1px solid var(--gray-4, #d9d9d9);
  border-radius: 8px;
  gap: 0;
  flex-shrink: 0;
  min-height: 44px;
`;

const ToolbarSection = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`;

const SectionLabel = styled.span<{ $color?: string }>`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 600;
  color: ${(props) => props.$color || 'var(--gray-7)'};
  margin-right: 8px;
  white-space: nowrap;
  user-select: none;
`;

const SectionDot = styled.span<{ $color: string }>`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${(props) => props.$color};
  flex-shrink: 0;
`;

const StyledDivider = styled(Divider)`
  && {
    height: 24px;
    margin: 0 8px;
    border-color: var(--gray-4);
  }
`;

const ToolbarButton = styled(Button)`
  && {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    padding: 2px 8px;
    height: 28px;
    border-radius: 4px;
  }
`;

const SaveButton = styled(ToolbarButton)<{ $dirty?: boolean }>`
  && {
    ${(props) =>
      props.$dirty &&
      `
      background: var(--geekblue-1, #f0f5ff);
      border-color: var(--geekblue-5, #597ef7);
      color: var(--geekblue-6, #2f54eb);

      &:hover {
        background: var(--geekblue-2, #d6e4ff);
        border-color: var(--geekblue-5, #597ef7);
        color: var(--geekblue-6, #2f54eb);
      }
    `}
  }
`;

const SqlToggleButton = styled(ToolbarButton)<{ $active?: boolean }>`
  && {
    ${(props) =>
      props.$active &&
      `
      background: var(--gray-3, #f5f5f5);
      border-color: var(--gray-5, #d9d9d9);
    `}
  }
`;

// ── Types ───────────────────────────────────────────────

export interface SpreadsheetToolbarProps {
  /** Whether there are unsaved changes */
  dirty?: boolean;
  /** Whether a query is currently running */
  loading?: boolean;
  /** Whether the SQL editor is currently shown */
  sqlEditorVisible?: boolean;
  /** Called when Save is clicked */
  onSave?: () => void;
  /** Called when Discard Changes is clicked */
  onDiscard?: () => void;
  /** Called when Undo is clicked */
  onUndo?: () => void;
  /** Called when Redo is clicked */
  onRedo?: () => void;
  /** Called to toggle SQL editor visibility */
  onToggleSqlEditor?: () => void;
  /** Column configs for the column manager */
  columnConfigs?: ColumnConfig[];
  /** Called when column configs change */
  onColumnConfigsChange?: (configs: ColumnConfig[]) => void;
  /** Whether data is available for export */
  hasData?: boolean;
  /** Called when export CSV is requested */
  onExportCSV?: () => void;
  /** Called when export Excel is requested */
  onExportExcel?: () => void;
  /** Current sort state */
  sort?: SortState | null;
  /** Called when sort changes */
  onSortChange?: (sort: SortState | null) => void;
  /** Called when Search is clicked */
  onSearch?: () => void;
  /** Whether search is currently active */
  searchActive?: boolean;
  /** Called when History is clicked */
  onHistory?: () => void;
  /** Whether history drawer is open */
  historyActive?: boolean;
  /** Called when Duplicate is clicked */
  onDuplicate?: () => void;
  /** Called when AI Assistant is clicked */
  onAIAssistant?: () => void;
  /** Whether AI assistant panel is open */
  aiAssistantActive?: boolean;
}

// ── Component ───────────────────────────────────────────

export default function SpreadsheetToolbar(props: SpreadsheetToolbarProps) {
  const {
    dirty = false,
    loading = false,
    sqlEditorVisible = false,
    onSave,
    onDiscard,
    onUndo,
    onRedo,
    onToggleSqlEditor,
    columnConfigs = [],
    onColumnConfigsChange,
    hasData = false,
    onExportCSV,
    onExportExcel,
    sort,
    onSortChange,
    onSearch,
    searchActive = false,
    onHistory,
    historyActive = false,
    onDuplicate,
    onAIAssistant,
    aiAssistantActive = false,
  } = props;

  const handleSave = useCallback(() => {
    if (onSave) onSave();
  }, [onSave]);

  const handleDiscard = useCallback(() => {
    if (onDiscard) onDiscard();
  }, [onDiscard]);

  return (
    <ToolbarContainer>
      {/* ── Changes section ── */}
      <ToolbarSection>
        <SectionLabel>
          <SectionDot $color="var(--gold-5, #faad14)" />
          Changes
        </SectionLabel>

        <Tooltip title="Undo">
          <ToolbarButton
            size="small"
            type="text"
            icon={<UndoOutlined />}
            onClick={onUndo}
            disabled={!onUndo || !dirty}
          />
        </Tooltip>
        <Tooltip title="Redo">
          <ToolbarButton
            size="small"
            type="text"
            icon={<RedoOutlined />}
            onClick={onRedo}
            disabled={!onRedo || !dirty}
          />
        </Tooltip>

        <Tooltip title="Save">
          <SaveButton
            size="small"
            icon={<SaveOutlined />}
            onClick={handleSave}
            disabled={!dirty || loading}
            $dirty={dirty}
          >
            Save
          </SaveButton>
        </Tooltip>

        <Tooltip title="Discard Changes">
          <ToolbarButton
            size="small"
            icon={<DeleteOutlined />}
            onClick={handleDiscard}
            disabled={!dirty || loading}
          >
            Discard Changes
          </ToolbarButton>
        </Tooltip>

        <Tooltip title="Version History">
          <ToolbarButton
            size="small"
            icon={<HistoryOutlined />}
            onClick={onHistory}
            style={historyActive ? { background: 'var(--gray-3)', borderColor: 'var(--gray-5)' } : undefined}
          >
            History
          </ToolbarButton>
        </Tooltip>

        <Tooltip title="Duplicate Spreadsheet">
          <ToolbarButton
            size="small"
            icon={<CopyOutlined />}
            onClick={onDuplicate}
          >
            Duplicate
          </ToolbarButton>
        </Tooltip>
      </ToolbarSection>

      <StyledDivider type="vertical" />

      {/* ── SQL Editor toggle ── */}
      <ToolbarSection>
        <Tooltip title={sqlEditorVisible ? 'Hide SQL editor' : 'Show SQL editor'}>
          <SqlToggleButton
            size="small"
            icon={<CodeOutlined />}
            onClick={onToggleSqlEditor}
            $active={sqlEditorVisible}
          >
            SQL
          </SqlToggleButton>
        </Tooltip>
      </ToolbarSection>

      <StyledDivider type="vertical" />

      {/* ── Columns section ── */}
      <ToolbarSection>
        <SectionLabel>
          <SectionDot $color="var(--geekblue-5, #597ef7)" />
          Columns
        </SectionLabel>
        <ColumnManager
          columns={columnConfigs}
          onChange={onColumnConfigsChange || (() => {})}
          sort={sort}
          onSortChange={onSortChange}
        >
          <ToolbarButton
            size="small"
            icon={<DownOutlined style={{ fontSize: 10 }} />}
            disabled={columnConfigs.length === 0}
          >
            Update columns
          </ToolbarButton>
        </ColumnManager>
      </ToolbarSection>

      <StyledDivider type="vertical" />

      {/* ── Export section ── */}
      <ToolbarSection>
        <SectionLabel>
          <SectionDot $color="var(--green-5, #52c41a)" />
          Export
        </SectionLabel>
        <Dropdown
          disabled={!hasData || loading}
          overlay={
            <Menu>
              <Menu.Item
                key="csv"
                icon={<FileTextOutlined />}
                onClick={onExportCSV}
              >
                Export as CSV
              </Menu.Item>
              <Menu.Item
                key="excel"
                icon={<FileExcelOutlined />}
                onClick={onExportExcel}
              >
                Export as Excel
              </Menu.Item>
            </Menu>
          }
          trigger={['click']}
        >
          <ToolbarButton
            size="small"
            icon={<ExportOutlined />}
            disabled={!hasData || loading}
          >
            Download
            <DownOutlined style={{ fontSize: 10, marginLeft: 4 }} />
          </ToolbarButton>
        </Dropdown>
      </ToolbarSection>

      <StyledDivider type="vertical" />

      {/* ── Search ── */}
      <ToolbarSection>
        <Tooltip title="Search data (Ctrl+F)">
          <ToolbarButton
            size="small"
            icon={<SearchOutlined />}
            onClick={onSearch}
            disabled={!hasData || loading}
            style={searchActive ? { background: 'var(--gray-3)', borderColor: 'var(--gray-5)' } : undefined}
          >
            Search
          </ToolbarButton>
        </Tooltip>
      </ToolbarSection>

      <StyledDivider type="vertical" />

      {/* ── AI Assistant ── */}
      <ToolbarSection>
        <Tooltip title="AI Assistant">
          <ToolbarButton
            size="small"
            icon={<ThunderboltOutlined />}
            onClick={onAIAssistant}
            style={
              aiAssistantActive
                ? {
                    background: 'var(--purple-1, #f9f0ff)',
                    borderColor: 'var(--purple-4, #b37feb)',
                    color: 'var(--purple-6, #722ed1)',
                  }
                : undefined
            }
          >
            AI Assistant
          </ToolbarButton>
        </Tooltip>
      </ToolbarSection>
    </ToolbarContainer>
  );
}
