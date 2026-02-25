import { useRouter } from 'next/router';
import { Select, Button, Tooltip } from 'antd';
import styled from 'styled-components';
import PlusOutlined from '@ant-design/icons/PlusOutlined';
import ProjectOutlined from '@ant-design/icons/ProjectOutlined';
import useProject from '@/hooks/useProject';
import { useApolloClient } from '@apollo/client';
import { Path, buildPath } from '@/utils/enum';

const Wrapper = styled.div`
  padding: 12px 16px;
  border-bottom: 1px solid var(--gray-4);
`;

const StyledSelect = styled(Select)`
  width: 100%;

  .ant-select-selector {
    background-color: var(--gray-3) !important;
    border-color: var(--gray-5) !important;
    color: var(--gray-8) !important;
    border-radius: 4px !important;
    height: 36px !important;
  }

  .ant-select-selection-item {
    line-height: 34px !important;
    font-weight: 500;
  }

  .ant-select-arrow {
    color: var(--gray-7);
  }

  &:hover .ant-select-selector {
    border-color: var(--gray-6) !important;
  }

  &.ant-select-focused .ant-select-selector {
    border-color: var(--geekblue-6) !important;
    box-shadow: 0 0 0 2px rgba(47, 84, 235, 0.1) !important;
  }
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
`;

const Label = styled.span`
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--gray-7);
`;

export default function ProjectSwitcher() {
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
      <Header>
        <Label>
          <ProjectOutlined className="mr-1" />
          Project
        </Label>
        <Tooltip title="New project" placement="right">
          <Button
            type="text"
            size="small"
            icon={<PlusOutlined />}
            style={{ color: 'var(--gray-7)' }}
            onClick={() =>
              router.push(
                buildPath(Path.OnboardingConnection, currentProjectId || 0),
              )
            }
          />
        </Tooltip>
      </Header>
      <StyledSelect
        value={currentProjectId}
        onChange={handleProjectChange}
        options={options}
        placeholder="Select project"
        loading={loading}
        suffixIcon={null}
      />
    </Wrapper>
  );
}
