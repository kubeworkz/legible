import { useState, useCallback } from 'react';
import styled from 'styled-components';
import { Button, Popover, Input, Tag } from 'antd';
import FilterOutlined from '@ant-design/icons/FilterOutlined';
import ClearOutlined from '@ant-design/icons/ClearOutlined';
import GroupOutlined from '@ant-design/icons/GroupOutlined';
import ThunderboltOutlined from '@ant-design/icons/ThunderboltOutlined';

const { TextArea } = Input;

// ── Styles ──────────────────────────────────────────────

const BarContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
`;

const OpButton = styled(Button)<{ $active?: boolean }>`
  && {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    padding: 4px 14px;
    height: 32px;
    border-radius: 6px;
    border: 1px solid var(--gray-4, #d9d9d9);
    background: var(--gray-1, #fff);
    color: var(--gray-8, #595959);
    font-weight: 500;

    &:hover {
      border-color: var(--geekblue-4, #85a5ff);
      color: var(--geekblue-6, #2f54eb);
    }

    ${(props) =>
      props.$active &&
      `
      background: var(--geekblue-1, #f0f5ff);
      border-color: var(--geekblue-5, #597ef7);
      color: var(--geekblue-6, #2f54eb);
    `}
  }
`;

const PopoverContent = styled.div`
  width: 340px;
`;

const PopoverHeader = styled.div`
  margin-bottom: 12px;
`;

const ConfirmRow = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
`;

const ConfirmButton = styled(Button)`
  && {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background: var(--gray-9, #262626);
    color: #fff;
    border: none;
    border-radius: 6px;
    font-weight: 500;

    &:hover {
      background: var(--gray-8, #434343);
      color: #fff;
    }

    &:disabled {
      background: var(--gray-5, #d9d9d9);
      color: var(--gray-7, #8c8c8c);
    }
  }
`;

const TemplateSection = styled.div`
  margin-top: 16px;
  border-top: 1px solid var(--gray-3, #f0f0f0);
  padding-top: 12px;
`;

const TemplateTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--gray-9, #262626);
  margin-bottom: 4px;

  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--geekblue-5, #597ef7);
  }
`;

const TemplateSubtitle = styled.div`
  font-size: 12px;
  color: var(--gray-6, #bfbfbf);
  margin-bottom: 10px;
`;

const TemplateItem = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  color: var(--gray-8, #595959);
  transition: background 0.15s;

  &:hover {
    background: var(--gray-2, #fafafa);
  }

  .sparkle {
    color: var(--geekblue-5, #597ef7);
    font-size: 14px;
  }
`;

const Placeholder = styled(Tag)`
  && {
    font-size: 11px;
    border-radius: 3px;
    background: var(--geekblue-1, #f0f5ff);
    border-color: var(--geekblue-3, #adc6ff);
    color: var(--geekblue-6, #2f54eb);
    margin: 0 2px;
    padding: 0 4px;
  }
`;

// ── Types ───────────────────────────────────────────────

export interface AIOperationsBarProps {
  /** Whether data is loaded and operations can be used */
  hasData?: boolean;
  /** Loading state */
  loading?: boolean;
  /** Called when an AI operation is confirmed */
  onConfirm?: (operation: string, prompt: string) => void;
}

interface TemplateItem {
  label: React.ReactNode;
  prompt: string;
}

// ── Templates ───────────────────────────────────────────

const FILTER_TEMPLATES: TemplateItem[] = [
  {
    label: <>Show me rows where <Placeholder>&lt;column&gt;</Placeholder> is <Placeholder>&quot;value&quot;</Placeholder></>,
    prompt: 'Show me rows where <column> is "value"',
  },
  {
    label: <>Show me rows where <Placeholder>&lt;column&gt;</Placeholder> is at least <Placeholder>10</Placeholder></>,
    prompt: 'Show me rows where <column> is at least 10',
  },
  {
    label: <>Show me rows where <Placeholder>&lt;column&gt;</Placeholder> is between <Placeholder>10</Placeholder> and <Placeholder>50</Placeholder></>,
    prompt: 'Show me rows where <column> is between 10 and 50',
  },
  {
    label: <>Show me rows where <Placeholder>&lt;column&gt;</Placeholder> contains <Placeholder>&quot;keyword&quot;</Placeholder></>,
    prompt: 'Show me rows where <column> contains "keyword"',
  },
];

const CLEANING_TEMPLATES: TemplateItem[] = [
  {
    label: <>Remove rows where <Placeholder>&lt;column&gt;</Placeholder> is empty</>,
    prompt: 'Remove rows where <column> is empty',
  },
  {
    label: <>Trim whitespace in <Placeholder>&lt;column&gt;</Placeholder></>,
    prompt: 'Trim whitespace in <column>',
  },
  {
    label: <>Replace <Placeholder>&quot;old&quot;</Placeholder> with <Placeholder>&quot;new&quot;</Placeholder> in <Placeholder>&lt;column&gt;</Placeholder></>,
    prompt: 'Replace "old" with "new" in <column>',
  },
  {
    label: <>Remove duplicate rows</>,
    prompt: 'Remove duplicate rows',
  },
];

const GROUPING_TEMPLATES: TemplateItem[] = [
  {
    label: <>Group by <Placeholder>&lt;column&gt;</Placeholder> and count rows</>,
    prompt: 'Group by <column> and count rows',
  },
  {
    label: <>Group by <Placeholder>&lt;column&gt;</Placeholder> and sum <Placeholder>&lt;column&gt;</Placeholder></>,
    prompt: 'Group by <column> and sum <column>',
  },
  {
    label: <>Group by <Placeholder>&lt;column&gt;</Placeholder> and average <Placeholder>&lt;column&gt;</Placeholder></>,
    prompt: 'Group by <column> and average <column>',
  },
  {
    label: <>Pivot by <Placeholder>&lt;column&gt;</Placeholder></>,
    prompt: 'Pivot by <column>',
  },
];

const ENRICHMENT_TEMPLATES: TemplateItem[] = [
  {
    label: <>Add a column that categorizes <Placeholder>&lt;column&gt;</Placeholder></>,
    prompt: 'Add a column that categorizes <column>',
  },
  {
    label: <>Add a column with the rank of <Placeholder>&lt;column&gt;</Placeholder></>,
    prompt: 'Add a column with the rank of <column>',
  },
  {
    label: <>Add a running total of <Placeholder>&lt;column&gt;</Placeholder></>,
    prompt: 'Add a running total of <column>',
  },
  {
    label: <>Extract year and month from <Placeholder>&lt;column&gt;</Placeholder></>,
    prompt: 'Extract year and month from <column>',
  },
];

// ── Popover builder ─────────────────────────────────────

function OperationPopover({
  title,
  placeholder,
  templates,
  value,
  onChange,
  onConfirm,
  loading,
}: {
  title: string;
  placeholder: string;
  templates: TemplateItem[];
  value: string;
  onChange: (v: string) => void;
  onConfirm: () => void;
  loading?: boolean;
}) {
  return (
    <PopoverContent>
      <PopoverHeader>
        <TextArea
          autoSize={{ minRows: 2, maxRows: 4 }}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onPressEnter={(e) => {
            if (!e.shiftKey) {
              e.preventDefault();
              onConfirm();
            }
          }}
        />
        <ConfirmRow>
          <ConfirmButton
            size="small"
            icon={<ThunderboltOutlined />}
            onClick={onConfirm}
            disabled={!value.trim() || loading}
          >
            Confirm
          </ConfirmButton>
        </ConfirmRow>
      </PopoverHeader>

      <TemplateSection>
        <TemplateTitle>
          <span className="dot" />
          Pick a template to start
        </TemplateTitle>
        <TemplateSubtitle>
          Select a template and replace <Placeholder>placeholder</Placeholder> with your data.
        </TemplateSubtitle>
        {templates.map((t, i) => (
          <TemplateItem key={i} onClick={() => onChange(t.prompt)}>
            <span className="sparkle">✦</span>
            {t.label}
          </TemplateItem>
        ))}
      </TemplateSection>
    </PopoverContent>
  );
}

// ── Component ───────────────────────────────────────────

export default function AIOperationsBar(props: AIOperationsBarProps) {
  const { hasData = false, loading = false, onConfirm } = props;

  const [activeOp, setActiveOp] = useState<string | null>(null);
  const [filterText, setFilterText] = useState('');
  const [cleaningText, setCleaningText] = useState('');
  const [groupingText, setGroupingText] = useState('');
  const [enrichmentText, setEnrichmentText] = useState('');

  const handleConfirm = useCallback(
    (operation: string, text: string) => {
      if (text.trim() && onConfirm) {
        onConfirm(operation, text.trim());
      }
      setActiveOp(null);
    },
    [onConfirm],
  );

  const handleVisibleChange = useCallback(
    (op: string, visible: boolean) => {
      setActiveOp(visible ? op : null);
    },
    [],
  );

  const disabled = !hasData || loading;

  return (
    <BarContainer>
      {/* Filter */}
      <Popover
        trigger="click"
        placement="bottomLeft"
        visible={activeOp === 'filter'}
        onVisibleChange={(v) => handleVisibleChange('filter', v)}
        content={
          <OperationPopover
            title="Filter"
            placeholder="Filter your data using natural language. Tip: Use @model to specify models."
            templates={FILTER_TEMPLATES}
            value={filterText}
            onChange={setFilterText}
            onConfirm={() => handleConfirm('filter', filterText)}
            loading={loading}
          />
        }
      >
        <OpButton
          $active={activeOp === 'filter'}
          disabled={disabled}
          icon={<FilterOutlined />}
        >
          Filter
        </OpButton>
      </Popover>

      {/* Cleaning */}
      <Popover
        trigger="click"
        placement="bottomLeft"
        visible={activeOp === 'cleaning'}
        onVisibleChange={(v) => handleVisibleChange('cleaning', v)}
        content={
          <OperationPopover
            title="Cleaning"
            placeholder="Describe how to clean your data using natural language."
            templates={CLEANING_TEMPLATES}
            value={cleaningText}
            onChange={setCleaningText}
            onConfirm={() => handleConfirm('cleaning', cleaningText)}
            loading={loading}
          />
        }
      >
        <OpButton
          $active={activeOp === 'cleaning'}
          disabled={disabled}
          icon={<ClearOutlined />}
        >
          Cleaning
        </OpButton>
      </Popover>

      {/* Grouping */}
      <Popover
        trigger="click"
        placement="bottomLeft"
        visible={activeOp === 'grouping'}
        onVisibleChange={(v) => handleVisibleChange('grouping', v)}
        content={
          <OperationPopover
            title="Grouping"
            placeholder="Describe how to group your data using natural language."
            templates={GROUPING_TEMPLATES}
            value={groupingText}
            onChange={setGroupingText}
            onConfirm={() => handleConfirm('grouping', groupingText)}
            loading={loading}
          />
        }
      >
        <OpButton
          $active={activeOp === 'grouping'}
          disabled={disabled}
          icon={<GroupOutlined />}
        >
          Grouping
        </OpButton>
      </Popover>

      {/* Enrichment */}
      <Popover
        trigger="click"
        placement="bottomLeft"
        visible={activeOp === 'enrichment'}
        onVisibleChange={(v) => handleVisibleChange('enrichment', v)}
        content={
          <OperationPopover
            title="Enrichment"
            placeholder="Describe how to enrich your data using natural language."
            templates={ENRICHMENT_TEMPLATES}
            value={enrichmentText}
            onChange={setEnrichmentText}
            onConfirm={() => handleConfirm('enrichment', enrichmentText)}
            loading={loading}
          />
        }
      >
        <OpButton
          $active={activeOp === 'enrichment'}
          disabled={disabled}
          icon={<ThunderboltOutlined />}
        >
          Enrichment
        </OpButton>
      </Popover>
    </BarContainer>
  );
}
