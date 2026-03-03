import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/router';
import styled from 'styled-components';
import { Button, Input, Typography, Collapse, Tag, message } from 'antd';
import Checkbox from 'antd/lib/checkbox';
import ArrowLeftOutlined from '@ant-design/icons/ArrowLeftOutlined';
import SearchOutlined from '@ant-design/icons/SearchOutlined';
import MinusOutlined from '@ant-design/icons/MinusOutlined';
import PlusOutlined from '@ant-design/icons/PlusOutlined';
import { Path, buildPath } from '@/utils/enum';
import useProject from '@/hooks/useProject';
import { useListModelsQuery } from '@/apollo/client/graphql/model.generated';

const { Title, Text } = Typography;
const { Panel } = Collapse;

// ── Shared styled components ──────────────────────────

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

const FooterRow = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: 24px;
`;

// ── Step 1 styled components ──────────────────────────

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

// ── Step 2 styled components ──────────────────────────

const PromptRow = styled.div`
  display: flex;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 24px;
`;

const ExampleCard = styled.div`
  padding: 16px;
  background: var(--gray-1, #ffffff);
  border-bottom: 1px solid var(--gray-4, #f0f0f0);

  &:last-child {
    border-bottom: none;
  }

  .example-text {
    margin-top: 8px;
    font-size: 13px;
    line-height: 1.6;
    color: var(--gray-8, #595959);
  }
`;

const StyledCollapse = styled(Collapse)`
  border: 1px solid var(--gray-4, #d9d9d9) !important;
  border-radius: 6px !important;
  overflow: hidden;

  .ant-collapse-header {
    font-weight: 600 !important;
    font-size: 14px !important;
  }

  .ant-collapse-content-box {
    padding: 0 !important;
  }

  .example-intro {
    padding: 12px 16px;
    font-size: 13px;
    color: var(--gray-7, #8c8c8c);
    border-bottom: 1px solid var(--gray-4, #f0f0f0);
  }
`;

// ── Example prompts data ─────────────────────────────

const EXAMPLE_PROMPTS = [
  {
    tag: 'College',
    text: 'The purpose of this dataset is to monitor academic performance by tracking student enrollments, grades, and GPA calculations, and to identify areas for student support.',
  },
  {
    tag: 'E-commerce',
    text: 'This dataset includes historical pricing information, discount rates, and promotional activities. It supports dynamic pricing strategies, promotion effectiveness analysis, and competitive pricing assessments.',
  },
  {
    tag: 'Human Resources',
    text: 'This dataset tracks job postings, applicant details, interview processes, and hiring outcomes. It supports recruitment strategy optimization, time-to-hire analysis, and candidate sourcing effectiveness.',
  },
];

// ── Main Component ───────────────────────────────────

export default function RecommendSemantics() {
  const router = useRouter();
  const { currentProjectId } = useProject();
  const { data, loading } = useListModelsQuery({ fetchPolicy: 'cache-and-network' });

  // Step management
  const step = router.query.step === '2' ? 2 : 1;
  const selectedModelsParam = (router.query.models as string) || '';

  const models = useMemo(() => {
    if (!data?.listModels) return [];
    return data.listModels.map((m) => ({
      id: m.id,
      displayName: m.displayName,
      referenceName: m.referenceName,
    }));
  }, [data]);

  // ── Step 1 state ──────────────────────────────────
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
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filteredModels.forEach((m) => next.delete(m.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filteredModels.forEach((m) => next.add(m.id));
        return next;
      });
    }
  };

  const handleNextToStep2 = () => {
    const ids = Array.from(selectedIds).join(',');
    router.push({
      pathname: buildPath(Path.RecommendSemantics, currentProjectId),
      query: { step: '2', models: ids },
    });
  };

  // ── Step 2 state ──────────────────────────────────
  const [userPrompt, setUserPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);

  const handleGenerate = useCallback(async () => {
    if (!userPrompt.trim()) {
      message.warning('Please describe your dataset first.');
      return;
    }
    setGenerating(true);
    try {
      // TODO: Wire to AI service POST /v1/semantics-descriptions
      // For now simulate a delay
      await new Promise((resolve) => setTimeout(resolve, 2000));
      setGenerated(true);
      message.success('Semantics generated successfully.');
    } catch (err) {
      message.error('Failed to generate semantics.');
    } finally {
      setGenerating(false);
    }
  }, [userPrompt]);

  const handleBackToStep1 = () => {
    router.push({
      pathname: buildPath(Path.RecommendSemantics, currentProjectId),
    });
  };

  const handleSave = useCallback(() => {
    // TODO: Save generated semantics to models
    message.info('Save semantics — coming soon');
  }, []);

  const goBackToModeling = () => {
    router.push(buildPath(Path.Modeling, currentProjectId));
  };

  // ── Loading state ─────────────────────────────────
  if (loading) {
    return (
      <PageWrapper>
        <Card>
          <Text type="secondary">Loading models...</Text>
        </Card>
      </PageWrapper>
    );
  }

  // ── Step 2: Generate semantics ────────────────────
  if (step === 2) {
    return (
      <PageWrapper>
        <BackLink>
          <a onClick={goBackToModeling}>
            <ArrowLeftOutlined />
            Back to modeling
          </a>
        </BackLink>

        <Card>
          <Title level={2} style={{ marginBottom: 24 }}>
            Generate semantics
          </Title>

          <Title level={5} style={{ marginBottom: 8 }}>
            User Prompt
          </Title>

          <Description>
            Help AI better understand your data by providing a{' '}
            <span className="bold-intro">brief description</span> of your
            dataset's purpose. Modeling AI Assistant will use this context to
            generate more relevant semantics.
          </Description>

          <PromptRow>
            <Input
              placeholder="This dataset is to ..."
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              size="large"
              onPressEnter={handleGenerate}
            />
            <Button
              type="primary"
              size="large"
              onClick={handleGenerate}
              loading={generating}
              style={{ minWidth: 110 }}
            >
              Generate
            </Button>
          </PromptRow>

          <StyledCollapse
            defaultActiveKey={['examples']}
            expandIcon={({ isActive }) =>
              isActive ? <MinusOutlined /> : <PlusOutlined />
            }
            expandIconPosition="right"
          >
            <Panel header="Example prompt" key="examples">
              <div className="example-intro">
                Following, we provide some example prompts based on some real world datasets.
              </div>
              {EXAMPLE_PROMPTS.map((example, idx) => (
                <ExampleCard key={idx}>
                  <Tag
                    color="blue"
                    style={{ cursor: 'pointer' }}
                    onClick={() => setUserPrompt(example.text)}
                  >
                    {example.tag}
                  </Tag>
                  <div className="example-text">{example.text}</div>
                </ExampleCard>
              ))}
            </Panel>
          </StyledCollapse>

          <FooterRow>
            <Button size="large" onClick={handleBackToStep1} style={{ minWidth: 100 }}>
              Back
            </Button>
            <Button
              type="primary"
              size="large"
              disabled={!generated}
              onClick={handleSave}
              style={{ minWidth: 100 }}
            >
              Save
            </Button>
          </FooterRow>
        </Card>
      </PageWrapper>
    );
  }

  // ── Step 1: Pick models ───────────────────────────
  return (
    <PageWrapper>
      <BackLink>
        <a onClick={goBackToModeling}>
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

        <FooterRow>
          <div />
          <Button
            type="primary"
            size="large"
            disabled={selectedIds.size === 0}
            onClick={handleNextToStep2}
            style={{ minWidth: 120 }}
          >
            Next
          </Button>
        </FooterRow>
      </Card>
    </PageWrapper>
  );
}
