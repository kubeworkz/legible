import { useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import {
  Button,
  Table,
  Space,
  Input,
  Tag,
  Modal,
  Form,
  message,
  Typography,
  Popconfirm,
  Select,
  InputNumber,
  Tabs,
  Descriptions,
  Timeline,
  Switch,
  Divider,
} from 'antd';
import type { TableColumnsType } from 'antd';
import PlusOutlined from '@ant-design/icons/PlusOutlined';
import RobotOutlined from '@ant-design/icons/RobotOutlined';
import DeleteOutlined from '@ant-design/icons/DeleteOutlined';
import CheckCircleOutlined from '@ant-design/icons/CheckCircleOutlined';
import CloudUploadOutlined from '@ant-design/icons/CloudUploadOutlined';
import StopOutlined from '@ant-design/icons/StopOutlined';
import EditOutlined from '@ant-design/icons/EditOutlined';
import EyeOutlined from '@ant-design/icons/EyeOutlined';
import MessageOutlined from '@ant-design/icons/MessageOutlined';
import SiderLayout from '@/components/layouts/SiderLayout';
import PageLayout from '@/components/layouts/PageLayout';
import {
  useAgentDefinitionsQuery,
  useAgentDefinitionQuery,
  useAgentDefinitionVersionsQuery,
  useCreateAgentDefinitionMutation,
  useUpdateAgentDefinitionMutation,
  useDeleteAgentDefinitionMutation,
  usePublishAgentDefinitionMutation,
  useDeployAgentDefinitionMutation,
  useArchiveAgentDefinitionMutation,
  AgentDefinitionFieldsFragment,
} from '@/apollo/client/graphql/agentDefinitions.generated';
import { useWorkflowsQuery } from '@/apollo/client/graphql/workflows.generated';
import { useToolDefinitionsQuery } from '@/apollo/client/graphql/toolDefinitions.generated';
import { Path, buildPath } from '@/utils/enum';

const STATUS_COLORS: Record<string, string> = {
  draft: 'default',
  published: 'blue',
  deployed: 'green',
  archived: 'red',
};

const refetchOptions = {
  refetchQueries: ['AgentDefinitions'],
  awaitRefetchQueries: true,
};

export default function AgentDefinitionsPage() {
  const router = useRouter();
  const projectId = router.query.projectId as string;
  const [searchText, setSearchText] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [editingAgent, setEditingAgent] =
    useState<AgentDefinitionFieldsFragment | null>(null);
  const [detailAgentId, setDetailAgentId] = useState<number | null>(null);
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [publishAgentId, setPublishAgentId] = useState<number | null>(null);
  const [changeNote, setChangeNote] = useState('');
  const [form] = Form.useForm();

  // Data queries
  const { data, loading } = useAgentDefinitionsQuery({
    fetchPolicy: 'cache-and-network',
  });
  const { data: workflowsData } = useWorkflowsQuery({
    fetchPolicy: 'cache-and-network',
  });
  const { data: toolsData } = useToolDefinitionsQuery({
    fetchPolicy: 'cache-and-network',
  });

  // Detail query
  const { data: detailData } = useAgentDefinitionQuery({
    variables: { where: { id: detailAgentId! } },
    skip: !detailAgentId,
    fetchPolicy: 'cache-and-network',
  });

  // Version history
  const { data: versionsData } = useAgentDefinitionVersionsQuery({
    variables: { agentDefinitionId: detailAgentId! },
    skip: !detailAgentId,
    fetchPolicy: 'cache-and-network',
  });

  // Mutations
  const [createAgent, { loading: creating }] =
    useCreateAgentDefinitionMutation(refetchOptions);
  const [updateAgent, { loading: updating }] =
    useUpdateAgentDefinitionMutation(refetchOptions);
  const [deleteAgent] = useDeleteAgentDefinitionMutation(refetchOptions);
  const [publishAgent] = usePublishAgentDefinitionMutation(refetchOptions);
  const [deployAgent] = useDeployAgentDefinitionMutation(refetchOptions);
  const [archiveAgent] = useArchiveAgentDefinitionMutation(refetchOptions);

  const agents = useMemo(() => {
    const list = data?.agentDefinitions ?? [];
    if (!searchText) return list;
    const lower = searchText.toLowerCase();
    return list.filter(
      (a) =>
        a.name.toLowerCase().includes(lower) ||
        a.description?.toLowerCase().includes(lower),
    );
  }, [data, searchText]);

  const workflows = workflowsData?.workflows ?? [];
  const tools = toolsData?.toolDefinitions ?? [];

  const openCreate = () => {
    setEditingAgent(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const openEdit = (record: AgentDefinitionFieldsFragment) => {
    setEditingAgent(record);
    const mc = record.memoryConfig as any;
    form.setFieldsValue({
      name: record.name,
      description: record.description,
      workflowId: record.workflowId,
      systemPrompt: record.systemPrompt,
      toolIds: record.toolIds || [],
      model: record.model,
      temperature: record.temperature,
      maxTokens: record.maxTokens,
      tags: record.tags || [],
      memoryStrategy: mc?.strategy || 'sliding_window',
      memoryMaxMessages: mc?.maxMessages,
      memoryMaxTokens: mc?.maxTokens,
      memoryRagEnabled: mc?.ragEnabled !== false,
      memoryRagMaxResults: mc?.ragMaxResults,
    });
    setIsModalOpen(true);
  };

  const openDetail = (id: number) => {
    setDetailAgentId(id);
    setIsDetailOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const memoryConfig = {
        strategy: values.memoryStrategy || 'sliding_window',
        maxMessages: values.memoryMaxMessages || undefined,
        maxTokens: values.memoryMaxTokens || undefined,
        ragEnabled: values.memoryRagEnabled !== false,
        ragMaxResults: values.memoryRagMaxResults || undefined,
      };
      const payload = {
        name: values.name,
        description: values.description || undefined,
        workflowId: values.workflowId || undefined,
        systemPrompt: values.systemPrompt || undefined,
        toolIds: values.toolIds?.length ? values.toolIds : undefined,
        model: values.model || undefined,
        temperature: values.temperature ?? undefined,
        maxTokens: values.maxTokens || undefined,
        tags: values.tags?.length ? values.tags : undefined,
        memoryConfig,
      };

      if (editingAgent) {
        await updateAgent({
          variables: { where: { id: editingAgent.id }, data: payload },
        });
        message.success('Agent definition updated');
      } else {
        await createAgent({ variables: { data: payload } });
        message.success('Agent definition created');
      }
      setIsModalOpen(false);
    } catch (err: any) {
      message.error(err?.message || 'Failed to save agent definition');
    }
  };

  const handleDelete = async (id: number) => {
    await deleteAgent({ variables: { where: { id } } });
    message.success('Agent definition deleted');
  };

  const handlePublish = async () => {
    if (!publishAgentId) return;
    try {
      await publishAgent({
        variables: { where: { id: publishAgentId }, changeNote: changeNote || undefined },
      });
      message.success('Agent definition published');
      setPublishModalOpen(false);
      setChangeNote('');
    } catch (err: any) {
      message.error(err?.message || 'Failed to publish');
    }
  };

  const handleDeploy = async (id: number) => {
    try {
      await deployAgent({ variables: { where: { id } } });
      message.success('Agent definition deployed');
    } catch (err: any) {
      message.error(err?.message || 'Failed to deploy');
    }
  };

  const handleArchive = async (id: number) => {
    await archiveAgent({ variables: { where: { id } } });
    message.success('Agent definition archived');
  };

  const columns: TableColumnsType<AgentDefinitionFieldsFragment> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record) => (
        <Space>
          <RobotOutlined />
          <Typography.Text strong>{name}</Typography.Text>
          {record.tags?.map((tag) => (
            <Tag key={tag} style={{ fontSize: 11 }}>
              {tag}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (d: string | null) => d || '—',
    },
    {
      title: 'Model',
      dataIndex: 'model',
      key: 'model',
      width: 140,
      render: (m: string | null) => m || '—',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (status: string) => (
        <Tag color={STATUS_COLORS[status] || 'default'}>{status}</Tag>
      ),
    },
    {
      title: 'Version',
      dataIndex: 'currentVersion',
      key: 'currentVersion',
      width: 90,
      render: (v: number) => `v${v}`,
    },
    {
      title: '',
      key: 'actions',
      width: 260,
      render: (_: any, record: AgentDefinitionFieldsFragment) => (
        <Space>
          <Button
            type="text"
            size="small"
            icon={<MessageOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              router.push(
                buildPath(Path.AgentBuilderAgentChat, projectId).replace(
                  '[agentId]',
                  String(record.id),
                ),
              );
            }}
            title="Chat"
          />
          <Button
            type="text"
            size="small"
            icon={<EyeOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              openDetail(record.id);
            }}
            title="View Details"
          />
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              openEdit(record);
            }}
            title="Edit"
          />
          {record.status === 'draft' && (
            <Button
              type="text"
              size="small"
              icon={<CheckCircleOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                setPublishAgentId(record.id);
                setPublishModalOpen(true);
              }}
              title="Publish"
            />
          )}
          {record.status === 'published' && (
            <Button
              type="text"
              size="small"
              icon={<CloudUploadOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                handleDeploy(record.id);
              }}
              title="Deploy"
            />
          )}
          {(record.status === 'published' || record.status === 'deployed') && (
            <Button
              type="text"
              size="small"
              icon={<StopOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                handleArchive(record.id);
              }}
              title="Archive"
            />
          )}
          <Popconfirm
            title="Delete this agent definition?"
            onConfirm={(e) => {
              e?.stopPropagation();
              handleDelete(record.id);
            }}
            onCancel={(e) => e?.stopPropagation()}
          >
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={(e) => e.stopPropagation()}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const detailAgent = detailData?.agentDefinition;
  const versions = versionsData?.agentDefinitionVersions ?? [];

  return (
    <SiderLayout>
      <PageLayout
        title={
          <Space>
            <RobotOutlined /> Agent Definitions
          </Space>
        }
        description="Define deployable agents that combine a workflow, system prompt, tools, and memory configuration."
        titleExtra={
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            New Agent
          </Button>
        }
      >
        <Input.Search
          placeholder="Search agents..."
          allowClear
          onChange={(e) => setSearchText(e.target.value)}
          style={{ maxWidth: 400, marginBottom: 16 }}
        />

        <Table
          dataSource={agents}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 20, showSizeChanger: false }}
          onRow={(record) => ({
            onClick: () => openDetail(record.id),
            style: { cursor: 'pointer' },
          })}
        />

        {/* Create / Edit Modal */}
        <Modal
          title={editingAgent ? 'Edit Agent Definition' : 'New Agent Definition'}
          open={isModalOpen}
          onOk={handleSubmit}
          onCancel={() => setIsModalOpen(false)}
          confirmLoading={creating || updating}
          width={720}
          destroyOnClose
        >
          <Form form={form} layout="vertical" preserve={false}>
            <Form.Item
              name="name"
              label="Name"
              rules={[{ required: true, message: 'Name is required' }]}
            >
              <Input placeholder="e.g. Customer Support Agent" />
            </Form.Item>
            <Form.Item name="description" label="Description">
              <Input.TextArea
                placeholder="What this agent does"
                rows={2}
              />
            </Form.Item>
            <Form.Item name="systemPrompt" label="System Prompt">
              <Input.TextArea
                placeholder="You are a helpful assistant that..."
                rows={4}
              />
            </Form.Item>
            <Form.Item name="workflowId" label="Workflow">
              <Select
                allowClear
                placeholder="Select a workflow (optional)"
                options={workflows.map((w) => ({
                  label: w.name,
                  value: w.id,
                }))}
              />
            </Form.Item>
            <Form.Item name="toolIds" label="Tools">
              <Select
                mode="multiple"
                allowClear
                placeholder="Select tools (optional)"
                options={tools.map((t) => ({
                  label: t.name,
                  value: t.id,
                }))}
              />
            </Form.Item>
            <Space size="large">
              <Form.Item name="model" label="Model">
                <Input placeholder="e.g. gpt-4o" style={{ width: 200 }} />
              </Form.Item>
              <Form.Item name="temperature" label="Temperature">
                <InputNumber
                  min={0}
                  max={2}
                  step={0.1}
                  style={{ width: 120 }}
                />
              </Form.Item>
              <Form.Item name="maxTokens" label="Max Tokens">
                <InputNumber min={1} style={{ width: 140 }} />
              </Form.Item>
            </Space>
            <Form.Item name="tags" label="Tags">
              <Select
                mode="tags"
                placeholder="Add tags"
                style={{ width: '100%' }}
              />
            </Form.Item>

            <Divider orientation="left" plain>
              Memory &amp; Context
            </Divider>

            <Space size="large">
              <Form.Item
                name="memoryStrategy"
                label="Strategy"
                initialValue="sliding_window"
              >
                <Select style={{ width: 180 }}>
                  <Select.Option value="sliding_window">
                    Sliding Window
                  </Select.Option>
                  <Select.Option value="summarize">
                    Summarize
                  </Select.Option>
                </Select>
              </Form.Item>
              <Form.Item name="memoryMaxMessages" label="Max Messages">
                <InputNumber min={0} placeholder="50" style={{ width: 120 }} />
              </Form.Item>
              <Form.Item name="memoryMaxTokens" label="Token Budget">
                <InputNumber
                  min={0}
                  step={1000}
                  placeholder="8000"
                  style={{ width: 140 }}
                />
              </Form.Item>
            </Space>
            <Space size="large">
              <Form.Item
                name="memoryRagEnabled"
                label="Knowledge Base RAG"
                valuePropName="checked"
                initialValue={true}
              >
                <Switch />
              </Form.Item>
              <Form.Item name="memoryRagMaxResults" label="RAG Max Results">
                <InputNumber min={1} max={20} placeholder="5" style={{ width: 120 }} />
              </Form.Item>
            </Space>
          </Form>
        </Modal>

        {/* Publish Modal */}
        <Modal
          title="Publish Agent Definition"
          open={publishModalOpen}
          onOk={handlePublish}
          onCancel={() => {
            setPublishModalOpen(false);
            setChangeNote('');
          }}
          okText="Publish"
        >
          <Typography.Paragraph>
            Publishing creates a versioned snapshot. You can optionally add a change note.
          </Typography.Paragraph>
          <Input.TextArea
            value={changeNote}
            onChange={(e) => setChangeNote(e.target.value)}
            placeholder="What changed in this version? (optional)"
            rows={3}
          />
        </Modal>

        {/* Detail Drawer (Modal) */}
        <Modal
          title={detailAgent ? detailAgent.name : 'Agent Details'}
          open={isDetailOpen}
          onCancel={() => {
            setIsDetailOpen(false);
            setDetailAgentId(null);
          }}
          footer={null}
          width={800}
        >
          {detailAgent && (
            <Tabs
              items={[
                {
                  key: 'overview',
                  label: 'Overview',
                  children: (
                    <Descriptions column={2} bordered size="small">
                      <Descriptions.Item label="Status">
                        <Tag color={STATUS_COLORS[detailAgent.status]}>
                          {detailAgent.status}
                        </Tag>
                      </Descriptions.Item>
                      <Descriptions.Item label="Version">
                        v{detailAgent.currentVersion}
                      </Descriptions.Item>
                      <Descriptions.Item label="Model">
                        {detailAgent.model || '—'}
                      </Descriptions.Item>
                      <Descriptions.Item label="Temperature">
                        {detailAgent.temperature ?? '—'}
                      </Descriptions.Item>
                      <Descriptions.Item label="Max Tokens">
                        {detailAgent.maxTokens ?? '—'}
                      </Descriptions.Item>
                      <Descriptions.Item label="Workflow">
                        {workflows.find((w) => w.id === detailAgent.workflowId)
                          ?.name || '—'}
                      </Descriptions.Item>
                      <Descriptions.Item label="Tools" span={2}>
                        {detailAgent.toolIds?.length
                          ? detailAgent.toolIds
                              .map(
                                (tid) =>
                                  tools.find((t) => t.id === tid)?.name || `#${tid}`,
                              )
                              .join(', ')
                          : '—'}
                      </Descriptions.Item>
                      <Descriptions.Item label="System Prompt" span={2}>
                        <Typography.Paragraph
                          style={{
                            maxHeight: 200,
                            overflow: 'auto',
                            marginBottom: 0,
                            whiteSpace: 'pre-wrap',
                          }}
                        >
                          {detailAgent.systemPrompt || '—'}
                        </Typography.Paragraph>
                      </Descriptions.Item>
                      <Descriptions.Item label="Tags" span={2}>
                        {detailAgent.tags?.map((t) => (
                          <Tag key={t}>{t}</Tag>
                        )) || '—'}
                      </Descriptions.Item>
                      <Descriptions.Item label="Memory Strategy">
                        {(detailAgent.memoryConfig as any)?.strategy || 'sliding_window'}
                      </Descriptions.Item>
                      <Descriptions.Item label="RAG Enabled">
                        {(detailAgent.memoryConfig as any)?.ragEnabled !== false
                          ? 'Yes'
                          : 'No'}
                      </Descriptions.Item>
                      <Descriptions.Item label="Max Messages">
                        {(detailAgent.memoryConfig as any)?.maxMessages ?? '50 (default)'}
                      </Descriptions.Item>
                      <Descriptions.Item label="Token Budget">
                        {(detailAgent.memoryConfig as any)?.maxTokens ?? '8000 (default)'}
                      </Descriptions.Item>
                      <Descriptions.Item label="Created">
                        {new Date(detailAgent.createdAt).toLocaleString()}
                      </Descriptions.Item>
                      <Descriptions.Item label="Updated">
                        {new Date(detailAgent.updatedAt).toLocaleString()}
                      </Descriptions.Item>
                    </Descriptions>
                  ),
                },
                {
                  key: 'versions',
                  label: 'Version History',
                  children: (
                    <Timeline
                      items={versions.map((v) => ({
                        children: (
                          <div>
                            <Typography.Text strong>
                              v{v.version}
                            </Typography.Text>
                            {v.changeNote && (
                              <Typography.Text
                                type="secondary"
                                style={{ marginLeft: 8 }}
                              >
                                — {v.changeNote}
                              </Typography.Text>
                            )}
                            <br />
                            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                              {new Date(v.createdAt).toLocaleString()}
                              {v.model && ` · ${v.model}`}
                            </Typography.Text>
                          </div>
                        ),
                      }))}
                    />
                  ),
                },
                ...(detailAgent.status === 'deployed'
                  ? [
                      {
                        key: 'api',
                        label: 'API Endpoint',
                        children: (() => {
                          const host =
                            typeof window !== 'undefined'
                              ? window.location.origin
                              : 'http://localhost:3000';
                          const base = `${host}/api/v1/agents/${detailAgent.id}`;
                          return (
                            <div>
                              <Descriptions
                                column={1}
                                bordered
                                size="small"
                                style={{ marginBottom: 16 }}
                              >
                                <Descriptions.Item label="Status">
                                  <Tag color="green">Live</Tag>
                                </Descriptions.Item>
                                <Descriptions.Item label="Deployed At">
                                  {detailAgent.deployedAt
                                    ? new Date(
                                        detailAgent.deployedAt,
                                      ).toLocaleString()
                                    : '—'}
                                </Descriptions.Item>
                                <Descriptions.Item label="Base URL">
                                  <Typography.Text code copyable>
                                    {base}
                                  </Typography.Text>
                                </Descriptions.Item>
                              </Descriptions>

                              <Typography.Title level={5}>
                                Quick Start
                              </Typography.Title>
                              <Typography.Paragraph type="secondary">
                                Use any Project API Key (
                                <code>psk-...</code>) as the Bearer token.
                              </Typography.Paragraph>

                              <Typography.Text strong>
                                1. Create a session
                              </Typography.Text>
                              <pre
                                style={{
                                  background: 'var(--gray-2)',
                                  padding: 12,
                                  borderRadius: 6,
                                  fontSize: 12,
                                  overflow: 'auto',
                                  marginBottom: 12,
                                }}
                              >{`curl -X POST ${base}/sessions \\
  -H "Authorization: Bearer YOUR_PROJECT_API_KEY" \\
  -H "X-Project-Id: ${detailAgent.projectId}"`}</pre>

                              <Typography.Text strong>
                                2. Send a message
                              </Typography.Text>
                              <pre
                                style={{
                                  background: 'var(--gray-2)',
                                  padding: 12,
                                  borderRadius: 6,
                                  fontSize: 12,
                                  overflow: 'auto',
                                  marginBottom: 12,
                                }}
                              >{`curl -X POST ${base}/sessions/SESSION_ID/messages \\
  -H "Authorization: Bearer YOUR_PROJECT_API_KEY" \\
  -H "X-Project-Id: ${detailAgent.projectId}" \\
  -H "Content-Type: application/json" \\
  -d '{"message": "Hello, agent!"}'`}</pre>

                              <Typography.Text strong>
                                3. List messages
                              </Typography.Text>
                              <pre
                                style={{
                                  background: 'var(--gray-2)',
                                  padding: 12,
                                  borderRadius: 6,
                                  fontSize: 12,
                                  overflow: 'auto',
                                }}
                              >{`curl ${base}/sessions/SESSION_ID/messages \\
  -H "Authorization: Bearer YOUR_PROJECT_API_KEY" \\
  -H "X-Project-Id: ${detailAgent.projectId}"`}</pre>
                            </div>
                          );
                        })(),
                      },
                    ]
                  : []),
              ]}
            />
          )}
        </Modal>
      </PageLayout>
    </SiderLayout>
  );
}
