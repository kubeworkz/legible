import styled from 'styled-components';
import { Button } from 'antd';
import CodeOutlined from '@ant-design/icons/CodeOutlined';
import ModelViewSelector from '@/components/spreadsheet/ModelViewSelector';

const Overlay = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  pointer-events: none;

  /* Semi-transparent background so the empty grid is visible behind */
  background: rgba(255, 255, 255, 0.6);
`;

const ButtonGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  pointer-events: auto;
`;

const SqlButton = styled(Button)`
  && {
    height: 40px;
    font-size: 14px;
    font-weight: 500;
    border-radius: 6px;
    padding: 0 20px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: var(--gray-9, #262626);
    border-color: var(--gray-9, #262626);
    color: white;

    &:hover,
    &:focus {
      background: var(--gray-8, #434343);
      border-color: var(--gray-8, #434343);
      color: white;
    }
  }
`;

interface Props {
  /** Called when a model/view is selected — passes generated SQL and source name */
  onSelectModelView: (sql: string, name: string) => void;
  /** Called when "Create from a SQL" is clicked */
  onCreateFromSql: () => void;
}

export default function DataSourceOverlay({
  onSelectModelView,
  onCreateFromSql,
}: Props) {
  return (
    <Overlay>
      <ButtonGroup>
        <ModelViewSelector onSelect={onSelectModelView} />
        <SqlButton onClick={onCreateFromSql}>
          <CodeOutlined />
          Create from a SQL
        </SqlButton>
      </ButtonGroup>
    </Overlay>
  );
}
