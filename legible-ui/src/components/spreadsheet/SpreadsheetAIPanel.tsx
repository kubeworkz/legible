import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import styled from 'styled-components';
import { Button, Input, Tooltip, Spin, Tag, Typography, Space } from 'antd';
import SendOutlined from '@ant-design/icons/SendOutlined';
import CloseOutlined from '@ant-design/icons/CloseOutlined';
import RobotOutlined from '@ant-design/icons/RobotOutlined';
import UserOutlined from '@ant-design/icons/UserOutlined';
import ThunderboltOutlined from '@ant-design/icons/ThunderboltOutlined';
import CodeOutlined from '@ant-design/icons/CodeOutlined';
import CheckCircleOutlined from '@ant-design/icons/CheckCircleOutlined';
import ExclamationCircleOutlined from '@ant-design/icons/ExclamationCircleOutlined';
import LoadingOutlined from '@ant-design/icons/LoadingOutlined';
import DeleteOutlined from '@ant-design/icons/DeleteOutlined';
import {
  AskingTaskStatus,
  AskingTaskType,
} from '@/apollo/client/graphql/__types__';
import {
  useCreateAskingTaskMutation,
  useAskingTaskLazyQuery,
  useCancelAskingTaskMutation,
} from '@/apollo/client/graphql/home.generated';

const { Text, Paragraph } = Typography;
const { TextArea } = Input;

// ── Types ───────────────────────────────────────────────

interface Candidate {
  sql: string;
  type: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  status?: 'pending' | 'processing' | 'finished' | 'failed' | 'stopped';
  taskType?: AskingTaskType;
  taskStatus?: AskingTaskStatus;
  candidates?: Candidate[];
  error?: string;
  appliedSql?: string;
  rephrasedQuestion?: string;
  intentReasoning?: string;
  sqlReasoning?: string;
}

export interface SpreadsheetAIPanelProps {
  visible: boolean;
  onClose: () => void;
  currentSql?: string;
  onApplySql?: (sql: string) => void;
  spreadsheetName?: string;
}

// ── Styles ──────────────────────────────────────────────

const PanelContainer = styled.div<{ $visible: boolean }>`
  display: ${(p) => (p.$visible ? 'flex' : 'none')};
  flex-direction: column;
  width: 420px;
  min-width: 420px;
  height: 100%;
  border-left: 1px solid var(--gray-4, #d9d9d9);
  background: #fff;
  overflow: hidden;
`;

const PanelHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--gray-4, #d9d9d9);
  background: var(--gray-1, #ffffff);
  flex-shrink: 0;

  .header-left {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    font-weight: 600;
    color: var(--gray-9);
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 4px;
  }
`;

const MessagesContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const WelcomeMessage = styled.div`
  text-align: center;
  padding: 40px 20px;
  color: var(--gray-6);

  .welcome-icon {
    font-size: 48px;
    color: var(--geekblue-4, #85a5ff);
    margin-bottom: 16px;
  }

  h3 {
    font-size: 16px;
    font-weight: 600;
    color: var(--gray-8);
    margin-bottom: 8px;
  }

  p {
    font-size: 13px;
    color: var(--gray-6);
    line-height: 1.6;
    margin-bottom: 16px;
  }
`;

const SuggestionChip = styled.div`
  display: inline-block;
  padding: 6px 12px;
  background: var(--gray-2, #fafafa);
  border: 1px solid var(--gray-4, #d9d9d9);
  border-radius: 16px;
  font-size: 12px;
  color: var(--gray-8);
  cursor: pointer;
  transition: all 0.2s;
  margin: 4px;

  &:hover {
    background: var(--geekblue-1, #f0f5ff);
    border-color: var(--geekblue-4, #85a5ff);
    color: var(--geekblue-6, #2f54eb);
  }
`;

const MessageBubble = styled.div<{ $role: 'user' | 'assistant' }>`
  display: flex;
  gap: 10px;
  align-items: flex-start;

  ${(p) =>
    p.$role === 'user'
      ? `flex-direction: row-reverse;`
      : `flex-direction: row;`}
`;

const Avatar = styled.div<{ $role: 'user' | 'assistant' }>`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 14px;

  ${(p) =>
    p.$role === 'user'
      ? `
    background: var(--geekblue-1, #f0f5ff);
    color: var(--geekblue-6, #2f54eb);
  `
      : `
    background: var(--purple-1, #f9f0ff);
    color: var(--purple-6, #722ed1);
  `}
`;

const BubbleContent = styled.div<{ $role: 'user' | 'assistant' }>`
  max-width: 320px;
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 13px;
  line-height: 1.6;
  word-break: break-word;

  ${(p) =>
    p.$role === 'user'
      ? `
    background: var(--geekblue-1, #f0f5ff);
    color: var(--gray-9);
    border-bottom-right-radius: 4px;
  `
      : `
    background: var(--gray-2, #fafafa);
    color: var(--gray-9);
    border-bottom-left-radius: 4px;
  `}
`;

const StatusIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 0;
  font-size: 12px;
  color: var(--gray-6);
`;

const SqlPreview = styled.div`
  margin-top: 8px;
  padding: 8px 12px;
  background: var(--gray-3, #f5f5f5);
  border-radius: 6px;
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: 11px;
  line-height: 1.5;
  color: var(--gray-8);
  max-height: 120px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-all;
`;

const CandidateActions = styled.div`
  display: flex;
  gap: 6px;
  margin-top: 8px;
  flex-wrap: wrap;
`;

const InputArea = styled.div`
  padding: 12px 16px;
  border-top: 1px solid var(--gray-4, #d9d9d9);
  background: var(--gray-1, #ffffff);
  flex-shrink: 0;
`;

const InputRow = styled.div`
  display: flex;
  gap: 8px;
  align-items: flex-end;
`;

const ContextBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 0;
  margin-bottom: 4px;
  font-size: 11px;
  color: var(--gray-6);

  .ant-tag {
    font-size: 11px;
    line-height: 18px;
    margin: 0;
  }
`;

// ── Helpers ─────────────────────────────────────────────

const getStatusLabel = (status?: AskingTaskStatus): string => {
  switch (status) {
    case AskingTaskStatus.UNDERSTANDING:
      return 'Understanding your question...';
    case AskingTaskStatus.SEARCHING:
      return 'Searching relevant data models...';
    case AskingTaskStatus.PLANNING:
      return 'Planning query strategy...';
    case AskingTaskStatus.GENERATING:
      return 'Generating SQL...';
    case AskingTaskStatus.CORRECTING:
      return 'Validating and correcting SQL...';
    default:
      return 'Processing...';
  }
};

const isTerminal = (status?: AskingTaskStatus): boolean =>
  status === AskingTaskStatus.FINISHED ||
  status === AskingTaskStatus.FAILED ||
  status === AskingTaskStatus.STOPPED;

let _nextId = 1;
const nextMessageId = () => `msg-${_nextId++}`;

// ── Component ───────────────────────────────────────────

export default function SpreadsheetAIPanel(props: SpreadsheetAIPanelProps) {
  const { visible, onClose, currentSql, onApplySql, spreadsheetName } = props;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Apollo hooks
  const [createAskingTask] = useCreateAskingTaskMutation();
  const [fetchAskingTask] = useAskingTaskLazyQuery({
    fetchPolicy: 'network-only',
  });
  const [cancelAskingTask] = useCancelAskingTaskMutation();

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const isProcessing = useMemo(
    () => messages.some((m) => m.status === 'processing' || m.status === 'pending'),
    [messages],
  );

  // Poll for asking task results
  const startPolling = useCallback(
    (taskId: string, assistantMsgId: string) => {
      if (pollingRef.current) clearInterval(pollingRef.current);

      pollingRef.current = setInterval(async () => {
        try {
          const { data } = await fetchAskingTask({
            variables: { taskId },
          });
          const task = data?.askingTask;
          if (!task) return;

          setMessages((prev) =>
            prev.map((m) => {
              if (m.id !== assistantMsgId) return m;
              const updated: ChatMessage = {
                ...m,
                taskStatus: task.status,
                taskType: task.type ?? undefined,
                rephrasedQuestion: task.rephrasedQuestion ?? undefined,
                intentReasoning: task.intentReasoning ?? undefined,
                sqlReasoning: task.sqlGenerationReasoning ?? undefined,
              };

              if (task.status === AskingTaskStatus.FINISHED) {
                updated.status = 'finished';
                if (task.type === AskingTaskType.TEXT_TO_SQL && task.candidates?.length) {
                  updated.candidates = task.candidates.map((c) => ({
                    sql: c.sql,
                    type: c.type,
                  }));
                  updated.content = `I found ${task.candidates.length} SQL ${task.candidates.length === 1 ? 'query' : 'queries'} that can answer your question.`;
                  if (task.rephrasedQuestion) {
                    updated.content = `**Rephrased:** ${task.rephrasedQuestion}\n\n${updated.content}`;
                  }
                } else if (task.type === AskingTaskType.GENERAL) {
                  updated.content =
                    'This appears to be a general question. I can best help with data-related questions that can be answered with SQL queries.';
                } else if (task.type === AskingTaskType.MISLEADING_QUERY) {
                  updated.content =
                    "I'm not sure how to interpret that question. Could you rephrase it or ask something more specific about your data?";
                } else {
                  updated.content = 'No results found. Try rephrasing your question.';
                }
              } else if (task.status === AskingTaskStatus.FAILED) {
                updated.status = 'failed';
                updated.content =
                  task.error?.message || 'Something went wrong. Please try again.';
                updated.error = task.error?.message ?? undefined;
              } else if (task.status === AskingTaskStatus.STOPPED) {
                updated.status = 'stopped';
                updated.content = 'Task was cancelled.';
              } else {
                updated.status = 'processing';
                updated.content = getStatusLabel(task.status);
              }

              return updated;
            }),
          );

          if (isTerminal(task.status)) {
            if (pollingRef.current) clearInterval(pollingRef.current);
            pollingRef.current = null;
            setCurrentTaskId(null);
          }
        } catch {
          // Silently retry on next interval
        }
      }, 1500);
    },
    [fetchAskingTask],
  );

  // Submit a question
  const handleSubmit = useCallback(
    async (question?: string) => {
      const q = (question || inputValue).trim();
      if (!q || isProcessing) return;

      setInputValue('');

      // Add user message
      const userMsg: ChatMessage = {
        id: nextMessageId(),
        role: 'user',
        content: q,
        timestamp: new Date(),
      };

      // Add placeholder assistant message
      const assistantMsg: ChatMessage = {
        id: nextMessageId(),
        role: 'assistant',
        content: 'Understanding your question...',
        timestamp: new Date(),
        status: 'pending',
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);

      try {
        const result = await createAskingTask({
          variables: { data: { question: q } },
        });

        const taskId = result.data?.createAskingTask?.id;
        if (!taskId) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsg.id
                ? { ...m, status: 'failed' as const, content: 'Failed to create task.' }
                : m,
            ),
          );
          return;
        }

        setCurrentTaskId(taskId);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsg.id
              ? { ...m, status: 'processing' as const }
              : m,
          ),
        );

        startPolling(taskId, assistantMsg.id);
      } catch (err: any) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsg.id
              ? {
                  ...m,
                  status: 'failed' as const,
                  content: err?.message || 'Failed to submit question.',
                }
              : m,
          ),
        );
      }
    },
    [inputValue, isProcessing, createAskingTask, startPolling],
  );

  const handleCancel = useCallback(async () => {
    if (currentTaskId) {
      try {
        await cancelAskingTask({ variables: { taskId: currentTaskId } });
      } catch {
        // ignore
      }
      if (pollingRef.current) clearInterval(pollingRef.current);
      pollingRef.current = null;
      setCurrentTaskId(null);
    }
  }, [currentTaskId, cancelAskingTask]);

  const handleApplySql = useCallback(
    (sql: string, msgId: string) => {
      if (onApplySql) onApplySql(sql);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId ? { ...m, appliedSql: sql } : m,
        ),
      );
    },
    [onApplySql],
  );

  const handleClearChat = useCallback(() => {
    if (isProcessing) return;
    setMessages([]);
  }, [isProcessing]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  // ── Suggestions based on context ──────────────────────
  const suggestions = useMemo(() => {
    const items: string[] = [];
    if (currentSql) {
      items.push('Summarize this query');
      items.push('Show top 10 records');
      items.push('Add a filter for today');
    } else {
      items.push('Show all customers');
      items.push('What tables are available?');
      items.push('Revenue by month');
    }
    return items;
  }, [currentSql]);

  // ── Render ────────────────────────────────────────────

  return (
    <PanelContainer $visible={visible}>
      <PanelHeader>
        <div className="header-left">
          <ThunderboltOutlined style={{ color: 'var(--purple-5, #9254de)' }} />
          AI Assistant
        </div>
        <div className="header-right">
          <Tooltip title="Clear chat">
            <Button
              type="text"
              size="small"
              icon={<DeleteOutlined />}
              onClick={handleClearChat}
              disabled={messages.length === 0 || isProcessing}
            />
          </Tooltip>
          <Tooltip title="Close">
            <Button
              type="text"
              size="small"
              icon={<CloseOutlined />}
              onClick={onClose}
            />
          </Tooltip>
        </div>
      </PanelHeader>

      <MessagesContainer>
        {messages.length === 0 && (
          <WelcomeMessage>
            <div className="welcome-icon">
              <RobotOutlined />
            </div>
            <h3>Ask about your data</h3>
            <p>
              Ask questions in natural language and I&apos;ll generate SQL
              queries you can apply directly to your spreadsheet.
            </p>
            <div>
              {suggestions.map((s) => (
                <SuggestionChip
                  key={s}
                  onClick={() => handleSubmit(s)}
                >
                  {s}
                </SuggestionChip>
              ))}
            </div>
          </WelcomeMessage>
        )}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} $role={msg.role}>
            <Avatar $role={msg.role}>
              {msg.role === 'user' ? <UserOutlined /> : <RobotOutlined />}
            </Avatar>
            <BubbleContent $role={msg.role}>
              {/* Status indicator for processing */}
              {msg.status === 'processing' && (
                <StatusIndicator>
                  <LoadingOutlined spin />
                  <span>{msg.content}</span>
                </StatusIndicator>
              )}

              {msg.status === 'pending' && (
                <StatusIndicator>
                  <Spin size="small" />
                  <span>Connecting...</span>
                </StatusIndicator>
              )}

              {/* Normal content */}
              {msg.status !== 'processing' && msg.status !== 'pending' && (
                <Paragraph
                  style={{ margin: 0, fontSize: 13, whiteSpace: 'pre-wrap' }}
                >
                  {msg.content}
                </Paragraph>
              )}

              {/* Failed indicator */}
              {msg.status === 'failed' && (
                <StatusIndicator style={{ color: 'var(--red-5, #ff4d4f)' }}>
                  <ExclamationCircleOutlined />
                  <span>Failed</span>
                </StatusIndicator>
              )}

              {/* SQL candidates */}
              {msg.candidates && msg.candidates.length > 0 && (
                <>
                  {msg.candidates.map((candidate, idx) => (
                    <div key={idx}>
                      <SqlPreview>{candidate.sql}</SqlPreview>
                      <CandidateActions>
                        {msg.appliedSql === candidate.sql ? (
                          <Tag
                            color="success"
                            icon={<CheckCircleOutlined />}
                            style={{ margin: 0 }}
                          >
                            Applied
                          </Tag>
                        ) : (
                          <Button
                            type="primary"
                            size="small"
                            icon={<CodeOutlined />}
                            onClick={() => handleApplySql(candidate.sql, msg.id)}
                          >
                            Apply SQL
                          </Button>
                        )}
                        <Tag
                          style={{ margin: 0, fontSize: 11 }}
                          color={
                            candidate.type === 'LLM'
                              ? 'purple'
                              : candidate.type === 'VIEW'
                              ? 'blue'
                              : 'green'
                          }
                        >
                          {candidate.type}
                        </Tag>
                      </CandidateActions>
                    </div>
                  ))}
                </>
              )}

              {/* Reasoning (expandable) */}
              {msg.status === 'finished' && msg.sqlReasoning && (
                <details style={{ marginTop: 8, fontSize: 11, color: 'var(--gray-6)' }}>
                  <summary style={{ cursor: 'pointer' }}>Show reasoning</summary>
                  <p style={{ marginTop: 4, whiteSpace: 'pre-wrap' }}>
                    {msg.sqlReasoning}
                  </p>
                </details>
              )}
            </BubbleContent>
          </MessageBubble>
        ))}

        {/* Cancel button during processing */}
        {isProcessing && (
          <div style={{ textAlign: 'center' }}>
            <Button size="small" onClick={handleCancel}>
              Cancel
            </Button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </MessagesContainer>

      <InputArea>
        {currentSql && (
          <ContextBadge>
            <CodeOutlined />
            <Text type="secondary" style={{ fontSize: 11 }}>
              Context:
            </Text>
            <Tag color="default" style={{ fontSize: 11, lineHeight: '18px', margin: 0 }}>
              {spreadsheetName || 'Current SQL'}
            </Tag>
          </ContextBadge>
        )}
        <InputRow>
          <TextArea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your data..."
            autoSize={{ minRows: 1, maxRows: 4 }}
            disabled={isProcessing}
            style={{ borderRadius: 8, resize: 'none' }}
          />
          <Tooltip title="Send (Enter)">
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={() => handleSubmit()}
              disabled={!inputValue.trim() || isProcessing}
              style={{ borderRadius: 8, height: 32, width: 32, padding: 0 }}
            />
          </Tooltip>
        </InputRow>
      </InputArea>
    </PanelContainer>
  );
}
