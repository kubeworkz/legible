import { useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import {
  Button,
  Card,
  Col,
  Descriptions,
  Form,
  Input,
  message,
  Modal,
  Row,
  Space,
  Spin,
  Table,
  TableColumnsType,
  Tabs,
  Tag,
  Typography,
} from 'antd';
import ArrowLeftOutlined from '@ant-design/icons/ArrowLeftOutlined';
import BlockOutlined from '@ant-design/icons/BlockOutlined';
import DeleteOutlined from '@ant-design/icons/DeleteOutlined';
import EditOutlined from '@ant-design/icons/EditOutlined';
import SaveOutlined from '@ant-design/icons/SaveOutlined';
import CloseOutlined from '@ant-design/icons/CloseOutlined';
import ExclamationCircleOutlined from '@ant-design/icons/ExclamationCircleOutlined';
import SiderLayout from '@/components/layouts/SiderLayout';
import PageLayout from '@/components/layouts/PageLayout';
import { Path, buildPath } from '@/utils/enum';
import { getCompactTime } from '@/utils/time';
import useProject from '@/hooks/useProject';
import {
  BlueprintData,
  useBlueprintQuery,
  useUpdateBlueprintMutation,
  useDeleteBlueprintMutation,
} from '@/apollo/client/graphql/blueprints.generated';
import {
  AgentFieldsFragment,
  useAgentsQuery,
} from '@/apollo/client/graphql/agents.generated';
import dynamic from 'next/dynamic';

const AceEditor = dynamic(() => import('@/components/editor/AceEditor'), {
  ssr: false,
});

const { Text, Paragraph } = Typography;

// ── Overview Tab ────────────────────────────────────────────────

function OverviewTab({ blueprint }: { blueprint: BlueprintData }) {
  const profileNames = blueprint.inferenceProfiles
    ? Object.keys(blueprint.inferenceProfiles)
    : [];

  return (
    <Row gutter={[24, 24]}>
      <Col span={12}>
        <Descriptions column={1} size="small" bordered>
          <Descriptions.Item label="ID">{blueprint.id}</Descriptions.Item>
          <Descriptions.Item label="Name">
            <Text strong>{blueprint.name}</Text>
            {blueprint.isBuiltin && (
              <Tag color="blue" style={{ marginLeft: 8 }}>
                built-in
              </Tag>
            )}
          </Descriptions.Item>
          <Descriptions.Item label="Version">
            {blueprint.version}
          </Descriptions.Item>
          <Descriptions.Item label="Description">
            {blueprint.description || (
              <Text type="secondary">—</Text>
            )}
          </Descriptions.Item>
          <Descriptions.Item label="Agent Type">
            {blueprint.defaultAgentType || (
              <Text type="secondary">—</Text>
            )}
          </Descriptions.Item>
          <Descriptions.Item label="Sandbox Image">
            {blueprint.sandboxImage ? (
              <Text code>{blueprint.sandboxImage}</Text>
            ) : (
              <Text type="secondary">—</Text>
            )}
          </Descriptions.Item>
        </Descriptions>
      </Col>
      <Col span={12}>
        <Descriptions column={1} size="small" bordered>
          <Descriptions.Item label="Category">
            {blueprint.category || <Text type="secondary">—</Text>}
          </Descriptions.Item>
          <Descriptions.Item label="Source">
            {blueprint.source || <Text type="secondary">—</Text>}
          </Descriptions.Item>
          <Descriptions.Item label="Connectors">
            {blueprint.supportedConnectors?.length ? (
              blueprint.supportedConnectors.map((c) => (
                <Tag key={c}>{c}</Tag>
              ))
            ) : (
              <Text type="secondary">—</Text>
            )}
          </Descriptions.Item>
          <Descriptions.Item label="Tags">
            {blueprint.tags?.length ? (
              blueprint.tags.map((t) => (
                <Tag key={t} color="purple">
                  {t}
                </Tag>
              ))
            ) : (
              <Text type="secondary">—</Text>
            )}
          </Descriptions.Item>
          <Descriptions.Item label="Inference Profiles">
            {profileNames.length ? (
              profileNames.map((name) => (
                <Tag key={name} color="geekblue">
                  {name}
                </Tag>
              ))
            ) : (
              <Text type="secondary">—</Text>
            )}
          </Descriptions.Item>
          <Descriptions.Item label="Created">
            {getCompactTime(blueprint.createdAt)}
          </Descriptions.Item>
          <Descriptions.Item label="Updated">
            {getCompactTime(blueprint.updatedAt)}
          </Descriptions.Item>
        </Descriptions>
      </Col>
    </Row>
  );
}

// ── YAML Tab ────────────────────────────────────────────────────

function YamlTab({
  blueprint,
  onSave,
  saving,
}: {
  blueprint: BlueprintData;
  onSave: (yaml: string) => Promise<void>;
  saving: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(blueprint.blueprintYaml);

  const handleEdit = () => {
    setDraft(blueprint.blueprintYaml);
    setEditing(true);
  };

  const handleCancel = () => {
    setDraft(blueprint.blueprintYaml);
    setEditing(false);
  };

  const handleSave = async () => {
    await onSave(draft);
    setEditing(false);
  };

  if (!editing) {
    return (
      <div>
        {!blueprint.isBuiltin && (
          <div style={{ marginBottom: 12 }}>
            <Button icon={<EditOutlined />} onClick={handleEdit}>
              Edit YAML
            </Button>
          </div>
        )}
        <Card size="small">
          <AceEditor
            mode="yaml"
            theme="tomorrow"
            value={blueprint.blueprintYaml}
            width="100%"
            height="500px"
            readOnly
            showPrintMargin={false}
            tabSize={2}
            setOptions={{ useWorker: false }}
          />
        </Card>
      </div>
    );
  }

  return (
    <div>
      <Space style={{ marginBottom: 12 }}>
        <Button
          type="primary"
          icon={<SaveOutlined />}
          loading={saving}
          onClick={handleSave}
        >
          Save
        </Button>
        <Button icon={<CloseOutlined />} onClick={handleCancel}>
          Cancel
        </Button>
      </Space>
      <Card size="small">
        <AceEditor
          mode="yaml"
          theme="tomorrow"
          value={draft}
          onChange={setDraft}
          width="100%"
          height="500px"
          showPrintMargin={false}
          tabSize={2}
          setOptions={{ useWorker: false }}
        />
      </Card>
    </div>
  );
}

// ── Agents Tab ──────────────────────────────────────────────────

function AgentsTab({ blueprintId }: { blueprintId: number }) {
  const router = useRouter();
  const { currentProjectId } = useProject();
  const { data, loading } = useAgentsQuery({
    fetchPolicy: 'cache-and-network',
  });

  const agents = useMemo(
    () =>
      (data?.agents || []).filter((a) => a.blueprintId === blueprintId),
    [data, blueprintId],
  );

  const columns: TableColumnsType<AgentFieldsFragment> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => <Text strong>{name}</Text>,
    },
    {
      title: 'Sandbox',
      dataIndex: 'sandboxName',
      key: 'sandboxName',
      render: (name: string) => <Text code>{name}</Text>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => {
        const colors: Record<string, string> = {
          CREATING: 'blue',
          RUNNING: 'green',
          STOPPED: 'default',
          FAILED: 'red',
        };
        return <Tag color={colors[status] || 'default'}>{status}</Tag>;
      },
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (ts: string) => getCompactTime(ts),
    },
  ];

  return (
    <Table
      dataSource={agents}
      columns={columns}
      rowKey="id"
      loading={loading}
      pagination={false}
      locale={{ emptyText: 'No agents are using this blueprint.' }}
      size="small"
      onRow={(record) => ({
        onClick: () => {
          const base = buildPath(Path.Agents, currentProjectId);
          router.push(`${base}/${record.id}`);
        },
        style: { cursor: 'pointer' },
      })}
    />
  );
}

// ── Settings Tab ────────────────────────────────────────────────

function SettingsTab({
  blueprint,
  onSave,
  saving,
}: {
  blueprint: BlueprintData;
  onSave: (data: Record<string, any>) => Promise<void>;
  saving: boolean;
}) {
  const [form] = Form.useForm();

  const handleSubmit = async () => {
    const values = await form.validateFields();
    await onSave({
      version: values.version || undefined,
      description: values.description || undefined,
      sandboxImage: values.sandboxImage || undefined,
      defaultAgentType: values.defaultAgentType || undefined,
    });
  };

  return (
    <Card size="small" style={{ maxWidth: 600 }}>
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          version: blueprint.version,
          description: blueprint.description || '',
          sandboxImage: blueprint.sandboxImage || '',
          defaultAgentType: blueprint.defaultAgentType || '',
        }}
      >
        <Form.Item label="Version" name="version">
          <Input placeholder="0.1.0" disabled={blueprint.isBuiltin} />
        </Form.Item>
        <Form.Item label="Description" name="description">
          <Input.TextArea
            rows={3}
            placeholder="Short description"
            disabled={blueprint.isBuiltin}
          />
        </Form.Item>
        <Form.Item label="Sandbox Image" name="sandboxImage">
          <Input
            placeholder="legible-sandbox:latest"
            disabled={blueprint.isBuiltin}
          />
        </Form.Item>
        <Form.Item label="Default Agent Type" name="defaultAgentType">
          <Input
            placeholder="claude, codex, opencode"
            disabled={blueprint.isBuiltin}
          />
        </Form.Item>
        {!blueprint.isBuiltin && (
          <Form.Item>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={saving}
              onClick={handleSubmit}
            >
              Save Settings
            </Button>
          </Form.Item>
        )}
      </Form>
    </Card>
  );
}

// ── Page ────────────────────────────────────────────────────────

export default function BlueprintDetailPage() {
  const router = useRouter();
  const { currentProjectId } = useProject();
  const blueprintId = Number(router.query.blueprintId);

  const { data, loading } = useBlueprintQuery(blueprintId || 0);

  const [updateBlueprint] = useUpdateBlueprintMutation();
  const [deleteBlueprint] = useDeleteBlueprintMutation();
  const [savingYaml, setSavingYaml] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  const blueprint = useMemo(() => data?.blueprint ?? null, [data]);

  const handleBack = () => {
    router.push(buildPath(Path.Blueprints, currentProjectId));
  };

  const handleSaveYaml = async (yaml: string) => {
    if (!blueprint) return;
    setSavingYaml(true);
    try {
      await updateBlueprint({
        variables: {
          where: { id: blueprint.id },
          data: { blueprintYaml: yaml },
        },
      });
      message.success('Blueprint YAML saved');
    } catch (err: any) {
      message.error(err?.message || 'Failed to save YAML');
    } finally {
      setSavingYaml(false);
    }
  };

  const handleSaveSettings = async (fields: Record<string, any>) => {
    if (!blueprint) return;
    setSavingSettings(true);
    try {
      await updateBlueprint({
        variables: {
          where: { id: blueprint.id },
          data: fields,
        },
      });
      message.success('Blueprint settings saved');
    } catch (err: any) {
      message.error(err?.message || 'Failed to save settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleDelete = () => {
    if (!blueprint) return;
    Modal.confirm({
      title: `Delete blueprint "${blueprint.name}"?`,
      icon: <ExclamationCircleOutlined />,
      content:
        'Agents created from this blueprint will continue running, but no new agents can use it.',
      okText: 'Delete',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await deleteBlueprint({
            variables: { where: { id: blueprint.id } },
          });
          message.success(`Blueprint "${blueprint.name}" deleted`);
          handleBack();
        } catch (err: any) {
          message.error(err?.message || 'Failed to delete blueprint');
        }
      },
    });
  };

  if (loading && !blueprint) {
    return (
      <SiderLayout>
        <div style={{ textAlign: 'center', padding: 64 }}>
          <Spin size="large" />
        </div>
      </SiderLayout>
    );
  }

  if (!blueprint) {
    return (
      <SiderLayout>
        <PageLayout title="Blueprint not found">
          <Paragraph>The requested blueprint could not be found.</Paragraph>
          <Button onClick={handleBack}>Back to Blueprints</Button>
        </PageLayout>
      </SiderLayout>
    );
  }

  const tabItems = [
    {
      key: 'overview',
      label: 'Overview',
      children: <OverviewTab blueprint={blueprint} />,
    },
    {
      key: 'yaml',
      label: 'Blueprint YAML',
      children: (
        <YamlTab
          blueprint={blueprint}
          onSave={handleSaveYaml}
          saving={savingYaml}
        />
      ),
    },
    {
      key: 'agents',
      label: 'Agents',
      children: <AgentsTab blueprintId={blueprint.id} />,
    },
    ...(!blueprint.isBuiltin
      ? [
          {
            key: 'settings',
            label: 'Settings',
            children: (
              <SettingsTab
                blueprint={blueprint}
                onSave={handleSaveSettings}
                saving={savingSettings}
              />
            ),
          },
        ]
      : []),
  ];

  return (
    <SiderLayout>
      <PageLayout
        title={
          <Space>
            <Button
              type="text"
              size="small"
              icon={<ArrowLeftOutlined />}
              onClick={handleBack}
            />
            <BlockOutlined style={{ fontSize: 20 }} />
            {blueprint.name}
            {blueprint.isBuiltin && <Tag color="blue">built-in</Tag>}
            <Tag>{blueprint.version}</Tag>
          </Space>
        }
        titleExtra={
          !blueprint.isBuiltin ? (
            <Button
              danger
              icon={<DeleteOutlined />}
              onClick={handleDelete}
            >
              Delete
            </Button>
          ) : undefined
        }
      >
        <Tabs items={tabItems} defaultActiveKey="overview" />
      </PageLayout>
    </SiderLayout>
  );
}
