import { useRouter } from 'next/router';
import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import {
  Button,
  Input,
  List,
  Space,
  Tag,
  Typography,
  Spin,
  Empty,
  Tooltip,
  Popconfirm,
  Collapse,
  message,
} from 'antd';
import {
  SendOutlined,
  PlusOutlined,
  DeleteOutlined,
  ArrowLeftOutlined,
  RobotOutlined,
  UserOutlined,
  ToolOutlined,
  ClockCircleOutlined,
  InfoCircleOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import SiderLayout from '@/components/layouts/SiderLayout';
import PageLayout from '@/components/layouts/PageLayout';
import useProject from '@/hooks/useProject';
import { Path, buildPath } from '@/utils/enum';
import {
  useAgentChatSessionsQuery,
  useAgentChatMessagesQuery,
  useCreateChatSessionMutation,
  useSendChatMessageMutation,
  useDeleteChatSessionMutation,
  AgentChatMessageFieldsFragment,
  ReasoningStepFragment,
} from '@/apollo/client/graphql/agentChat.generated';
import {
  useAgentDefinitionQuery,
} from '@/apollo/client/graphql/agentDefinitions.generated';

const { Text, Title, Paragraph } = Typography;
const { TextArea } = Input;
const { Panel } = Collapse;

const ChatContainer = styled.div`
  display: flex;
  height: calc(100vh - 140px);
  overflow: hidden;
`;

const SessionSidebar = styled.div`
  width: 260px;
  border-right: 1px solid var(--gray-4);
  display: flex;
  flex-direction: column;
  background: var(--gray-1);
`;

const SessionList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 8px;
`;

const SessionItem = styled.div<{ $active?: boolean }>`
  padding: 10px 12px;
  border-radius: 6px;
  cursor: pointer;
  margin-bottom: 4px;
  background: ${({ $active }) => ($active ? 'var(--gray-3)' : 'transparent')};
  &:hover {
    background: var(--gray-3);
  }
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const ChatArea = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const MessageList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 16px 24px;
`;

const MessageBubble = styled.div<{ $role: string }>`
  display: flex;
  margin-bottom: 16px;
  flex-direction: ${({ $role }) =>
    $role === 'user' ? 'row-reverse' : 'row'};
  gap: 8px;
`;

const BubbleContent = styled.div<{ $role: string }>`
  max-width: 75%;
  padding: 12px 16px;
  border-radius: 12px;
  background: ${({ $role }) =>
    $role === 'user' ? 'var(--geekblue-1)' : 'var(--gray-2)'};
  border: 1px solid
    ${({ $role }) =>
      $role === 'user' ? 'var(--geekblue-3)' : 'var(--gray-4)'};
`;

const Avatar = styled.div<{ $role: string }>`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ $role }) =>
    $role === 'user' ? 'var(--geekblue-2)' : 'var(--gray-3)'};
  color: ${({ $role }) =>
    $role === 'user' ? 'var(--geekblue-6)' : 'var(--gray-8)'};
  flex-shrink: 0;
  font-size: 16px;
`;

const InputArea = styled.div`
  padding: 16px 24px;
  border-top: 1px solid var(--gray-4);
  background: var(--gray-1);
`;

const ToolCallBlock = styled.div`
  margin: 4px 0;
  padding: 8px 12px;
  border-radius: 6px;
  background: var(--gray-1);
  border: 1px solid var(--gray-4);
  font-size: 13px;
`;

const ReasoningBlock = styled.div`
  margin-top: 8px;
`;

const MetadataBar = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 6px;
  font-size: 12px;
  color: var(--gray-7);
`;

function formatDuration(ms: number | null): string {
  if (!ms) return '';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function ReasoningSteps({ steps }: { steps: ReasoningStepFragment[] }) {
  if (!steps || steps.length === 0) return null;

  return (
    <ReasoningBlock>
      <Collapse size="small" ghost>
        <Panel
          header={
            <Text type="secondary" style={{ fontSize: 12 }}>
              <SettingOutlined /> {steps.length} reasoning step
              {steps.length > 1 ? 's' : ''}
            </Text>
          }
          key="reasoning"
        >
          {steps.map((step, i) => (
            <div key={i} style={{ marginBottom: 8 }}>
              {step.type === 'tool_call' && (
                <ToolCallBlock>
                  <Space size={4}>
                    <ToolOutlined />
                    <Text strong style={{ fontSize: 13 }}>
                      {step.toolName}
                    </Text>
                    {step.durationMs && (
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        ({formatDuration(step.durationMs)})
                      </Text>
                    )}
                  </Space>
                  {step.toolInput && (
                    <pre
                      style={{
                        margin: '4px 0 0 0',
                        fontSize: 12,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-all',
                        background: 'var(--gray-2)',
                        padding: 6,
                        borderRadius: 4,
                      }}
                    >
                      {step.toolInput}
                    </pre>
                  )}
                  {step.toolOutput && (
                    <pre
                      style={{
                        margin: '4px 0 0 0',
                        fontSize: 12,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-all',
                        background: 'var(--gray-2)',
                        padding: 6,
                        borderRadius: 4,
                        maxHeight: 200,
                        overflow: 'auto',
                      }}
                    >
                      {step.toolOutput}
                    </pre>
                  )}
                </ToolCallBlock>
              )}
              {step.type === 'thinking' && (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  💭 {step.content}
                </Text>
              )}
            </div>
          ))}
        </Panel>
      </Collapse>
    </ReasoningBlock>
  );
}

function ChatMessage({ msg }: { msg: AgentChatMessageFieldsFragment }) {
  if (msg.role === 'system' || msg.role === 'tool') return null;

  return (
    <MessageBubble $role={msg.role}>
      <Avatar $role={msg.role}>
        {msg.role === 'user' ? <UserOutlined /> : <RobotOutlined />}
      </Avatar>
      <BubbleContent $role={msg.role}>
        {msg.status === 'error' ? (
          <Text type="danger">{msg.error || 'An error occurred'}</Text>
        ) : msg.content ? (
          <Paragraph
            style={{ margin: 0, whiteSpace: 'pre-wrap' }}
          >
            {msg.content}
          </Paragraph>
        ) : msg.status === 'pending' ? (
          <Spin size="small" />
        ) : null}

        {msg.reasoningSteps && msg.reasoningSteps.length > 0 && (
          <ReasoningSteps steps={msg.reasoningSteps} />
        )}

        {msg.metadata && (
          <MetadataBar>
            {msg.metadata.model && (
              <Tooltip title="Model">
                <Space size={2}>
                  <InfoCircleOutlined />
                  {msg.metadata.model}
                </Space>
              </Tooltip>
            )}
            {msg.metadata.durationMs && (
              <Tooltip title="Response time">
                <Space size={2}>
                  <ClockCircleOutlined />
                  {formatDuration(msg.metadata.durationMs)}
                </Space>
              </Tooltip>
            )}
            {msg.metadata.usage && (
              <Tooltip
                title={`Prompt: ${msg.metadata.usage.prompt_tokens || '?'}, Completion: ${msg.metadata.usage.completion_tokens || '?'}`}
              >
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {msg.metadata.usage.total_tokens || '?'} tokens
                </Text>
              </Tooltip>
            )}
          </MetadataBar>
        )}
      </BubbleContent>
    </MessageBubble>
  );
}

export default function AgentChatPage() {
  const router = useRouter();
  const { currentProjectId } = useProject();
  const agentId = Number(router.query.agentId);
  const messageListRef = useRef<HTMLDivElement>(null);
  const [inputValue, setInputValue] = useState('');
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [sending, setSending] = useState(false);

  // Load agent definition
  const { data: agentData } = useAgentDefinitionQuery({
    variables: { where: { id: agentId } },
    skip: !agentId,
  });
  const agent = agentData?.agentDefinition;

  // Load sessions for this agent
  const {
    data: sessionsData,
    refetch: refetchSessions,
  } = useAgentChatSessionsQuery({
    variables: { agentDefinitionId: agentId },
    skip: !agentId,
  });
  const sessions = sessionsData?.agentChatSessions || [];

  // Load messages for active session
  const {
    data: messagesData,
    refetch: refetchMessages,
  } = useAgentChatMessagesQuery({
    variables: { sessionId: activeSessionId! },
    skip: !activeSessionId,
  });
  const messages = messagesData?.agentChatMessages || [];

  // Mutations
  const [createSession] = useCreateChatSessionMutation();
  const [sendMessage] = useSendChatMessageMutation();
  const [deleteSession] = useDeleteChatSessionMutation();

  // Auto-select first session
  useEffect(() => {
    if (sessions.length > 0 && !activeSessionId) {
      setActiveSessionId(sessions[0].id);
    }
  }, [sessions, activeSessionId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  }, [messages]);

  const handleNewSession = async () => {
    try {
      const { data } = await createSession({
        variables: { agentDefinitionId: agentId },
      });
      if (data?.createChatSession) {
        setActiveSessionId(data.createChatSession.id);
        await refetchSessions();
      }
    } catch (err: any) {
      message.error(err.message || 'Failed to create session');
    }
  };

  const handleDeleteSession = async (sessionId: number) => {
    try {
      await deleteSession({ variables: { sessionId } });
      if (activeSessionId === sessionId) {
        setActiveSessionId(null);
      }
      await refetchSessions();
      message.success('Session deleted');
    } catch (err: any) {
      message.error(err.message || 'Failed to delete session');
    }
  };

  const handleSend = async () => {
    const content = inputValue.trim();
    if (!content || !activeSessionId || sending) return;

    setInputValue('');
    setSending(true);

    try {
      await sendMessage({
        variables: { sessionId: activeSessionId, content },
      });
      await refetchMessages();
      await refetchSessions(); // title may have updated
    } catch (err: any) {
      message.error(err.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const backPath = buildPath(Path.AgentBuilderAgents, currentProjectId);

  const titleNode = (
    <Space>
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={() => router.push(backPath)}
        size="small"
      />
      <span>Chat — {agent?.name || 'Agent'}</span>
    </Space>
  );

  return (
    <SiderLayout>
      <PageLayout title={titleNode}>
        <ChatContainer>
          {/* Session sidebar */}
          <SessionSidebar>
            <div style={{ padding: '12px 8px 8px' }}>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                block
                onClick={handleNewSession}
              >
                New Session
              </Button>
            </div>
            <SessionList>
              {sessions.length === 0 ? (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="No sessions yet"
                  style={{ marginTop: 40 }}
                />
              ) : (
                sessions.map((session) => (
                  <SessionItem
                    key={session.id}
                    $active={session.id === activeSessionId}
                    onClick={() => setActiveSessionId(session.id)}
                  >
                    <Text
                      ellipsis
                      style={{ flex: 1, fontSize: 13 }}
                      title={session.title}
                    >
                      {session.title}
                    </Text>
                    <Popconfirm
                      title="Delete this session?"
                      onConfirm={(e) => {
                        e?.stopPropagation();
                        handleDeleteSession(session.id);
                      }}
                      onCancel={(e) => e?.stopPropagation()}
                    >
                      <Button
                        type="text"
                        size="small"
                        icon={<DeleteOutlined />}
                        onClick={(e) => e.stopPropagation()}
                        style={{ opacity: 0.6 }}
                      />
                    </Popconfirm>
                  </SessionItem>
                ))
              )}
            </SessionList>
          </SessionSidebar>

          {/* Chat area */}
          <ChatArea>
            {!activeSessionId ? (
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Empty description="Select or create a session to start chatting" />
              </div>
            ) : (
              <>
                <MessageList ref={messageListRef}>
                  {messages
                    .filter((m) => m.role !== 'system' && m.role !== 'tool')
                    .map((msg) => (
                      <ChatMessage key={msg.id} msg={msg} />
                    ))}
                  {sending && (
                    <MessageBubble $role="assistant">
                      <Avatar $role="assistant">
                        <RobotOutlined />
                      </Avatar>
                      <BubbleContent $role="assistant">
                        <Spin size="small" />
                        <Text
                          type="secondary"
                          style={{ marginLeft: 8, fontSize: 13 }}
                        >
                          Thinking...
                        </Text>
                      </BubbleContent>
                    </MessageBubble>
                  )}
                </MessageList>

                <InputArea>
                  <Space.Compact style={{ width: '100%' }}>
                    <TextArea
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Type a message... (Shift+Enter for newline)"
                      autoSize={{ minRows: 1, maxRows: 4 }}
                      disabled={sending}
                      style={{ borderRadius: '6px 0 0 6px' }}
                    />
                    <Button
                      type="primary"
                      icon={<SendOutlined />}
                      onClick={handleSend}
                      loading={sending}
                      style={{ height: 'auto', borderRadius: '0 6px 6px 0' }}
                    >
                      Send
                    </Button>
                  </Space.Compact>
                </InputArea>
              </>
            )}
          </ChatArea>
        </ChatContainer>
      </PageLayout>
    </SiderLayout>
  );
}
