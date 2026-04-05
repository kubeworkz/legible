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
import ApartmentOutlined from '@ant-design/icons/ApartmentOutlined';
import DeleteOutlined from '@ant-design/icons/DeleteOutlined';
import EditOutlined from '@ant-design/icons/EditOutlined';
import CheckCircleOutlined from '@ant-design/icons/CheckCircleOutlined';
import StopOutlined from '@ant-design/icons/StopOutlined';
import NodeIndexOutlined from '@ant-design/icons/NodeIndexOutlined';
import SiderLayout from '@/components/layouts/SiderLayout';
import PageLayout from '@/components/layouts/PageLayout';
import {
  useWorkflowsQuery,
  useCreateWorkflowMutation,
  useUpdateWorkflowMutation,
  useDeleteWorkflowMutation,
  usePublishWorkflowMutation,
  useArchiveWorkflowMutation,
  WorkflowFieldsFragment,
} from '@/apollo/client/graphql/workflows.generated';

const { TextArea } = Input;

const STATUS_COLORS: Record<string, string> = {
  draft: 'default',
  published: 'green',
  archived: 'red',
};

const refetchOptions = {
  refetchQueries: ['Workflows'],
  awaitRefetchQueries: true,
};

export default function WorkflowsPage() {
  const router = useRouter();
  const projectId = router.query.projectId as string;
  const [searchText, setSearchText] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWorkflow, setEditingWorkflow] =
    useState<WorkflowFieldsFragment | null>(null);
  const [form] = Form.useForm();

  const { data, loading } = useWorkflowsQuery({
    fetchPolicy: 'cache-and-network',
  });
  const [createWorkflow, { loading: creating }] =
    useCreateWorkflowMutation(refetchOptions);
  const [updateWorkflow, { loading: updating }] =
    useUpdateWorkflowMutation(refetchOptions);
  const [deleteWorkflow] = useDeleteWorkflowMutation(refetchOptions);
  const [publishWorkflow] = usePublishWorkflowMutation(refetchOptions);
  const [archiveWorkflow] = useArchiveWorkflowMutation(refetchOptions);

  const workflows = useMemo(() => {
    const list = data?.workflows ?? [];
    if (!searchText) return list;
    const lower = searchText.toLowerCase();
    return list.filter(
      (w) =>
        w.name.toLowerCase().includes(lower) ||
        w.description?.toLowerCase().includes(lower),
    );
  }, [data, searchText]);

  const openCreate = () => {
    setEditingWorkflow(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const openEdit = (record: WorkflowFieldsFragment) => {
    setEditingWorkflow(record);
    form.setFieldsValue({
      name: record.name,
      description: record.description,
      graph: record.graph ? JSON.stringify(record.graph, null, 2) : '',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const payload: any = {
        name: values.name,
        description: values.description,
      };
      if (values.graph) {
        payload.graph = JSON.parse(values.graph);
      }

      if (editingWorkflow) {
        await updateWorkflow({
          variables: { where: { id: editingWorkflow.id }, data: payload },
        });
        message.success('Workflow updated');
      } else {
        await createWorkflow({ variables: { data: payload } });
        message.success('Workflow created');
      }
      setIsModalOpen(false);
    } catch (err: any) {
      if (err?.message?.includes('JSON')) {
        message.error('Invalid JSON in graph field');
      }
    }
  };

  const handleDelete = async (id: number) => {
    await deleteWorkflow({ variables: { where: { id } } });
    message.success('Workflow deleted');
  };

  const handlePublish = async (id: number) => {
    await publishWorkflow({ variables: { where: { id } } });
    message.success('Workflow published');
  };

  const handleArchive = async (id: number) => {
    await archiveWorkflow({ variables: { where: { id } } });
    message.success('Workflow archived');
  };

  const columns: TableColumnsType<WorkflowFieldsFragment> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => (
        <Space>
          <ApartmentOutlined />
          <Typography.Text strong>{name}</Typography.Text>
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
      width: 80,
      render: (v: number) => `v${v}`,
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
      width: 180,
      render: (_: any, record: WorkflowFieldsFragment) => (
        <Space>
          <Button
            type="text"
            size="small"
            icon={<NodeIndexOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              router.push(
                `/projects/${projectId}/agent-builder/workflows/${record.id}`,
              );
            }}
            title="Open Canvas"
          />
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              openEdit(record);
            }}
          />
          {record.status === 'draft' && (
            <Button
              type="text"
              size="small"
              icon={<CheckCircleOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                handlePublish(record.id);
              }}
              title="Publish"
            />
          )}
          {record.status === 'published' && (
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
            title="Delete this workflow?"
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
            <ApartmentOutlined /> Workflows
          </Space>
        }
        description="Define multi-step agent workflows. Visual editor coming in Phase 2."
        titleExtra={
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            New Workflow
          </Button>
        }
      >
        <Input.Search
          placeholder="Search workflows..."
          allowClear
          onChange={(e) => setSearchText(e.target.value)}
          style={{ maxWidth: 400, marginBottom: 16 }}
        />

        <Table
          dataSource={workflows}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 20, showSizeChanger: false }}
        />

        <Modal
          title={editingWorkflow ? 'Edit Workflow' : 'New Workflow'}
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
              <Input placeholder="e.g. Data Pipeline Workflow" />
            </Form.Item>
            <Form.Item name="description" label="Description">
              <Input placeholder="What this workflow does" />
            </Form.Item>
            <Form.Item
              name="graph"
              label="Graph (JSON)"
              extra="Define nodes and edges. Visual editor coming in Phase 2."
            >
              <TextArea
                rows={10}
                placeholder={`{
  "nodes": [
    {"id": "start", "type": "trigger", "data": {}},
    {"id": "llm1", "type": "llm", "data": {"model": "gpt-4o"}},
    {"id": "end", "type": "output", "data": {}}
  ],
  "edges": [
    {"source": "start", "target": "llm1"},
    {"source": "llm1", "target": "end"}
  ]
}`}
              />
            </Form.Item>
          </Form>
        </Modal>
      </PageLayout>
    </SiderLayout>
  );
}
