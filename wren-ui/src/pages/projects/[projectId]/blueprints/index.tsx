import { useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import {
  Button,
  Col,
  Input,
  Row,
  Select,
  Tag,
  Table,
  TableColumnsType,
  Typography,
  Modal,
  Space,
  message,
} from 'antd';
import BlockOutlined from '@ant-design/icons/BlockOutlined';
import PlusOutlined from '@ant-design/icons/PlusOutlined';
import DeleteOutlined from '@ant-design/icons/DeleteOutlined';
import EditOutlined from '@ant-design/icons/EditOutlined';
import ExclamationCircleOutlined from '@ant-design/icons/ExclamationCircleOutlined';
import SearchOutlined from '@ant-design/icons/SearchOutlined';
import SiderLayout from '@/components/layouts/SiderLayout';
import PageLayout from '@/components/layouts/PageLayout';
import { getCompactTime } from '@/utils/time';
import { Path, buildPath } from '@/utils/enum';
import useProject from '@/hooks/useProject';
import {
  BlueprintData,
  useBlueprintsQuery,
  useCreateBlueprintMutation,
  useDeleteBlueprintMutation,
} from '@/apollo/client/graphql/blueprints.generated';
import {
  useInstallRegistryEntryMutation,
} from '@/apollo/client/graphql/registry.generated';
import BlueprintImportCreateWizard, {
  CreateBlueprintValues,
} from '@/components/pages/blueprints/BlueprintImportCreateWizard';

const { Text, Paragraph } = Typography;

export default function BlueprintsPage() {
  const router = useRouter();
  const { currentProjectId } = useProject();
  const { data, loading, refetch } = useBlueprintsQuery();
  const [createBlueprint, { loading: creating }] =
    useCreateBlueprintMutation();
  const [deleteBlueprint] = useDeleteBlueprintMutation();
  const [installEntry] = useInstallRegistryEntryMutation();
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [viewYaml, setViewYaml] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>();
  const [sourceFilter, setSourceFilter] = useState<string | undefined>();

  const blueprints = useMemo(() => {
    return data?.blueprints || [];
  }, [data]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const bp of blueprints) {
      if (bp.category) set.add(bp.category);
    }
    return Array.from(set).sort();
  }, [blueprints]);

  const filteredBlueprints = useMemo(() => {
    let result = blueprints;
    if (searchText) {
      const q = searchText.toLowerCase();
      result = result.filter(
        (bp) =>
          bp.name.toLowerCase().includes(q) ||
          (bp.description && bp.description.toLowerCase().includes(q)),
      );
    }
    if (categoryFilter) {
      result = result.filter((bp) => bp.category === categoryFilter);
    }
    if (sourceFilter === 'builtin') {
      result = result.filter((bp) => bp.isBuiltin);
    } else if (sourceFilter === 'custom') {
      result = result.filter((bp) => !bp.isBuiltin);
    }
    return result;
  }, [blueprints, searchText, categoryFilter, sourceFilter]);

  const columns: TableColumnsType<BlueprintData> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: BlueprintData) => (
        <Space>
          <Text strong style={{ color: '#1890ff' }}>{name}</Text>
          {record.isBuiltin && <Tag color="blue">built-in</Tag>}
        </Space>
      ),
    },
    {
      title: 'Version',
      dataIndex: 'version',
      key: 'version',
      width: 100,
    },
    {
      title: 'Agent Type',
      dataIndex: 'defaultAgentType',
      key: 'defaultAgentType',
      width: 120,
      render: (type: string) => type || '-',
    },
    {
      title: 'Image',
      dataIndex: 'sandboxImage',
      key: 'sandboxImage',
      width: 200,
      render: (image: string) => (
        <Text code style={{ fontSize: 12 }}>
          {image || '-'}
        </Text>
      ),
    },
    {
      title: 'Profiles',
      dataIndex: 'inferenceProfiles',
      key: 'inferenceProfiles',
      width: 180,
      render: (profiles: Record<string, any> | null) => {
        if (!profiles) return '-';
        const names = Object.keys(profiles);
        return names.map((name) => (
          <Tag key={name} color="geekblue">
            {name}
          </Tag>
        ));
      },
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 140,
      render: (createdAt: string) => getCompactTime(createdAt),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 160,
      render: (_: any, record: BlueprintData) => (
        <Space onClick={(e) => e.stopPropagation()}>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => setViewYaml(record.blueprintYaml)}
          >
            View YAML
          </Button>
          {!record.isBuiltin && (
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(record)}
            />
          )}
        </Space>
      ),
    },
  ];

  const handleCreate = async (values: CreateBlueprintValues) => {
    try {
      await createBlueprint({
        variables: {
          data: {
            name: values.name,
            blueprintYaml: values.blueprintYaml,
            version: values.version || '0.1.0',
            description: values.description,
            sandboxImage: values.sandboxImage,
            defaultAgentType: values.defaultAgentType,
          },
        },
      });
      message.success(`Blueprint "${values.name}" created`);
      setIsWizardOpen(false);
      refetch();
    } catch (err: any) {
      if (err?.message) {
        message.error(err.message);
      }
    }
  };

  const handleImport = async (registryEntryId: number) => {
    try {
      await installEntry({
        variables: { registryEntryId },
        refetchQueries: ['Blueprints'],
        awaitRefetchQueries: true,
      });
      message.success('Blueprint installed from registry');
      setIsWizardOpen(false);
      refetch();
    } catch (err: any) {
      message.error(err?.message || 'Failed to install blueprint');
    }
  };

  const handleDelete = (record: BlueprintData) => {
    Modal.confirm({
      title: `Delete blueprint "${record.name}"?`,
      icon: <ExclamationCircleOutlined />,
      content:
        'Agents created from this blueprint will continue running, but no new agents can use it.',
      okText: 'Delete',
      okType: 'danger',
      onOk: async () => {
        await deleteBlueprint({
          variables: { where: { id: record.id } },
        });
        message.success(`Blueprint "${record.name}" deleted`);
        refetch();
      },
    });
  };

  return (
    <SiderLayout>
      <PageLayout
        title={
          <Space>
            <BlockOutlined style={{ fontSize: 20 }} />
            Blueprints
          </Space>
        }
        description="NemoClaw-compatible agent blueprints define sandbox images, inference profiles, network policies, and agent configuration."
        titleExtra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setIsWizardOpen(true)}
          >
            Add Blueprint
          </Button>
        }
      >
        <Row gutter={12} style={{ marginBottom: 16 }}>
          <Col flex="auto">
            <Input
              placeholder="Search by name or description…"
              prefix={<SearchOutlined />}
              allowClear
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </Col>
          <Col>
            <Select
              placeholder="Category"
              allowClear
              style={{ width: 160 }}
              value={categoryFilter}
              onChange={setCategoryFilter}
              options={categories.map((c) => ({ label: c, value: c }))}
            />
          </Col>
          <Col>
            <Select
              placeholder="Source"
              allowClear
              style={{ width: 140 }}
              value={sourceFilter}
              onChange={setSourceFilter}
              options={[
                { label: 'Built-in', value: 'builtin' },
                { label: 'Custom', value: 'custom' },
              ]}
            />
          </Col>
        </Row>
        <Table
          dataSource={filteredBlueprints}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={filteredBlueprints.length > 20 ? { pageSize: 20 } : false}
          onRow={(record) => ({
            onClick: () => {
              const base = buildPath(Path.Blueprints, currentProjectId);
              router.push(`${base}/${record.id}`);
            },
            style: { cursor: 'pointer' },
          })}
          expandable={{
            expandedRowRender: (record) => (
              <Paragraph style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
                {record.description || 'No description'}
              </Paragraph>
            ),
          }}
          locale={{
            emptyText:
              'No blueprints yet. Click "Create Blueprint" to define your first agent template.',
          }}
        />
      </PageLayout>

      <BlueprintImportCreateWizard
        open={isWizardOpen}
        creating={creating}
        onCancel={() => setIsWizardOpen(false)}
        onCreate={handleCreate}
        onImport={handleImport}
      />

      <Modal
        title="Blueprint YAML"
        open={!!viewYaml}
        onCancel={() => setViewYaml(null)}
        footer={null}
        width={700}
      >
        <pre
          style={{
            background: '#f5f5f5',
            padding: 16,
            borderRadius: 4,
            maxHeight: 500,
            overflow: 'auto',
            fontSize: 12,
          }}
        >
          {viewYaml}
        </pre>
      </Modal>
    </SiderLayout>
  );
}
