import { useMemo, useState, useCallback, useEffect } from 'react';
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
import SpreadsheetGrid from '@/components/spreadsheet/SpreadsheetGrid';
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

  // Sync initial SQL from the loaded spreadsheet
  useEffect(() => {
    if (spreadsheet?.sourceSql && !hasRun) {
      setCurrentSql(spreadsheet.sourceSql);
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

        <SpreadsheetSqlEditor
          initialSql={spreadsheet?.sourceSql || ''}
          loading={previewLoading}
          onRun={handleRunSql}
          onSave={handleSaveSql}
          dirty={sqlDirty}
        />

        <GridArea>
          <SpreadsheetGrid
            columns={resultData?.columns}
            data={resultData?.data}
            loading={previewLoading}
            error={previewError || null}
            empty={!hasRun}
          />
        </GridArea>
      </PageContainer>
    </SiderLayout>
  );
}
