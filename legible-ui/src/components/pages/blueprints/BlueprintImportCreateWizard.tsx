import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  Alert,
  Card,
  Col,
  Descriptions,
  Empty,
  Form,
  Input,
  List,
  Modal,
  Row,
  Select,
  Space,
  Spin,
  Steps,
  Tabs,
  Tag,
  Typography,
} from 'antd';
import styled from 'styled-components';
import CheckCircleFilled from '@ant-design/icons/CheckCircleFilled';
import StarFilled from '@ant-design/icons/StarFilled';
import {
  RegistryEntryData,
  useRegistryQuery,
  useInstallRegistryEntryMutation,
} from '@/apollo/client/graphql/registry.generated';

const AceEditor = dynamic(() => import('@/components/editor/AceEditor'), {
  ssr: false,
});

const { Text } = Typography;
const { TextArea } = Input;

const EntryCard = styled(Card)<{ $selected?: boolean }>`
  cursor: pointer;
  border-color: ${(p) => (p.$selected ? '#1890ff' : undefined)};
  &:hover {
    border-color: #1890ff;
  }
`;

const StepContent = styled.div`
  margin-top: 24px;
  min-height: 260px;
`;

const DEFAULT_BLUEPRINT_YAML = `version: "0.1.0"
description: |
  My custom agent blueprint.

components:
  sandbox:
    image: "legible-sandbox:latest"
    name: "my-agent"
    forward_ports:
      - 9000
  inference:
    profiles:
      anthropic:
        provider_type: "anthropic"
        provider_name: "anthropic-inference"
        endpoint: "https://api.anthropic.com/v1"
        model: "claude-sonnet-4-20250514"
  mcp:
    servers:
      legible:
        transport: "streamable-http"
        url: "http://host.docker.internal:9000/mcp"

policies:
  network: "policies/legible-sandbox.yaml"
  filesystem:
    read_only:
      - /usr
      - /lib
    read_write:
      - /home/sandbox
      - /tmp
  process:
    deny_privilege_escalation: true

agent:
  type: "claude"
  allowed_types:
    - claude
    - codex
`;

// ── Types ────────────────────────────────────────────────────────

export interface CreateBlueprintValues {
  name: string;
  version: string;
  description?: string;
  sandboxImage?: string;
  defaultAgentType?: string;
  blueprintYaml: string;
}

interface Props {
  open: boolean;
  creating: boolean;
  onCancel: () => void;
  onCreate: (values: CreateBlueprintValues) => Promise<void>;
  onImport: (registryEntryId: number) => Promise<void>;
}

// ── Import Tab ───────────────────────────────────────────────────

function ImportTab({
  onImport,
  onCancel,
}: {
  onImport: (id: number) => Promise<void>;
  onCancel: () => void;
}) {
  const { data, loading } = useRegistryQuery();
  const [installEntry, { loading: installing }] =
    useInstallRegistryEntryMutation();
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState<string | undefined>();
  const [selected, setSelected] = useState<RegistryEntryData | null>(null);

  const entries = useMemo(
    () => data?.blueprintRegistry || [],
    [data],
  );

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const e of entries) if (e.category) set.add(e.category);
    return Array.from(set).sort();
  }, [entries]);

  const filtered = useMemo(() => {
    let result = entries;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          (e.description && e.description.toLowerCase().includes(q)),
      );
    }
    if (catFilter) {
      result = result.filter((e) => e.category === catFilter);
    }
    return result;
  }, [entries, search, catFilter]);

  const handleInstall = async () => {
    if (!selected) return;
    await onImport(selected.id);
  };

  if (loading) return <Spin />;

  return (
    <>
      <Row gutter={12} style={{ marginBottom: 16 }}>
        <Col flex="auto">
          <Input
            placeholder="Search registry…"
            allowClear
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </Col>
        <Col>
          <Select
            placeholder="Category"
            allowClear
            style={{ width: 160 }}
            value={catFilter}
            onChange={setCatFilter}
            options={categories.map((c) => ({ label: c, value: c }))}
          />
        </Col>
      </Row>

      <Row gutter={16}>
        {/* ── Entry list ── */}
        <Col span={selected ? 10 : 24}>
          {filtered.length === 0 ? (
            <Empty description="No registry entries found." />
          ) : (
            <List
              dataSource={filtered}
              style={{ maxHeight: 380, overflow: 'auto' }}
              renderItem={(entry) => (
                <List.Item style={{ padding: '4px 0' }}>
                  <EntryCard
                    size="small"
                    style={{ width: '100%' }}
                    $selected={selected?.id === entry.id}
                    onClick={() => setSelected(entry)}
                  >
                    <Space>
                      <Text strong>{entry.name}</Text>
                      <Tag>{entry.version}</Tag>
                      <Tag color="cyan">{entry.category}</Tag>
                      {entry.isOfficial && (
                        <Tag icon={<StarFilled />} color="gold">
                          Official
                        </Tag>
                      )}
                    </Space>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {entry.description || 'No description'}
                    </Text>
                  </EntryCard>
                </List.Item>
              )}
            />
          )}
        </Col>

        {/* ── Preview panel ── */}
        {selected && (
          <Col span={14}>
            <Card
              size="small"
              title={
                <Space>
                  <CheckCircleFilled style={{ color: '#1890ff' }} />
                  {selected.name}
                </Space>
              }
            >
              <Descriptions column={1} size="small">
                <Descriptions.Item label="Version">
                  {selected.version}
                </Descriptions.Item>
                <Descriptions.Item label="Category">
                  <Tag color="cyan">{selected.category}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Agent Type">
                  {selected.defaultAgentType || '—'}
                </Descriptions.Item>
                <Descriptions.Item label="Image">
                  <Text code>{selected.sandboxImage || '—'}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Connectors">
                  <Space size={4} wrap>
                    {selected.supportedConnectors?.map((c) => (
                      <Tag key={c}>{c}</Tag>
                    ))}
                  </Space>
                </Descriptions.Item>
                {selected.tags?.length ? (
                  <Descriptions.Item label="Tags">
                    <Space size={4} wrap>
                      {selected.tags.map((t) => (
                        <Tag key={t} color="geekblue">
                          {t}
                        </Tag>
                      ))}
                    </Space>
                  </Descriptions.Item>
                ) : null}
                <Descriptions.Item label="Installs">
                  {selected.installCount}
                </Descriptions.Item>
              </Descriptions>
              <Text
                strong
                style={{ display: 'block', margin: '8px 0 4px' }}
              >
                Blueprint YAML Preview
              </Text>
              <pre
                style={{
                  background: '#f5f5f5',
                  padding: 8,
                  borderRadius: 4,
                  maxHeight: 160,
                  overflow: 'auto',
                  fontSize: 11,
                  margin: 0,
                }}
              >
                {selected.blueprintYaml}
              </pre>
            </Card>
          </Col>
        )}
      </Row>

      <div style={{ textAlign: 'right', marginTop: 16 }}>
        <Space>
          <a onClick={onCancel}>Cancel</a>
          <Alert
            type="info"
            showIcon
            message={
              selected
                ? `Install "${selected.name}" to this project`
                : 'Select a registry entry to install'
            }
            style={{ display: 'inline-flex', padding: '2px 12px' }}
          />
        </Space>
      </div>

      {/* Hidden — the parent modal handles OK */}
      <input
        type="hidden"
        data-selected-id={selected?.id}
        id="registry-selected-id"
      />
    </>
  );
}

// ── Main Wizard ──────────────────────────────────────────────────

const CREATE_STEPS = [{ title: 'Metadata' }, { title: 'YAML' }, { title: 'Review' }];

export default function BlueprintImportCreateWizard({
  open,
  creating,
  onCancel,
  onCreate,
  onImport,
}: Props) {
  const [tab, setTab] = useState<'import' | 'create'>('import');
  const [step, setStep] = useState(0);
  const [form] = Form.useForm();
  const [yamlValue, setYamlValue] = useState(DEFAULT_BLUEPRINT_YAML);
  const [registrySelectedId, setRegistrySelectedId] = useState<number | null>(
    null,
  );
  const [installing, setInstalling] = useState(false);

  // Reset on open/close
  useEffect(() => {
    if (!open) {
      setTab('import');
      setStep(0);
      setRegistrySelectedId(null);
      setYamlValue(DEFAULT_BLUEPRINT_YAML);
      form.resetFields();
    }
  }, [open, form]);

  const handleNext = async () => {
    if (step === 0) {
      await form.validateFields(['name']);
    }
    setStep((s) => Math.min(s + 1, CREATE_STEPS.length - 1));
  };

  const handleBack = () => setStep((s) => Math.max(s - 1, 0));

  const handleOk = async () => {
    if (tab === 'import') {
      // Read the selected registry entry ID from ImportTab
      const el = document.getElementById(
        'registry-selected-id',
      ) as HTMLInputElement | null;
      const id = el ? Number(el.dataset.selectedId) : null;
      if (!id) return;
      setInstalling(true);
      try {
        await onImport(id);
      } finally {
        setInstalling(false);
      }
    } else {
      // Create from scratch
      if (step < CREATE_STEPS.length - 1) {
        return handleNext();
      }
      const values = form.getFieldsValue(true);
      await onCreate({
        name: values.name,
        version: values.version || '0.1.0',
        description: values.description,
        sandboxImage: values.sandboxImage,
        defaultAgentType: values.defaultAgentType,
        blueprintYaml: yamlValue,
      });
    }
  };

  const handleCancel = () => {
    if (tab === 'create' && step > 0) {
      handleBack();
      return;
    }
    onCancel();
  };

  const isLastCreateStep = tab === 'create' && step === CREATE_STEPS.length - 1;

  return (
    <Modal
      title="Add Blueprint"
      open={open}
      width={780}
      onCancel={onCancel}
      okText={
        tab === 'import'
          ? 'Install to Project'
          : isLastCreateStep
            ? 'Create'
            : 'Next'
      }
      cancelText={tab === 'create' && step > 0 ? 'Back' : 'Cancel'}
      confirmLoading={creating || installing}
      onOk={handleOk}
      cancelButtonProps={{ onClick: handleCancel }}
    >
      <Tabs
        activeKey={tab}
        onChange={(key) => {
          setTab(key as 'import' | 'create');
          setStep(0);
        }}
        items={[
          {
            key: 'import',
            label: 'Import from Registry',
            children: (
              <ImportTab onImport={onImport} onCancel={onCancel} />
            ),
          },
          {
            key: 'create',
            label: 'Create from Scratch',
            children: (
              <>
                <Steps
                  current={step}
                  items={CREATE_STEPS}
                  size="small"
                />
                <StepContent>
                  <Form form={form} layout="vertical">
                    {/* Step 0: Metadata */}
                    <div
                      style={{
                        display: step === 0 ? 'block' : 'none',
                      }}
                    >
                      <Form.Item
                        label="Blueprint Name"
                        name="name"
                        rules={[
                          {
                            required: true,
                            message: 'Name is required',
                          },
                        ]}
                      >
                        <Input placeholder="e.g. my-analyst-blueprint" />
                      </Form.Item>
                      <Row gutter={16}>
                        <Col span={12}>
                          <Form.Item
                            label="Version"
                            name="version"
                            initialValue="0.1.0"
                          >
                            <Input placeholder="0.1.0" />
                          </Form.Item>
                        </Col>
                        <Col span={12}>
                          <Form.Item
                            label="Agent Type"
                            name="defaultAgentType"
                          >
                            <Input placeholder="e.g. claude, codex" />
                          </Form.Item>
                        </Col>
                      </Row>
                      <Form.Item
                        label="Description"
                        name="description"
                      >
                        <Input placeholder="Short description" />
                      </Form.Item>
                      <Form.Item
                        label="Sandbox Image"
                        name="sandboxImage"
                      >
                        <Input placeholder="e.g. legible-sandbox:latest" />
                      </Form.Item>
                    </div>

                    {/* Step 1: YAML */}
                    <div
                      style={{
                        display: step === 1 ? 'block' : 'none',
                      }}
                    >
                      <Text
                        type="secondary"
                        style={{ display: 'block', marginBottom: 8 }}
                      >
                        Define the full NemoClaw-compatible blueprint
                        specification.
                      </Text>
                      <AceEditor
                        mode="yaml"
                        theme="tomorrow"
                        name="blueprint-yaml-editor"
                        value={yamlValue}
                        onChange={setYamlValue}
                        width="100%"
                        height="320px"
                        fontSize={13}
                        showPrintMargin={false}
                        editorProps={{ $blockScrolling: true }}
                      />
                    </div>

                    {/* Step 2: Review */}
                    {step === 2 && (
                      <div>
                        <Alert
                          type="info"
                          showIcon
                          message="Review before creating."
                          style={{ marginBottom: 16 }}
                        />
                        <Descriptions
                          bordered
                          column={1}
                          size="small"
                        >
                          <Descriptions.Item label="Name">
                            {form.getFieldValue('name')}
                          </Descriptions.Item>
                          <Descriptions.Item label="Version">
                            {form.getFieldValue('version') ||
                              '0.1.0'}
                          </Descriptions.Item>
                          <Descriptions.Item label="Agent Type">
                            {form.getFieldValue(
                              'defaultAgentType',
                            ) || '—'}
                          </Descriptions.Item>
                          <Descriptions.Item label="Image">
                            <Text code>
                              {form.getFieldValue(
                                'sandboxImage',
                              ) || '(none)'}
                            </Text>
                          </Descriptions.Item>
                          <Descriptions.Item label="YAML">
                            <Text code>
                              {yamlValue.split('\n').length}{' '}
                              lines
                            </Text>
                          </Descriptions.Item>
                        </Descriptions>
                      </div>
                    )}
                  </Form>
                </StepContent>
              </>
            ),
          },
        ]}
      />
    </Modal>
  );
}
