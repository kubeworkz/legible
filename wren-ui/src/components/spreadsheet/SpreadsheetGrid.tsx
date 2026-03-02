import { useMemo } from 'react';
import styled from 'styled-components';
import { Alert, Typography, Spin, Empty } from 'antd';
import { TableColumnProps, Table } from 'antd';
import { ApolloError } from '@apollo/client';
import { getColumnTypeIcon } from '@/utils/columnType';
import { parseGraphQLError } from '@/utils/errorHandler';

const { Text } = Typography;

const FONT_SIZE = 16;
const BASIC_COLUMN_WIDTH = 120;

const Container = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  border: 1px solid var(--gray-4);
  border-radius: 8px;
  overflow: hidden;
  background: white;
`;

const TableHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: var(--gray-2);
  border-bottom: 1px solid var(--gray-4);
  min-height: 36px;

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

  .row-count {
    font-size: 11px;
    font-weight: 400;
    color: var(--gray-6);
    text-transform: none;
    letter-spacing: 0;
  }
`;

const TableBody = styled.div`
  flex: 1;
  overflow: auto;
  min-height: 0;

  .ant-table-wrapper,
  .ant-spin-nested-loading,
  .ant-spin-container,
  .ant-table,
  .ant-table-container {
    height: 100%;
  }

  .ant-table-body {
    overflow: auto !important;
  }

  .ant-table-thead > tr > th {
    background: var(--gray-2);
    font-size: 12px;
    font-weight: 600;
    padding: 8px 12px;
    white-space: nowrap;
  }

  .ant-table-tbody > tr > td {
    font-size: 13px;
    padding: 6px 12px;
    max-width: 300px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .ant-table-tbody > tr:hover > td {
    background: var(--geekblue-1);
  }
`;

const CenteredState = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
`;

interface ColumnMeta {
  name: string;
  type: string;
}

interface Props {
  columns?: ColumnMeta[];
  data?: any[][];
  loading?: boolean;
  error?: ApolloError | null;
  /** True when no SQL has been run yet */
  empty?: boolean;
}

const ColumnTitle = (props: { name: string; type: string }) => {
  const { name, type } = props;
  const columnTypeIcon = getColumnTypeIcon({ type }, { title: type });
  return (
    <>
      {columnTypeIcon}
      <Text title={name} className="ml-1">
        {name}
      </Text>
    </>
  );
};

export default function SpreadsheetGrid(props: Props) {
  const { columns = [], data = [], loading = false, error, empty } = props;

  const tableColumns: TableColumnProps<any>[] = useMemo(
    () =>
      columns.map((col) => ({
        dataIndex: col.name,
        key: col.name,
        titleText: col.name,
        title: <ColumnTitle name={col.name} type={col.type} />,
        ellipsis: true,
      })),
    [columns],
  );

  const dynamicWidth = useMemo(
    () =>
      columns.reduce((total, col) => {
        const width = col.name.length * FONT_SIZE;
        return total + Math.max(width, BASIC_COLUMN_WIDTH);
      }, 0),
    [columns],
  );

  const dataSource = useMemo(
    () =>
      data.map((row, rowIndex) => {
        const obj: Record<string, any> = { key: rowIndex };
        row.forEach((value, colIndex) => {
          if (columns[colIndex]) {
            const val =
              typeof value === 'boolean' || typeof value === 'object'
                ? JSON.stringify(value)
                : value;
            obj[columns[colIndex].name] = val;
          }
        });
        return obj;
      }),
    [data, columns],
  );

  // Error state
  if (error) {
    const { message, shortMessage } = parseGraphQLError(error);
    return (
      <Container>
        <TableHeader>
          <span className="header-left">Results</span>
        </TableHeader>
        <CenteredState>
          <Alert
            message={shortMessage}
            description={message}
            type="error"
            showIcon
            style={{ maxWidth: 600 }}
          />
        </CenteredState>
      </Container>
    );
  }

  // Empty state — no SQL has been run yet
  if (empty && !loading && columns.length === 0) {
    return (
      <Container>
        <TableHeader>
          <span className="header-left">Results</span>
        </TableHeader>
        <CenteredState>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="Write a SQL query above and click Run to see results"
          />
        </CenteredState>
      </Container>
    );
  }

  return (
    <Container>
      <TableHeader>
        <span className="header-left">
          Results
          {dataSource.length > 0 && (
            <span className="row-count">
              ({dataSource.length} row{dataSource.length !== 1 ? 's' : ''})
            </span>
          )}
        </span>
      </TableHeader>
      <TableBody>
        {loading ? (
          <CenteredState>
            <Spin tip="Running query..." />
          </CenteredState>
        ) : (
          <Table
            dataSource={dataSource}
            columns={tableColumns}
            pagination={false}
            size="small"
            scroll={{ x: dynamicWidth, y: 'calc(100vh - 360px)' }}
            showHeader={columns.length > 0}
          />
        )}
      </TableBody>
    </Container>
  );
}
