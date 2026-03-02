import { useState, useCallback } from 'react';
import styled from 'styled-components';
import { Button, Tooltip } from 'antd';
import CaretRightOutlined from '@ant-design/icons/CaretRightOutlined';
import SaveOutlined from '@ant-design/icons/SaveOutlined';
import UpOutlined from '@ant-design/icons/UpOutlined';
import DownOutlined from '@ant-design/icons/DownOutlined';
import SQLEditor from '@/components/editor/SQLEditor';

const Container = styled.div<{ $collapsed: boolean }>`
  display: flex;
  flex-direction: column;
  border: 1px solid var(--gray-5);
  border-radius: 8px;
  background: var(--gray-1);
  overflow: hidden;
  transition: all 0.2s;

  ${(props) =>
    props.$collapsed &&
    `
    .editor-body {
      display: none;
    }
  `}
`;

const EditorHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: var(--gray-2);
  border-bottom: 1px solid var(--gray-4);
  min-height: 40px;

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

  .header-right {
    display: flex;
    align-items: center;
    gap: 6px;
  }
`;

const EditorBody = styled.div`
  .ace_editor {
    border: none !important;
    border-radius: 0 !important;
  }
`;

interface Props {
  initialSql?: string;
  loading?: boolean;
  onRun: (sql: string) => void;
  onSave?: (sql: string) => void;
  /** Whether the SQL has been modified since last save */
  dirty?: boolean;
}

export default function SpreadsheetSqlEditor(props: Props) {
  const { initialSql = '', loading = false, onRun, onSave, dirty } = props;
  const [sql, setSql] = useState(initialSql);
  const [collapsed, setCollapsed] = useState(false);

  const handleRun = useCallback(() => {
    if (sql.trim()) {
      onRun(sql.trim());
    }
  }, [sql, onRun]);

  const handleSave = useCallback(() => {
    if (sql.trim() && onSave) {
      onSave(sql.trim());
    }
  }, [sql, onSave]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Ctrl/Cmd + Enter to run
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleRun();
      }
    },
    [handleRun],
  );

  return (
    <Container $collapsed={collapsed} onKeyDown={handleKeyDown}>
      <EditorHeader>
        <span className="header-left">SQL Query</span>
        <span className="header-right">
          {onSave && (
            <Tooltip title="Save SQL">
              <Button
                size="small"
                icon={<SaveOutlined />}
                onClick={handleSave}
                disabled={!sql.trim() || !dirty}
              >
                Save
              </Button>
            </Tooltip>
          )}
          <Tooltip title={`Run query${'\u00A0'}(Ctrl+Enter)`}>
            <Button
              type="primary"
              size="small"
              icon={<CaretRightOutlined />}
              loading={loading}
              onClick={handleRun}
              disabled={!sql.trim()}
            >
              Run
            </Button>
          </Tooltip>
          <Tooltip title={collapsed ? 'Expand editor' : 'Collapse editor'}>
            <Button
              size="small"
              type="text"
              icon={collapsed ? <DownOutlined /> : <UpOutlined />}
              onClick={() => setCollapsed(!collapsed)}
            />
          </Tooltip>
        </span>
      </EditorHeader>
      <EditorBody className="editor-body">
        <SQLEditor
          value={sql}
          onChange={setSql}
          autoComplete
        />
      </EditorBody>
    </Container>
  );
}
