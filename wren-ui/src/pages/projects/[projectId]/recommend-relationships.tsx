import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/router';
import styled from 'styled-components';
import {
  Button,
  Typography,
  Table,
  Spin,
  Alert,
  Tag,
  message,
} from 'antd';
import Checkbox from 'antd/lib/checkbox';
import ArrowLeftOutlined from '@ant-design/icons/ArrowLeftOutlined';
import ArrowRightOutlined from '@ant-design/icons/ArrowRightOutlined';
import BranchesOutlined from '@ant-design/icons/BranchesOutlined';
import { Path, buildPath } from '@/utils/enum';
import useProject from '@/hooks/useProject';
import { useListModelsQuery } from '@/apollo/client/graphql/model.generated';
import { useCreateRelationshipMutation } from '@/apollo/client/graphql/relationship.generated';
import { RelationType } from '@/apollo/client/graphql/__types__';

const { Title, Text } = Typography;

// ── Styled components ──────────────────────────────────

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
`;

const FooterRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 24px;
`;

const RelationshipRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--gray-3, #f0f0f0);

  &:last-child {
    border-bottom: none;
  }
`;

const ResultsBox = styled.div`
  border: 1px solid var(--gray-4, #d9d9d9);
  border-radius: 6px;
  overflow: hidden;
`;

const ResultsHeader = styled.div`
  padding: 10px 16px;
  font-size: 13px;
  font-weight: 600;
  color: var(--gray-9, #262626);
  background: var(--gray-2, #fafafa);
  border-bottom: 1px solid var(--gray-4, #d9d9d9);
  display: flex;
  align-items: center;
  gap: 8px;
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

const RelRow = styled.div<{ $selected?: boolean }>`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--gray-3, #f0f0f0);
  font-size: 13px;
  color: var(--gray-8, #595959);
  cursor: pointer;
  transition: background 0.1s;
  background: ${(p) => (p.$selected ? 'var(--geekblue-1, #f0f5ff)' : 'transparent')};

  &:hover {
    background: var(--gray-2, #fafafa);
  }

  &:last-child {
    border-bottom: none;
  }
`;

const RelDetail = styled.div`
  flex: 1;
  min-width: 0;
`;

const RelName = styled.div`
  font-weight: 600;
  color: var(--gray-9, #262626);
  margin-bottom: 4px;
`;

const RelMapping = styled.div`
  font-size: 12px;
  color: var(--gray-7, #8c8c8c);
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
`;

const RelReason = styled.div`
  font-size: 12px;
  color: var(--gray-6, #bfbfbf);
  margin-top: 4px;
  font-style: italic;
`;

const SpinWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 0;
  gap: 16px;
`;

// ── Type for AI-recommended relationship ──────────────

interface RecommendedRelationship {
  name: string;
  fromModel: string;
  fromColumn: string;
  type: string; // MANY_TO_ONE | ONE_TO_MANY | ONE_TO_ONE
  toModel: string;
  toColumn: string;
  reason: string;
}

// ── Helpers ───────────────────────────────────────────

function typeLabel(type: string): string {
  switch (type) {
    case 'MANY_TO_ONE':
      return 'Many-to-One';
    case 'ONE_TO_MANY':
      return 'One-to-Many';
    case 'ONE_TO_ONE':
      return 'One-to-One';
    default:
      return type;
  }
}

function typeTagColor(type: string): string {
  switch (type) {
    case 'MANY_TO_ONE':
      return 'blue';
    case 'ONE_TO_MANY':
      return 'green';
    case 'ONE_TO_ONE':
      return 'purple';
    default:
      return 'default';
  }
}

// ── Page component ────────────────────────────────────

export default function RecommendRelationships() {
  const router = useRouter();
  const { currentProjectId } = useProject();
  const projectId = currentProjectId;
  const { data: modelsData } = useListModelsQuery();
  const [createRelation] = useCreateRelationshipMutation();

  // AI generation state
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [relationships, setRelationships] = useState<
    RecommendedRelationship[]
  >([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(
    new Set(),
  );
  const [saving, setSaving] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedRef = useRef(false);

  // Build model name → { id, fields } lookup for saving
  const modelLookup = useMemo(() => {
    if (!modelsData?.listModels) return {};
    const lookup: Record<
      string,
      {
        id: number;
        fields: { id: number; referenceName: string }[];
      }
    > = {};
    for (const m of modelsData.listModels) {
      lookup[m.referenceName] = {
        id: m.id,
        fields: (m.fields || [])
          .filter(Boolean)
          .map((f: any) => ({ id: f.id, referenceName: f.referenceName })),
      };
    }
    return lookup;
  }, [modelsData]);

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  // Auto-start generation on mount
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    startGeneration();
  }, []);

  const startGeneration = useCallback(async () => {
    setGenerating(true);
    setGenerated(false);
    setError(null);
    setRelationships([]);
    setSelectedIndices(new Set());

    try {
      const res = await fetch('/api/v1/relationship-recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to start generation');
      }

      const { id } = await res.json();

      // Poll for results
      pollingRef.current = setInterval(async () => {
        try {
          const pollRes = await fetch(
            `/api/v1/relationship-recommendations?id=${id}`,
          );
          if (!pollRes.ok) return;

          const pollData = await pollRes.json();

          if (pollData.status === 'finished') {
            if (pollingRef.current) clearInterval(pollingRef.current);
            const rels: RecommendedRelationship[] =
              pollData.response?.relationships || [];
            setRelationships(rels);
            // Select all by default
            setSelectedIndices(new Set(rels.map((_, i) => i)));
            setGenerated(true);
            setGenerating(false);
          } else if (pollData.status === 'failed') {
            if (pollingRef.current) clearInterval(pollingRef.current);
            setError(
              pollData.error?.message ||
                'Failed to generate relationship recommendations.',
            );
            setGenerated(true);
            setGenerating(false);
          }
        } catch {
          // keep polling
        }
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      setGenerating(false);
      setGenerated(true);
    }
  }, []);

  const goBack = useCallback(() => {
    if (!projectId) return;
    router.push(buildPath(Path.Modeling, projectId));
  }, [projectId, router]);

  const toggleIndex = useCallback((idx: number) => {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelectedIndices((prev) => {
      if (prev.size === relationships.length) return new Set();
      return new Set(relationships.map((_, i) => i));
    });
  }, [relationships]);

  const handleSave = useCallback(async () => {
    if (selectedIndices.size === 0) return;
    setSaving(true);

    try {
      const selected = relationships.filter((_, i) => selectedIndices.has(i));
      let successCount = 0;
      let skipCount = 0;

      for (const rel of selected) {
        const fromModel = modelLookup[rel.fromModel];
        const toModel = modelLookup[rel.toModel];

        if (!fromModel || !toModel) {
          skipCount++;
          continue;
        }

        const fromField = fromModel.fields.find(
          (f) => f.referenceName === rel.fromColumn,
        );
        const toField = toModel.fields.find(
          (f) => f.referenceName === rel.toColumn,
        );

        if (!fromField || !toField) {
          skipCount++;
          continue;
        }

        const relType =
          rel.type === 'MANY_TO_ONE'
            ? RelationType.MANY_TO_ONE
            : rel.type === 'ONE_TO_MANY'
              ? RelationType.ONE_TO_MANY
              : RelationType.ONE_TO_ONE;

        try {
          await createRelation({
            variables: {
              data: {
                fromModelId: fromModel.id,
                fromColumnId: fromField.id,
                toModelId: toModel.id,
                toColumnId: toField.id,
                type: relType,
              },
            },
          });
          successCount++;
        } catch (err: any) {
          console.error(
            `Failed to create relation ${rel.name}: ${err.message}`,
          );
          skipCount++;
        }
      }

      if (successCount > 0) {
        message.success(
          `Created ${successCount} relationship${successCount > 1 ? 's' : ''} successfully.`,
        );
      }
      if (skipCount > 0) {
        message.warning(
          `${skipCount} relationship${skipCount > 1 ? 's' : ''} could not be created (model/column not found or already exists).`,
        );
      }

      goBack();
    } catch (err: any) {
      message.error(err.message || 'Failed to save relationships');
    } finally {
      setSaving(false);
    }
  }, [
    selectedIndices,
    relationships,
    modelLookup,
    createRelation,
    goBack,
  ]);

  // ── Render ────────────────────────────────────────────

  const allSelected =
    relationships.length > 0 && selectedIndices.size === relationships.length;
  const someSelected =
    selectedIndices.size > 0 && selectedIndices.size < relationships.length;

  return (
    <PageWrapper>
      <BackLink>
        <a onClick={goBack}>
          <ArrowLeftOutlined /> Back to modeling
        </a>
      </BackLink>

      <Card>
        <Title level={4} style={{ marginBottom: 8 }}>
          <BranchesOutlined style={{ marginRight: 8 }} />
          Generate relationships
        </Title>

        <Description>
          Modeling AI Assistant will use AI to discover potential connections
          between your models. Review the suggested relationships and adjust
          them before saving to your data models.
        </Description>

        {/* Generating spinner */}
        {generating && (
          <SpinWrapper>
            <Spin size="large" />
            <Text type="secondary">
              Analyzing models for potential relationships...
            </Text>
          </SpinWrapper>
        )}

        {/* Error state */}
        {!generating && generated && error && (
          <Alert
            type="error"
            message="Generation failed"
            description={error}
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        {/* Empty results */}
        {!generating && generated && !error && relationships.length === 0 && (
          <Alert
            type="info"
            message="No additional recommended relationships"
            description="No relationships are recommended. Your models may already have all the needed relationships, or the AI could not find any strong connections."
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        {/* Relationship results */}
        {!generating && generated && !error && relationships.length > 0 && (
          <ResultsBox>
            <ResultsHeader>
              <BranchesOutlined />
              Recommended relationships ({relationships.length})
            </ResultsHeader>
            <SelectAllRow>
              <Checkbox
                checked={allSelected}
                indeterminate={someSelected}
                onChange={toggleAll}
              />
              <span>Select all</span>
            </SelectAllRow>
            <div style={{ maxHeight: 400, overflowY: 'auto' }}>
              {relationships.map((rel, idx) => (
                <RelRow
                  key={idx}
                  $selected={selectedIndices.has(idx)}
                  onClick={() => toggleIndex(idx)}
                >
                  <Checkbox
                    checked={selectedIndices.has(idx)}
                    onClick={(e) => e.stopPropagation()}
                    onChange={() => toggleIndex(idx)}
                  />
                  <RelDetail>
                    <RelName>{rel.name}</RelName>
                    <RelMapping>
                      <Text strong style={{ fontSize: 12 }}>
                        {rel.fromModel}
                      </Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        .{rel.fromColumn}
                      </Text>
                      <ArrowRightOutlined
                        style={{ fontSize: 10, color: '#bfbfbf' }}
                      />
                      <Text strong style={{ fontSize: 12 }}>
                        {rel.toModel}
                      </Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        .{rel.toColumn}
                      </Text>
                      <Tag
                        color={typeTagColor(rel.type)}
                        style={{ marginLeft: 4, fontSize: 11 }}
                      >
                        {typeLabel(rel.type)}
                      </Tag>
                    </RelMapping>
                    {rel.reason && <RelReason>{rel.reason}</RelReason>}
                  </RelDetail>
                </RelRow>
              ))}
            </div>
          </ResultsBox>
        )}

        {/* Footer */}
        <FooterRow>
          <a
            onClick={goBack}
            style={{ color: 'var(--gray-7, #8c8c8c)', cursor: 'pointer' }}
          >
            Cancel and Go Back
          </a>
          <Button
            type="primary"
            disabled={
              generating || !generated || selectedIndices.size === 0
            }
            loading={saving}
            onClick={handleSave}
          >
            Save
          </Button>
        </FooterRow>
      </Card>
    </PageWrapper>
  );
}
