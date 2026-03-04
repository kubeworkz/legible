import { useCallback } from 'react';
import styled from 'styled-components';
import { Drawer, Timeline, Button, Tag, Typography, Empty, Spin, Tooltip, Popconfirm } from 'antd';
import HistoryOutlined from '@ant-design/icons/HistoryOutlined';
import RollbackOutlined from '@ant-design/icons/RollbackOutlined';
import CheckCircleOutlined from '@ant-design/icons/CheckCircleOutlined';

const { Text, Paragraph } = Typography;

// ── Types ───────────────────────────────────────────────

export interface HistoryEntry {
  id: number;
  spreadsheetId: number;
  version: number;
  changeType: string;
  sourceSql: string | null;
  columnsMetadata: string | null;
  changeSummary: string | null;
  createdAt: string;
}

export interface SpreadsheetHistoryDrawerProps {
  visible: boolean;
  onClose: () => void;
  entries: HistoryEntry[];
  loading?: boolean;
  onRestore?: (historyId: number) => void;
  restoringId?: number | null;
}

// ── Styles ──────────────────────────────────────────────

const DrawerContent = styled.div`
  padding: 0 4px;
`;

const EntryCard = styled.div<{ $active?: boolean }>`
  padding: 8px 12px;
  border: 1px solid var(--gray-4, #d9d9d9);
  border-radius: 6px;
  margin-bottom: 4px;
  background: ${(props) => (props.$active ? 'var(--geekblue-1, #f0f5ff)' : 'white')};
  transition: background 0.15s;

  &:hover {
    background: var(--gray-2, #fafafa);
  }
`;

const EntryHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
`;

const VersionLabel = styled(Text)`
  && {
    font-weight: 600;
    font-size: 13px;
  }
`;

const TimeLabel = styled(Text)`
  && {
    font-size: 11px;
    color: var(--gray-6, #bfbfbf);
  }
`;

const SqlPreview = styled(Paragraph)`
  && {
    font-family: 'SFMono-Regular', Consolas, monospace;
    font-size: 11px;
    color: var(--gray-7, #8c8c8c);
    margin: 4px 0 0;
    max-height: 60px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: pre-wrap;
    word-break: break-all;
    background: var(--gray-2, #fafafa);
    padding: 4px 6px;
    border-radius: 4px;
  }
`;

// ── Helpers ─────────────────────────────────────────────

function changeTypeTag(changeType: string) {
  switch (changeType) {
    case 'created':
      return <Tag color="green">Created</Tag>;
    case 'restored':
      return <Tag color="orange">Restored</Tag>;
    case 'saved':
    default:
      return <Tag color="blue">Saved</Tag>;
  }
}

function formatTime(isoStr: string) {
  try {
    const d = new Date(isoStr);
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoStr;
  }
}

// ── Component ───────────────────────────────────────────

export default function SpreadsheetHistoryDrawer(props: SpreadsheetHistoryDrawerProps) {
  const { visible, onClose, entries, loading, onRestore, restoringId } = props;

  const handleRestore = useCallback(
    (historyId: number) => {
      if (onRestore) onRestore(historyId);
    },
    [onRestore],
  );

  return (
    <Drawer
      title={
        <span>
          <HistoryOutlined style={{ marginRight: 8 }} />
          Version History
        </span>
      }
      placement="right"
      width={480}
      open={visible}
      onClose={onClose}
      mask={false}
      bodyStyle={{ padding: '12px 16px' }}
    >
      <DrawerContent>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Spin tip="Loading history..." />
          </div>
        ) : entries.length === 0 ? (
          <Empty
            description="No history yet. Save your spreadsheet to create the first version."
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          <Timeline>
            {entries.map((entry, idx) => (
              <Timeline.Item
                key={entry.id}
                color={idx === 0 ? 'blue' : 'gray'}
                dot={idx === 0 ? <CheckCircleOutlined style={{ fontSize: 14 }} /> : undefined}
              >
                <EntryCard $active={idx === 0}>
                  <EntryHeader>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <VersionLabel>v{entry.version}</VersionLabel>
                      {changeTypeTag(entry.changeType)}
                    </div>
                    {idx > 0 && onRestore && (
                      <Popconfirm
                        title="Restore this version? This will overwrite the current SQL and column settings."
                        onConfirm={() => handleRestore(entry.id)}
                        okText="Restore"
                        cancelText="Cancel"
                      >
                        <Tooltip title="Restore this version">
                          <Button
                            type="text"
                            size="small"
                            icon={<RollbackOutlined />}
                            loading={restoringId === entry.id}
                          />
                        </Tooltip>
                      </Popconfirm>
                    )}
                    {idx === 0 && (
                      <Tag color="green" style={{ margin: 0 }}>Current</Tag>
                    )}
                  </EntryHeader>
                  <TimeLabel>{formatTime(entry.createdAt)}</TimeLabel>
                  {entry.changeSummary && (
                    <div style={{ fontSize: 12, marginTop: 2 }}>{entry.changeSummary}</div>
                  )}
                  {entry.sourceSql && (
                    <SqlPreview ellipsis={{ rows: 3 }}>
                      {entry.sourceSql}
                    </SqlPreview>
                  )}
                </EntryCard>
              </Timeline.Item>
            ))}
          </Timeline>
        )}
      </DrawerContent>
    </Drawer>
  );
}
