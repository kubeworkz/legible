import { useState } from 'react';
import styled from 'styled-components';
import { Typography } from 'antd';
import RobotOutlined from '@ant-design/icons/RobotOutlined';
import EditOutlined from '@ant-design/icons/EditOutlined';
import BranchesOutlined from '@ant-design/icons/BranchesOutlined';
import UpOutlined from '@ant-design/icons/UpOutlined';
import DownOutlined from '@ant-design/icons/DownOutlined';

const { Text } = Typography;

const Container = styled.div`
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 10;
  min-width: 260px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  overflow: hidden;
  user-select: none;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  cursor: pointer;
  transition: background 0.15s;

  &:hover {
    background: var(--gray-2, #fafafa);
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
    font-size: 14px;
    color: var(--gray-9, #262626);
  }

  .header-icon {
    font-size: 16px;
    color: var(--geekblue-6, #2f54eb);
  }

  .chevron {
    font-size: 12px;
    color: var(--gray-6, #bfbfbf);
  }
`;

const MenuList = styled.div`
  border-top: 1px solid var(--gray-3, #f0f0f0);
`;

const MenuItem = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px 10px 20px;
  cursor: pointer;
  font-size: 13px;
  color: var(--gray-8, #595959);
  transition: background 0.15s;

  &:hover {
    background: var(--gray-2, #fafafa);
    color: var(--gray-9, #262626);
  }

  .menu-icon {
    font-size: 14px;
    color: var(--gray-7, #8c8c8c);
  }
`;

export interface ModelingAIAssistantProps {
  onRecommendSemantics?: () => void;
  onRecommendRelationships?: () => void;
}

export default function ModelingAIAssistant(props: ModelingAIAssistantProps) {
  const { onRecommendSemantics, onRecommendRelationships } = props;
  const [expanded, setExpanded] = useState(false);

  return (
    <Container>
      <Header onClick={() => setExpanded(!expanded)}>
        <span className="header-left">
          <RobotOutlined className="header-icon" />
          <Text strong>Modeling AI Assistant</Text>
        </span>
        <span className="chevron">
          {expanded ? <UpOutlined /> : <DownOutlined />}
        </span>
      </Header>
      {expanded && (
        <MenuList>
          <MenuItem onClick={onRecommendSemantics}>
            <EditOutlined className="menu-icon" />
            Recommend semantics
          </MenuItem>
          <MenuItem onClick={onRecommendRelationships}>
            <BranchesOutlined className="menu-icon" />
            Recommend relationships
          </MenuItem>
        </MenuList>
      )}
    </Container>
  );
}
