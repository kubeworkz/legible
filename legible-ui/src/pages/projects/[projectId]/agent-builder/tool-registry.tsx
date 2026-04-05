import { useState, useMemo } from 'react';
import {
  Button,
  Table,
  Space,
  Input,
  Tag,
  Modal,
  Form,
  Select,
  Switch,
  message,
  Typography,
  Popconfirm,
} from 'antd';
import type { TableColumnsType } from 'antd';
import PlusOutlined from '@ant-design/icons/PlusOutlined';
import ApiOutlined from '@ant-design/icons/ApiOutlined';
import DeleteOutlined from '@ant-design/icons/DeleteOutlined';
import EditOutlined from '@ant-design/icons/EditOutlined';
import SiderLayout from '@/components/layouts/SiderLayout';
import PageLayout from '@/components/layouts/PageLayout';
import {
  useToolDefinitionsQuery,
  useCreateToolDefinitionMutation,
  useUpdateToolDefinitionMutation,
  useDeleteToolDefinitionMutation,
  ToolDefinitionFieldsFragment,
} from '@/apollo/client/graphql/toolDefinitions.generated';

const { TextArea } = Input;

const SOURCE_OPTIONS = [
  { label: 'MCP Server', value: 'mcp' },
  { label: 'Custom API', value: 'custom_api' },
  { label: 'Built-in', value: 'builtin' },
];

const METHOD_OPTIONS = [
  { label: 'GET', value: 'GET' },
  { label: 'POST', value: 'POST' },
  { label: 'PUT', value: 'PUT' },
  { label: 'DELETE', value: 'DELETE' },
];

const SOURCE_COLORS: Record<string, string> = {
  mcp: 'purple',
  custom_api: 'blue',
  builtin: 'green',
};

const refetchOptions = {
  refetchQueries: ['ToolDefinitions'],
  awaitRefetchQueries: true,
};

export default function ToolRegistryPage() {
  const [searchText, setSearchText] = useState('');
  const [sourceFilter, setSourceFilter] = useState<string | undefined>();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTool, setEditingTool] =
    useState<ToolDefinitionFieldsFragment | null>(null);
  const [form] = Form.useForm();

  const { data, loading } = useToolDefinitionsQuery({
    fetchPolicy: 'cache-and-network',
  });
  const [createTool, { loading: creating }] =
    useCreateToolDefinitionMutation(refetchOptions);
  const [updateTool, { loading: updating }] =
    useUpdateToolDefinitionMutation(refetchOptions);
  const [deleteTool] = useDeleteToolDefinitionMutation(refetchOptions);

  const tools = useMemo(() => {
    let list = data?.toolDefinitions ?? [];
    if (sourceFilter) {
      list = list.filter((t) => t.source === sourceFilter);
    }
    if (searchText) {
      const lower = searchText.toLowerCase();
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(lower) ||
          t.description?.toLowerCase().includes(lower),
      );
    }
    return list;
  }, [data, searchText, sourceFilter]);

  const openCreate = () => {
    setEditingTool(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const openEdit = (record: ToolDefinitionFieldsFragment) => {
    setEditingTool(record);
    form.setFieldsValue({
      name: record.name,
      description: record.description,
      source: record.source,
      mcpServerName: record.mcpServerName,
      method: record.method,
      endpoint: record.endpoint,
      inputSchema: record.inputSchema
        ? JSON.stringify(record.inputSchema, null, 2)
        : '',
      outputSchema: record.outputSchema
        ? JSON.stringify(record.outputSchema, null, 2)
        : '',
      enabled: record.enabled,
      tags: record.tags?.join(', ') ?? '',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const payload: any = {
        name: values.name,
        description: values.description,
        source: values.source,
        mcpServerName: values.mcpServerName,
        method: values.method,
        endpoint: values.endpoint,
        enabled: values.enabled,
        tags: values.tags
          ? values.tags
              .split(',')
              .map((t: string) => t.trim())
              .filter(Boolean)
          : undefined,
      };
      if (values.inputSchema) {
        payload.inputSchema = JSON.parse(values.inputSchema);
      }
      if (values.outputSchema) {
        payload.outputSchema = JSON.parse(values.outputSchema);
      }

      if (editingTool) {
        await updateTool({
          variables: { where: { id: editingTool.id }, data: payload },
        });
        message.success('Tool updated');
      } else {
        await createTool({ variables: { data: payload } });
        message.success('Tool created');
      }
      setIsModalOpen(false);
    } catch (err: any) {
      if (err?.message?.includes('JSON')) {
        message.error('Invalid JSON in schema fields');
      }
    }
  };

  const handleDelete = async (id: number) => {
    await deleteTool({ variables: { where: { id } } });
    message.success('Tool deleted');
  };

  const selectedSource = Form.useWatch('source', form);

  const columns: TableColumnsType<ToolDefinitionFieldsFragment> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => (
        <Space>
          <ApiOutlined />
          <Typography.Text strong>{name}</Typography.Text>
        </Space>
      ),
    },
    {
      title: 'Source',
      dataIndex: 'source',
      key: 'source',
      width: 120,
      render: (source: string) => (
        <Tag color={SOURCE_COLORS[source] || 'default'}>{source}</Tag>
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
      title: 'Enabled',
      dataIndex: 'enabled',
      key: 'enabled',
      width: 80,
      render: (enabled: boolean) => (
        <Tag color={enabled ? 'green' : 'default'}>
          {enabled ? 'Yes' : 'No'}
        </Tag>
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 100,
      render: (_: any, record: ToolDefinitionFieldsFragment) => (
        <Space>
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              openEdit(record);
            }}
          />
          <Popconfirm
            title="Delete this tool?"
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

  return (
    <SiderLayout>
      <PageLayout
        title={
          <Space>
            <ApiOutlined /> Tool Registry
          </Space>
        }
        titleExtra={
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Add Tool
          </Button>
        }
      >
        <Space size="middle" style={{ marginBottom: 16 }}>
          <Input.Search
            placeholder="Search tools..."
            allowClear
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 300 }}
          />
          <Select
            placeholder="Filter by source"
            allowClear
            options={SOURCE_OPTIONS}
            onChange={setSourceFilter}
            style={{ width: 160 }}
          />
        </Space>

        <Table
          dataSource={tools}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 20, showSizeChanger: false }}
        />

        <Modal
          title={editingTool ? 'Edit Tool' : 'Add Tool Definition'}
          open={isModalOpen}
          onOk={handleSubmit}
          onCancel={() => setIsModalOpen(false)}
          confirmLoading={creating || updating}
          width={720}
          destroyOnClose
        >
          <Form
            form={form}
            layout="vertical"
            preserve={false}
            initialValues={{ source: 'custom_api', enabled: true }}
          >
            <Form.Item
              name="name"
              label="Name"
              rules={[{ required: true, message: 'Name is required' }]}
            >
              <Input placeholder="e.g. search_database" />
            </Form.Item>
            <Form.Item name="description" label="Description">
              <Input placeholder="What this tool does" />
            </Form.Item>
            <Form.Item
              name="source"
              label="Source"
              rules={[{ required: true }]}
            >
              <Select options={SOURCE_OPTIONS} />
            </Form.Item>

            {selectedSource === 'mcp' && (
              <Form.Item name="mcpServerName" label="MCP Server Name">
                <Input placeholder="e.g. wren-mcp" />
              </Form.Item>
            )}

            {selectedSource === 'custom_api' && (
              <>
                <Space size="large" style={{ width: '100%' }}>
                  <Form.Item name="method" label="HTTP Method">
                    <Select
                      options={METHOD_OPTIONS}
                      style={{ width: 120 }}
                    />
                  </Form.Item>
                  <Form.Item
                    name="endpoint"
                    label="Endpoint URL"
                    style={{ flex: 1 }}
                  >
                    <Input placeholder="https://api.example.com/search" />
                  </Form.Item>
                </Space>
                <Form.Item name="inputSchema" label="Input Schema (JSON)">
                  <TextArea rows={4} placeholder='{"type": "object", ...}' />
                </Form.Item>
                <Form.Item name="outputSchema" label="Output Schema (JSON)">
                  <TextArea rows={3} placeholder='{"type": "object", ...}' />
                </Form.Item>
              </>
            )}

            <Form.Item name="enabled" label="Enabled" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item name="tags" label="Tags (comma-separated)">
              <Input placeholder="search, database, analytics" />
            </Form.Item>
          </Form>
        </Modal>
      </PageLayout>
    </SiderLayout>
  );
}
