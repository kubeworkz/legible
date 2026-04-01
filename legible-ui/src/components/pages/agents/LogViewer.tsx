import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Button,
  Input,
  Select,
  Space,
  Switch,
  Tag,
  Typography,
} from 'antd';
import styled from 'styled-components';
import ClearOutlined from '@ant-design/icons/ClearOutlined';
import PauseCircleOutlined from '@ant-design/icons/PauseCircleOutlined';
import PlayCircleOutlined from '@ant-design/icons/PlayCircleOutlined';
import VerticalAlignBottomOutlined from '@ant-design/icons/VerticalAlignBottomOutlined';
import {
  AgentAuditLogFieldsFragment,
  useAgentLogsQuery,
} from '@/apollo/client/graphql/agents.generated';
import { getCompactTime } from '@/utils/time';

const { Text } = Typography;

const ACTION_COLORS: Record<string, string> = {
  CREATED: '#52c41a',
  STARTED: '#1890ff',
  STOPPED: '#faad14',
  DELETED: '#ff4d4f',
  UPDATED: '#8c8c8c',
  FAILED: '#ff4d4f',
};

const Terminal = styled.div`
  background: #1e1e1e;
  border-radius: 6px;
  padding: 0;
  font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.6;
  position: relative;
`;

const TerminalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: #2d2d2d;
  border-radius: 6px 6px 0 0;
  border-bottom: 1px solid #3a3a3a;
`;

const TerminalBody = styled.div`
  height: 400px;
  overflow-y: auto;
  padding: 8px 12px;

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    background: #1e1e1e;
  }
  &::-webkit-scrollbar-thumb {
    background: #555;
    border-radius: 3px;
  }
`;

const LogLine = styled.div`
  display: flex;
  gap: 8px;
  padding: 1px 0;
  &:hover {
    background: rgba(255, 255, 255, 0.04);
  }
`;

const Timestamp = styled.span`
  color: #6a9955;
  white-space: nowrap;
  flex-shrink: 0;
`;

const Action = styled.span<{ $color: string }>`
  color: ${(p) => p.$color};
  font-weight: 600;
  width: 72px;
  flex-shrink: 0;
`;

const Detail = styled.span`
  color: #d4d4d4;
  word-break: break-word;
`;

interface LogViewerProps {
  agentId: number;
}

export default function LogViewer({ agentId }: LogViewerProps) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [filter, setFilter] = useState('');
  const [actionFilter, setActionFilter] = useState<string | undefined>();

  const { data, previousData } = useAgentLogsQuery({
    variables: { where: { id: agentId }, limit: 200 },
    fetchPolicy: 'cache-and-network',
    pollInterval: paused ? 0 : 3000,
  });

  const logs = useMemo(
    () => data?.agentLogs || previousData?.agentLogs || [],
    [data, previousData],
  );

  const filteredLogs = useMemo(() => {
    let result = logs;
    if (actionFilter) {
      result = result.filter((l) => l.action === actionFilter);
    }
    if (filter) {
      const q = filter.toLowerCase();
      result = result.filter(
        (l) =>
          l.action.toLowerCase().includes(q) ||
          (l.detail && l.detail.toLowerCase().includes(q)),
      );
    }
    return result;
  }, [logs, filter, actionFilter]);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [filteredLogs, autoScroll]);

  // Detect manual scroll to auto-disable auto-scroll
  const handleScroll = useCallback(() => {
    if (!bodyRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = bodyRef.current;
    const atBottom = scrollHeight - scrollTop - clientHeight < 30;
    setAutoScroll(atBottom);
  }, []);

  const scrollToBottom = () => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
      setAutoScroll(true);
    }
  };

  const actionOptions = useMemo(() => {
    const actions = new Set<string>();
    for (const l of logs) actions.add(l.action);
    return Array.from(actions)
      .sort()
      .map((a) => ({ label: a, value: a }));
  }, [logs]);

  return (
    <Terminal>
      <TerminalHeader>
        <Space size={8}>
          <Text style={{ color: '#ccc', fontSize: 12, fontWeight: 600 }}>
            Live Logs
          </Text>
          {!paused && (
            <Tag
              color="green"
              style={{ fontSize: 10, lineHeight: '16px', margin: 0 }}
            >
              ● streaming
            </Tag>
          )}
          {paused && (
            <Tag
              color="orange"
              style={{ fontSize: 10, lineHeight: '16px', margin: 0 }}
            >
              paused
            </Tag>
          )}
          <Text style={{ color: '#888', fontSize: 11 }}>
            {filteredLogs.length} entries
          </Text>
        </Space>
        <Space size={6}>
          <Input
            size="small"
            placeholder="Filter…"
            allowClear
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{ width: 140, background: '#2d2d2d', borderColor: '#555', color: '#ccc' }}
          />
          <Select
            size="small"
            placeholder="Action"
            allowClear
            value={actionFilter}
            onChange={setActionFilter}
            options={actionOptions}
            style={{ width: 110 }}
            popupMatchSelectWidth={false}
          />
          <Button
            size="small"
            type="text"
            icon={
              paused ? (
                <PlayCircleOutlined style={{ color: '#52c41a' }} />
              ) : (
                <PauseCircleOutlined style={{ color: '#faad14' }} />
              )
            }
            onClick={() => setPaused((p) => !p)}
            title={paused ? 'Resume' : 'Pause'}
          />
          <Button
            size="small"
            type="text"
            icon={<VerticalAlignBottomOutlined style={{ color: '#ccc' }} />}
            onClick={scrollToBottom}
            title="Scroll to bottom"
          />
        </Space>
      </TerminalHeader>
      <TerminalBody ref={bodyRef} onScroll={handleScroll}>
        {filteredLogs.length === 0 && (
          <Text style={{ color: '#666' }}>
            {logs.length === 0
              ? 'Waiting for log entries…'
              : 'No entries match the current filter.'}
          </Text>
        )}
        {filteredLogs.map((log: AgentAuditLogFieldsFragment) => (
          <LogLine key={log.id}>
            <Timestamp>{getCompactTime(log.createdAt)}</Timestamp>
            <Action $color={ACTION_COLORS[log.action] || '#8c8c8c'}>
              [{log.action}]
            </Action>
            <Detail>{log.detail || '—'}</Detail>
          </LogLine>
        ))}
      </TerminalBody>
    </Terminal>
  );
}
