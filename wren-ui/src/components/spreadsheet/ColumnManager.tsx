import { useState, useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { Popover, Button, Tooltip, Typography, Empty } from 'antd';
import Checkbox from 'antd/lib/checkbox';
import UpOutlined from '@ant-design/icons/UpOutlined';
import DownOutlined from '@ant-design/icons/DownOutlined';
import EyeOutlined from '@ant-design/icons/EyeOutlined';
import EyeInvisibleOutlined from '@ant-design/icons/EyeInvisibleOutlined';
import ColumnWidthOutlined from '@ant-design/icons/ColumnWidthOutlined';

const { Text } = Typography;

// ── Types ───────────────────────────────────────────────

export interface ColumnConfig {
  /** Original column name from the query result */
  name: string;
  /** Data type from the query result */
  type: string;
  /** Whether the column is visible in the grid */
  visible: boolean;
}

export interface ColumnManagerProps {
  /** Column configs in display order */
  columns: ColumnConfig[];
  /** Called when column configs change (reorder, toggle visibility) */
  onChange: (columns: ColumnConfig[]) => void;
  /** Trigger element (rendered as children) */
  children: React.ReactNode;
}

// ── Helpers ─────────────────────────────────────────────

/** Swap two items in an array (immutable) */
function swap<T>(arr: T[], i: number, j: number): T[] {
  const next = [...arr];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

// ── Styles ──────────────────────────────────────────────

const PanelContainer = styled.div`
  width: 320px;
  max-height: 400px;
  display: flex;
  flex-direction: column;
`;

const PanelHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-bottom: 1px solid var(--gray-4, #f0f0f0);
`;

const ColumnList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 4px 0;
`;

const ColumnRow = styled.div<{ $dimmed?: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  transition: background 0.15s;
  opacity: ${(props) => (props.$dimmed ? 0.5 : 1)};

  &:hover {
    background: var(--gray-2, #fafafa);
  }
`;

const ColumnName = styled.span`
  flex: 1;
  font-size: 13px;
  color: var(--gray-9);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
`;

const ColumnType = styled(Text)`
  && {
    font-size: 11px;
    color: var(--gray-6);
    flex-shrink: 0;
    font-family: 'SFMono-Regular', Consolas, monospace;
  }
`;

const ArrowGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0;
  flex-shrink: 0;
`;

const ArrowBtn = styled(Button)`
  && {
    width: 18px;
    height: 14px;
    min-width: 18px;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 9px;
    border-radius: 2px;
  }
`;

const QuickActions = styled.div`
  display: flex;
  gap: 8px;
  padding: 8px 12px;
  border-top: 1px solid var(--gray-4, #f0f0f0);
`;

// ── Component ───────────────────────────────────────────

export default function ColumnManager(props: ColumnManagerProps) {
  const { columns, onChange, children } = props;
  const [visible, setVisible] = useState(false);

  const visibleCount = useMemo(
    () => columns.filter((c) => c.visible).length,
    [columns],
  );
  const allVisible = visibleCount === columns.length;
  const noneVisible = visibleCount === 0;

  const handleToggle = useCallback(
    (index: number) => {
      const next = columns.map((c, i) =>
        i === index ? { ...c, visible: !c.visible } : c,
      );
      onChange(next);
    },
    [columns, onChange],
  );

  const handleMoveUp = useCallback(
    (index: number) => {
      if (index <= 0) return;
      onChange(swap(columns, index, index - 1));
    },
    [columns, onChange],
  );

  const handleMoveDown = useCallback(
    (index: number) => {
      if (index >= columns.length - 1) return;
      onChange(swap(columns, index, index + 1));
    },
    [columns, onChange],
  );

  const handleShowAll = useCallback(() => {
    onChange(columns.map((c) => ({ ...c, visible: true })));
  }, [columns, onChange]);

  const handleHideAll = useCallback(() => {
    onChange(columns.map((c) => ({ ...c, visible: false })));
  }, [columns, onChange]);

  const handleToggleAll = useCallback(() => {
    if (allVisible) {
      handleHideAll();
    } else {
      handleShowAll();
    }
  }, [allVisible, handleShowAll, handleHideAll]);

  const content = (
    <PanelContainer>
      <PanelHeader>
        <Text strong style={{ fontSize: 13 }}>
          <ColumnWidthOutlined style={{ marginRight: 6 }} />
          Columns ({visibleCount}/{columns.length})
        </Text>
        <Checkbox
          checked={allVisible}
          indeterminate={!allVisible && !noneVisible}
          onChange={handleToggleAll}
        >
          <Text style={{ fontSize: 12 }}>All</Text>
        </Checkbox>
      </PanelHeader>

      <ColumnList>
        {columns.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="Run a query to see columns"
            style={{ margin: '20px 0' }}
          />
        ) : (
          columns.map((col, idx) => (
            <ColumnRow key={col.name} $dimmed={!col.visible}>
              <ArrowGroup>
                <ArrowBtn
                  type="text"
                  size="small"
                  icon={<UpOutlined />}
                  disabled={idx === 0}
                  onClick={() => handleMoveUp(idx)}
                />
                <ArrowBtn
                  type="text"
                  size="small"
                  icon={<DownOutlined />}
                  disabled={idx === columns.length - 1}
                  onClick={() => handleMoveDown(idx)}
                />
              </ArrowGroup>

              <Checkbox
                checked={col.visible}
                onChange={() => handleToggle(idx)}
              />

              <Tooltip title={col.name} mouseEnterDelay={0.5}>
                <ColumnName>{col.name}</ColumnName>
              </Tooltip>

              <ColumnType>{col.type}</ColumnType>
            </ColumnRow>
          ))
        )}
      </ColumnList>

      <QuickActions>
        <Button size="small" onClick={handleShowAll} disabled={allVisible}>
          <EyeOutlined /> Show all
        </Button>
        <Button size="small" onClick={handleHideAll} disabled={noneVisible}>
          <EyeInvisibleOutlined /> Hide all
        </Button>
      </QuickActions>
    </PanelContainer>
  );

  return (
    <Popover
      content={content}
      trigger="click"
      visible={visible}
      onVisibleChange={setVisible}
      placement="bottomRight"
      overlayStyle={{ padding: 0 }}
      destroyTooltipOnHide
    >
      {children}
    </Popover>
  );
}
