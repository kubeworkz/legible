import { useState, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import styled from 'styled-components';
import { Button, Input, Typography, Collapse, Tag, Table, Spin, message } from 'antd';
import { Checkbox } from 'antd';
import ArrowLeftOutlined from '@ant-design/icons/ArrowLeftOutlined';
import SearchOutlined from '@ant-design/icons/SearchOutlined';
import MinusOutlined from '@ant-design/icons/MinusOutlined';
import PlusOutlined from '@ant-design/icons/PlusOutlined';
import TableOutlined from '@ant-design/icons/TableOutlined';
import { Path, buildPath } from '@/utils/enum';
import useProject from '@/hooks/useProject';
import { useListModelsQuery } from '@/apollo/client/graphql/model.generated';
import { useUpdateModelMetadataMutation } from '@/apollo/client/graphql/metadata.generated';

const { Title, Text } = Typography;
const { Panel } = Collapse;
const { TextArea } = Input;

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
  margin-bottom: 16px;

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

// ── Generated semantics styled components ─────────────

const ModelSection = styled.div`
  border-bottom: 1px solid var(--gray-4, #f0f0f0);
  &:last-child {
    border-bottom: none;
  }
`;

const ModelSectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  cursor: pointer;
  transition: background 0.1s;

  &:hover {
    background: var(--gray-2, #fafafa);
  }

  .model-name {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    font-weight: 500;
    color: var(--gray-9, #262626);
  }

  .column-count {
    font-size: 13px;
    color: var(--gray-7, #8c8c8c);
  }
`;

const ModelSectionBody = styled.div`
  padding: 0 16px 16px;
`;

const MetaRow = styled.div`
  display: flex;
  padding: 8px 0;
  font-size: 13px;

  .meta-label {
    width: 100px;
    color: var(--gray-7, #8c8c8c);
    flex-shrink: 0;
  }

  .meta-value {
    color: var(--gray-9, #262626);
  }
`;

const DescriptionBox = styled.div`
  margin: 8px 0 16px;

  .desc-label {
    font-size: 13px;
    color: var(--gray-7, #8c8c8c);
    margin-bottom: 4px;
  }
`;

const GeneratingOverlay = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 0;
  gap: 16px;
`;

// ── Types ─────────────────────────────────────────────

interface SemanticsColumn {
  name: string;
  description: string;
}

interface SemanticsModel {
  name: string;
  description: string;
  columns: SemanticsColumn[];
}

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
  const [generatedResults, setGeneratedResults] = useState<SemanticsModel[]>([]);
  const [expandedModels, setExpandedModels] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [updateModelMetadata] = useUpdateModelMetadataMutation();

  // Build a lookup from referenceName → model info
  const modelLookup = useMemo(() => {
    const map = new Map<string, { id: number; displayName: string; referenceName: string; fields?: any[] }>();
    if (data?.listModels) {
      data.listModels.forEach((m) => {
        map.set(m.referenceName, {
          id: m.id,
          displayName: m.displayName,
          referenceName: m.referenceName,
          fields: m.fields,
        });
      });
    }
    return map;
  }, [data]);

  // Get selected model reference names from query params
  const selectedModelNames = useMemo(() => {
    if (!selectedModelsParam) return [];
    const ids = selectedModelsParam.split(',').map(Number);
    return models
      .filter((m) => ids.includes(m.id))
      .map((m) => m.referenceName);
  }, [selectedModelsParam, models]);

  const pollForResult = useCallback(async (jobId: string) => {
    try {
      const res = await fetch(`/api/v1/semantics-descriptions?id=${jobId}`);
      const data = await res.json();

      if (data.status === 'finished' && data.response) {
        setGeneratedResults(data.response);
        // Auto-expand all models
        setExpandedModels(new Set(data.response.map((m: SemanticsModel) => m.name)));
        setGenerated(true);
        setGenerating(false);
        message.success('Semantics generated successfully.');
        return;
      }

      if (data.status === 'failed') {
        setGenerating(false);
        message.error(data.error?.message || 'Failed to generate semantics.');
        return;
      }

      // Still generating — poll again
      pollingRef.current = setTimeout(() => pollForResult(jobId), 2000);
    } catch (err) {
      setGenerating(false);
      message.error('Failed to check generation status.');
    }
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!userPrompt.trim()) {
      message.warning('Please describe your dataset first.');
      return;
    }
    setGenerating(true);
    setGenerated(false);
    setGeneratedResults([]);

    try {
      const res = await fetch('/api/v1/semantics-descriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selectedModels: selectedModelNames,
          userPrompt: userPrompt.trim(),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to start generation');
      }

      const { id: jobId } = await res.json();
      // Start polling
      pollingRef.current = setTimeout(() => pollForResult(jobId), 2000);
    } catch (err: any) {
      setGenerating(false);
      message.error(err.message || 'Failed to generate semantics.');
    }
  }, [userPrompt, selectedModelNames, pollForResult]);

  const handleBackToStep1 = () => {
    if (pollingRef.current) clearTimeout(pollingRef.current);
    router.push({
      pathname: buildPath(Path.RecommendSemantics, currentProjectId),
    });
  };

  const toggleModelExpanded = (modelName: string) => {
    setExpandedModels((prev) => {
      const next = new Set(prev);
      if (next.has(modelName)) next.delete(modelName);
      else next.add(modelName);
      return next;
    });
  };

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      for (const result of generatedResults) {
        const modelInfo = modelLookup.get(result.name);
        if (!modelInfo) continue;

        // Map column descriptions — need column IDs
        const columnUpdates = result.columns
          .map((col) => {
            const field = modelInfo.fields?.find(
              (f) => f.referenceName === col.name,
            );
            if (!field) return null;
            return { id: field.id, description: col.description };
          })
          .filter(Boolean);

        await updateModelMetadata({
          variables: {
            where: { id: modelInfo.id },
            data: {
              description: result.description,
              columns: columnUpdates,
            },
          },
        });
      }
      message.success('Semantics saved to models.');
      router.push(buildPath(Path.Modeling, currentProjectId));
    } catch (err: any) {
      message.error('Failed to save semantics.');
    } finally {
      setSaving(false);
    }
  }, [generatedResults, modelLookup, updateModelMetadata, router, currentProjectId]);

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
    const columnTableColumns = [
      {
        title: 'Name',
        dataIndex: 'name',
        key: 'name',
        width: '25%',
        render: (text: string) => <Text code>{text}</Text>,
      },
      {
        title: 'Alias',
        dataIndex: 'alias',
        key: 'alias',
        width: '20%',
        ellipsis: true,
      },
      {
        title: 'Type',
        dataIndex: 'type',
        key: 'type',
        width: '15%',
      },
      {
        title: 'Description',
        dataIndex: 'description',
        key: 'description',
      },
    ];

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

          {!generated && !generating && (
            <Description>
              Help AI better understand your data by providing a{' '}
              <span className="bold-intro">brief description</span> of your
              dataset's purpose. Modeling AI Assistant will use this context to
              generate more relevant semantics.
            </Description>
          )}

          <PromptRow>
            <Input.TextArea
              placeholder="This dataset is to ..."
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              autoSize={{ minRows: 2, maxRows: 5 }}
              style={{ flex: 1 }}
              disabled={generating}
            />
            <Button
              type={generated ? 'default' : 'primary'}
              size="large"
              onClick={handleGenerate}
              loading={generating}
              style={{ minWidth: 120, marginTop: 2 }}
            >
              {generated ? 'Regenerate' : 'Generate'}
            </Button>
          </PromptRow>

          {!generated && !generating && (
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
          )}

          {generating && (
            <GeneratingOverlay>
              <Spin size="large" />
              <Text type="secondary">Generating semantics...</Text>
            </GeneratingOverlay>
          )}

          {generated && generatedResults.length > 0 && (
            <StyledCollapse
              defaultActiveKey={['generated']}
              expandIcon={({ isActive }) =>
                isActive ? <MinusOutlined /> : <PlusOutlined />
              }
              expandIconPosition="right"
            >
              <Panel header="Generated semantics" key="generated">
                <div className="example-intro">
                  Review the semantics generated by AI.
                </div>
                {generatedResults.map((result) => {
                  const modelInfo = modelLookup.get(result.name);
                  const isExpanded = expandedModels.has(result.name);
                  const displayName = modelInfo?.displayName || result.name;

                  // Build column table data by merging with model field info
                  const columnData = result.columns.map((col) => {
                    const field = modelInfo?.fields?.find(
                      (f) => f.referenceName === col.name,
                    );
                    return {
                      key: col.name,
                      name: col.name,
                      alias: field?.displayName || col.name.replace(/_/g, ' '),
                      type: field?.type || '',
                      description: col.description,
                    };
                  });

                  return (
                    <ModelSection key={result.name}>
                      <ModelSectionHeader onClick={() => toggleModelExpanded(result.name)}>
                        <span className="model-name">
                          <TableOutlined />
                          {displayName}
                        </span>
                        <span className="column-count">
                          {result.columns.length} column(s)
                        </span>
                      </ModelSectionHeader>

                      {isExpanded && (
                        <ModelSectionBody>
                          <MetaRow>
                            <span className="meta-label">Name</span>
                            <span className="meta-value">
                              <Text code>{result.name}</Text>
                            </span>
                          </MetaRow>
                          <MetaRow>
                            <span className="meta-label">Alias</span>
                            <span className="meta-value">{displayName}</span>
                          </MetaRow>

                          <DescriptionBox>
                            <div className="desc-label">Description</div>
                            <TextArea
                              value={result.description}
                              autoSize={{ minRows: 2, maxRows: 5 }}
                              onChange={(e) => {
                                setGeneratedResults((prev) =>
                                  prev.map((m) =>
                                    m.name === result.name
                                      ? { ...m, description: e.target.value }
                                      : m,
                                  ),
                                );
                              }}
                            />
                          </DescriptionBox>

                          <Text type="secondary" style={{ fontSize: 13, marginBottom: 8, display: 'block' }}>
                            Columns ({columnData.length})
                          </Text>
                          <Table
                            columns={columnTableColumns}
                            dataSource={columnData}
                            pagination={false}
                            size="small"
                            bordered
                          />
                        </ModelSectionBody>
                      )}
                    </ModelSection>
                  );
                })}
              </Panel>
            </StyledCollapse>
          )}

          <FooterRow>
            <Button size="large" onClick={handleBackToStep1} style={{ minWidth: 100 }}>
              Back
            </Button>
            <Button
              type="primary"
              size="large"
              disabled={!generated || saving}
              loading={saving}
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
