import { useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import styled from 'styled-components';
import { Button, Checkbox, Input, Typography } from 'antd';
import ArrowLeftOutlined from '@ant-design/icons/ArrowLeftOutlined';
import SearchOutlined from '@ant-design/icons/SearchOutlined';
import { Path, buildPath } from '@/utils/enum';
import useProject from '@/hooks/useProject';
import { useListModelsQuery } from '@/apollo/client/graphql/model.generated';

const { Title, Text, Link: AntLink } = Typography;

const PageWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 100vh;
  padding: 40px 24px;
  background: var(--gray-1, #ffffff);
`;

const BackLink = styled.div`
  width: 100%;
  max-width: 680px;
  margin-bottom: 24px;

  a {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 14px;
    color: var(--gray-7, #8c8c8c);
    cursor: pointer;
    transition: color 0.15s;

    &:hover {
      color: var(--geekblue-6, #2f54eb);
    }
  }
`;

const Card = styled.div`
  width: 100%;
  max-width: 680px;
  background: white;
  border-radius: 8px;
  border: 1px solid var(--gray-4, #d9d9d9);
  padding: 32px 40px;
`;

const Description = styled.div`
  margin-bottom: 24px;
  font-size: 14px;
  line-height: 1.6;
  color: var(--gray-8, #595959);

  .bold-intro {
    font-weight: 600;
    color: var(--gray-9, #262626);
  }
`;

const ModelListBox = styled.div`
  border: 1px solid var(--gray-4, #d9d9d9);
  border-radius: 6px;
  overflow: hidden;
`;

const ModelListHeader = styled.div`
  padding: 10px 16px;
  font-size: 13px;
  color: var(--gray-7, #8c8c8c);
  background: var(--gray-2, #fafafa);
  border-bottom: 1px solid var(--gray-4, #d9d9d9);
`;

const SearchWrapper = styled.div`
  padding: 8px 12px;
  border-bottom: 1px solid var(--gray-4, #d9d9d9);
`;

const SelectAllRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  border-bottom: 1px solid var(--gray-4, #d9d9d9);
  font-weight: 600;
  font-size: 13px;
  color: var(--gray-9, #262626);
`;

const ModelRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  border-bottom: 1px solid var(--gray-4, #f0f0f0);
  font-size: 13px;
  color: var(--gray-8, #595959);
  cursor: pointer;
  transition: background 0.1s;

  &:hover {
    background: var(--gray-2, #fafafa);
  }

  &:last-child {
    border-bottom: none;
  }
`;

const ModelListScroll = styled.div`
  max-height: 300px;
  overflow-y: auto;
`;

const Footer = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-top: 24px;
`;

export default function RecommendSemantics() {
  const router = useRouter();
  const { currentProjectId } = useProject();
  const { data, loading } = useListModelsQuery({ fetchPolicy: 'cache-and-network' });

  const models = useMemo(() => {
    if (!data?.listModels) return [];
    return data.listModels.map((m) => ({
      id: m.id,
      displayName: m.displayName,
    }));
  }, [data]);

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');

  // Auto-select all models once loaded
  useMemo(() => {
    if (models.length > 0 && selectedIds.size === 0) {
      setSelectedIds(new Set(models.map((m) => m.id)));
    }
  }, [models]);

  const filteredModels = useMemo(() => {
    if (!searchTerm) return models;
    const lower = searchTerm.toLowerCase();
    return models.filter((m) => m.displayName.toLowerCase().includes(lower));
  }, [models, searchTerm]);

  const allFilteredSelected = filteredModels.length > 0 && filteredModels.every((m) => selectedIds.has(m.id));
  const someFilteredSelected = filteredModels.some((m) => selectedIds.has(m.id));

  const handleToggle = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (allFilteredSelected) {
      // Deselect all filtered
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filteredModels.forEach((m) => next.delete(m.id));
        return next;
      });
    } else {
      // Select all filtered
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filteredModels.forEach((m) => next.add(m.id));
        return next;
      });
    }
  };

  const handleNext = () => {
    // Store selected model IDs and navigate to next step
    // For now, we'll pass them via query params
    const ids = Array.from(selectedIds).join(',');
    router.push({
      pathname: buildPath(Path.RecommendSemantics, currentProjectId),
      query: { step: '2', models: ids },
    });
  };

  const goBack = () => {
    router.push(buildPath(Path.Modeling, currentProjectId));
  };

  if (loading) {
    return (
      <PageWrapper>
        <Card>
          <Text type="secondary">Loading models...</Text>
        </Card>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <BackLink>
        <a onClick={goBack}>
          <ArrowLeftOutlined />
          Back to modeling
        </a>
      </BackLink>

      <Card>
        <Title level={2} style={{ marginBottom: 16 }}>
          Pick models
        </Title>

        <Description>
          <span className="bold-intro">
            Good semantics improve how AI understands and queries your data.
          </span>{' '}
          Select models to generate semantics with AI. Modeling AI Assistant will
          help you create semantics that improve how AI understands and queries
          your data.
        </Description>

        <ModelListBox>
          <ModelListHeader>
            {selectedIds.size}/{models.length} model(s)
          </ModelListHeader>

          <SearchWrapper>
            <Input
              placeholder="Search here"
              prefix={<SearchOutlined style={{ color: 'var(--gray-5)' }} />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              allowClear
              size="small"
              style={{ borderColor: 'var(--gray-4)' }}
            />
          </SearchWrapper>

          <SelectAllRow>
            <Checkbox
              checked={allFilteredSelected}
              indeterminate={someFilteredSelected && !allFilteredSelected}
              onChange={handleSelectAll}
            />
            Model name
          </SelectAllRow>

          <ModelListScroll>
            {filteredModels.map((model) => (
              <ModelRow key={model.id} onClick={() => handleToggle(model.id)}>
                <Checkbox checked={selectedIds.has(model.id)} />
                {model.displayName}
              </ModelRow>
            ))}
            {filteredModels.length === 0 && (
              <div style={{ padding: '16px', textAlign: 'center', color: 'var(--gray-5)' }}>
                No models found
              </div>
            )}
          </ModelListScroll>
        </ModelListBox>

        <Footer>
          <Button
            type="primary"
            size="large"
            disabled={selectedIds.size === 0}
            onClick={handleNext}
            style={{ minWidth: 120 }}
          >
            Next
          </Button>
        </Footer>
      </Card>
    </PageWrapper>
  );
}
