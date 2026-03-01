import { useRouter } from 'next/router';
import { Select, Button, Tooltip } from 'antd';
import styled from 'styled-components';
import FolderOutlined from '@ant-design/icons/FolderOutlined';
import MenuFoldOutlined from '@ant-design/icons/MenuFoldOutlined';
import useProject from '@/hooks/useProject';
import { useApolloClient } from '@apollo/client';
import { Path, buildPath } from '@/utils/enum';

const Wrapper = styled.div`
  padding: 12px 16px;
  border-bottom: 1px solid var(--gray-4);
  display: flex;
  align-items: center;
  gap: 8px;
`;

const StyledSelect = styled(Select)`
  flex: 1;
  min-width: 0;

  .ant-select-selector {
    background-color: transparent !important;
    border: none !important;
    box-shadow: none !important;
    padding-left: 0 !important;
    height: 32px !important;
    cursor: pointer !important;
  }

  .ant-select-selection-item {
    line-height: 30px !important;
    font-weight: 500;
    font-size: 14px;
    color: var(--gray-9) !important;
  }

  .ant-select-arrow {
    color: var(--gray-7);
    font-size: 10px;
  }

  &:hover .ant-select-selection-item {
    color: var(--geekblue-6) !important;
  }
`;

const CollapseButton = styled(Button)`
  flex-shrink: 0;
  color: var(--gray-7) !important;
  &:hover {
    color: var(--gray-9) !important;
    background-color: var(--gray-4) !important;
  }
`;

interface Props {
  onCollapse?: () => void;
}

export default function ProjectSwitcher(props: Props) {
  const { onCollapse } = props;
  const { projects, currentProjectId, setCurrentProjectId, loading } =
    useProject();
  const apolloClient = useApolloClient();
  const router = useRouter();

  const handleProjectChange = async (value: number) => {
    if (value === currentProjectId) return;

    // Update the project ID (persists to localStorage + updates header)
    setCurrentProjectId(value);

    // Clear the Apollo cache so stale data from the previous project
    // doesn't bleed into the new project's UI
    await apolloClient.resetStore();

    // Navigate to home to ensure a clean state
    router.push(buildPath(Path.Home, value));
  };

  const options = projects.map((p) => ({
    label: p.displayName,
    value: p.id,
  }));

  if (loading && projects.length === 0) {
    return null;
  }

  return (
    <Wrapper>
      <FolderOutlined style={{ fontSize: 16, color: 'var(--gray-7)' }} />
      <StyledSelect
        value={currentProjectId}
        onChange={handleProjectChange}
        options={options}
        placeholder="Personal Folder"
        loading={loading}
        dropdownMatchSelectWidth={200}
      />
      {onCollapse && (
        <Tooltip title="Collapse sidebar" placement="right">
          <CollapseButton
            type="text"
            size="small"
            icon={<MenuFoldOutlined />}
            onClick={onCollapse}
          />
        </Tooltip>
      )}
    </Wrapper>
  );
}
