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
} from 'antd';
import type { TableColumnsType } from 'antd';
import PlusOutlined from '@ant-design/icons/PlusOutlined';
import FileTextOutlined from '@ant-design/icons/FileTextOutlined';
import DeleteOutlined from '@ant-design/icons/DeleteOutlined';
import EditOutlined from '@ant-design/icons/EditOutlined';
import SiderLayout from '@/components/layouts/SiderLayout';
import PageLayout from '@/components/layouts/PageLayout';
import {
  usePromptTemplatesQuery,
  useCreatePromptTemplateMutation,
  useUpdatePromptTemplateMutation,
  useDeletePromptTemplateMutation,
  PromptTemplateFieldsFragment,
} from '@/apollo/client/graphql/promptTemplates.generated';

const { TextArea } = Input;

const refetchOptions = {
  refetchQueries: ['PromptTemplates'],
  awaitRefetchQueries: true,
};

export default function PromptTemplatesPage() {
  const router = useRouter();
  const [searchText, setSearchText] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] =
    useState<PromptTemplateFieldsFragment | null>(null);
  const [form] = Form.useForm();

  const { data, loading } = usePromptTemplatesQuery({
    fetchPolicy: 'cache-and-network',
  });
  const [createTemplate, { loading: creating }] =
    useCreatePromptTemplateMutation(refetchOptions);
  const [updateTemplate, { loading: updating }] =
    useUpdatePromptTemplateMutation(refetchOptions);
  const [deleteTemplate] = useDeletePromptTemplateMutation(refetchOptions);

  const templates = useMemo(() => {
    const list = data?.promptTemplates ?? [];
    if (!searchText) return list;
    const lower = searchText.toLowerCase();
    return list.filter(
      (t) =>
        t.name.toLowerCase().includes(lower) ||
        t.tags?.some((tag) => tag.toLowerCase().includes(lower)),
    );
  }, [data, searchText]);

  const openCreate = () => {
    setEditingTemplate(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const openEdit = (record: PromptTemplateFieldsFragment) => {
    setEditingTemplate(record);
    form.setFieldsValue({
      name: record.name,
      systemPrompt: record.systemPrompt,
      userPrompt: record.userPrompt,
      model: record.model,
      temperature: record.temperature,
      maxTokens: record.maxTokens,
      tags: record.tags?.join(', ') ?? '',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const data = {
        ...values,
        temperature: values.temperature
          ? Number(values.temperature)
          : undefined,
        maxTokens: values.maxTokens ? Number(values.maxTokens) : undefined,
        tags: values.tags
          ? values.tags
              .split(',')
              .map((t: string) => t.trim())
              .filter(Boolean)
          : undefined,
      };

      if (editingTemplate) {
        await updateTemplate({
          variables: { where: { id: editingTemplate.id }, data },
        });
        message.success('Template updated');
      } else {
        await createTemplate({ variables: { data } });
        message.success('Template created');
      }
      setIsModalOpen(false);
    } catch (err) {
      // form validation error
    }
  };

  const handleDelete = async (id: number) => {
    await deleteTemplate({ variables: { where: { id } } });
    message.success('Template deleted');
  };

  const columns: TableColumnsType<PromptTemplateFieldsFragment> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => (
        <Space>
          <FileTextOutlined />
          <Typography.Text strong>{name}</Typography.Text>
        </Space>
      ),
    },
    {
      title: 'Model',
      dataIndex: 'model',
      key: 'model',
      render: (model: string | null) => model || '—',
    },
    {
      title: 'Version',
      dataIndex: 'currentVersion',
      key: 'currentVersion',
      width: 80,
      render: (v: number) => `v${v}`,
    },
    {
      title: 'Tags',
      dataIndex: 'tags',
      key: 'tags',
      render: (tags: string[] | null) =>
        tags?.map((tag) => (
          <Tag key={tag} color="blue">
            {tag}
          </Tag>
        )) || '—',
    },
    {
      title: 'Updated',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      render: (d: string) => new Date(d).toLocaleDateString(),
    },
    {
      title: '',
      key: 'actions',
      width: 100,
      render: (_: any, record: PromptTemplateFieldsFragment) => (
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
            title="Delete this template?"
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
            <FileTextOutlined /> Prompt Templates
          </Space>
        }
        titleExtra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={openCreate}
          >
            New Template
          </Button>
        }
      >
        <Input.Search
          placeholder="Search by name or tag..."
          allowClear
          onChange={(e) => setSearchText(e.target.value)}
          style={{ maxWidth: 400, marginBottom: 16 }}
        />

        <Table
          dataSource={templates}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 20, showSizeChanger: false }}
        />

        <Modal
          title={editingTemplate ? 'Edit Template' : 'New Prompt Template'}
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
              <Input placeholder="e.g. SQL Analyst Prompt" />
            </Form.Item>
            <Form.Item name="systemPrompt" label="System Prompt">
              <TextArea
                rows={4}
                placeholder="You are a helpful data analyst..."
              />
            </Form.Item>
            <Form.Item name="userPrompt" label="User Prompt Template">
              <TextArea
                rows={4}
                placeholder="Given {{context}}, answer {{question}}"
              />
            </Form.Item>
            <Form.Item name="model" label="Model">
              <Input placeholder="e.g. gpt-4o, claude-sonnet-4-20250514" />
            </Form.Item>
            <Space size="large">
              <Form.Item name="temperature" label="Temperature">
                <Input type="number" step={0.1} min={0} max={2} style={{ width: 120 }} />
              </Form.Item>
              <Form.Item name="maxTokens" label="Max Tokens">
                <Input type="number" min={1} style={{ width: 120 }} />
              </Form.Item>
            </Space>
            <Form.Item name="tags" label="Tags (comma-separated)">
              <Input placeholder="sql, analytics, summarize" />
            </Form.Item>
          </Form>
        </Modal>
      </PageLayout>
    </SiderLayout>
  );
}
