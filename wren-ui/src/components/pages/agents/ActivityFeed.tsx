import { useMemo } from 'react';
import { Timeline, Tag, Typography, Empty, Spin } from 'antd';
import {
  useAllAgentLogsQuery,
  AgentAuditLogFieldsFragment,
  AgentFieldsFragment,
} from '@/apollo/client/graphql/agents.generated';
import { getCompactTime } from '@/utils/time';

const { Text } = Typography;

const ACTION_COLORS: Record<string, string> = {
  CREATED: 'green',
  STARTED: 'blue',
  STOPPED: 'default',
  DELETED: 'red',
  UPDATED: 'orange',
  FAILED: 'red',
};

interface ActivityFeedProps {
  agents: AgentFieldsFragment[];
  limit?: number;
}

export default function ActivityFeed({ agents, limit = 30 }: ActivityFeedProps) {
  const { data, loading } = useAllAgentLogsQuery({
    variables: { limit },
    fetchPolicy: 'cache-and-network',
    pollInterval: 15000,
  });

  const agentMap = useMemo(() => {
    const map: Record<number, string> = {};
    for (const a of agents) map[a.id] = a.name;
    return map;
  }, [agents]);

  const logs = useMemo(
    () => [...(data?.allAgentLogs || [])].reverse(),
    [data],
  );

  if (loading && !data) return <Spin size="small" />;
  if (!logs.length) return <Empty description="No activity yet." />;

  const items = logs.map((log: AgentAuditLogFieldsFragment) => ({
    color: ACTION_COLORS[log.action] || 'gray',
    children: (
      <>
        <Text strong>{agentMap[log.agentId] || `Agent #${log.agentId}`}</Text>
        {' — '}
        <Tag color={ACTION_COLORS[log.action] || 'default'}>{log.action}</Tag>
        {log.detail && (
          <Text type="secondary" style={{ fontSize: 12 }}>
            {log.detail}
          </Text>
        )}
        <br />
        <Text type="secondary" style={{ fontSize: 12 }}>
          {getCompactTime(log.createdAt)}
        </Text>
      </>
    ),
  }));

  return <Timeline items={items} />;
}
