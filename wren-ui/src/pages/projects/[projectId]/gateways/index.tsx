import { useMemo, useState } from 'react';
import {
  Button,
  Card,
  Col,
  Descriptions,
  Modal,
  Form,
  InputNumber,
  message,
  Row,
  Space,
  Tag,
  Typography,
  Progress,
  Empty,
  Spin,
} from 'antd';
import CloudServerOutlined from '@ant-design/icons/CloudServerOutlined';
import PlusOutlined from '@ant-design/icons/PlusOutlined';
import DeleteOutlined from '@ant-design/icons/DeleteOutlined';
import ReloadOutlined from '@ant-design/icons/ReloadOutlined';
import CheckCircleOutlined from '@ant-design/icons/CheckCircleOutlined';
import CloseCircleOutlined from '@ant-design/icons/CloseCircleOutlined';
import LoadingOutlined from '@ant-design/icons/LoadingOutlined';
import ExclamationCircleOutlined from '@ant-design/icons/ExclamationCircleOutlined';
import SiderLayout from '@/components/layouts/SiderLayout';
import PageLayout from '@/components/layouts/PageLayout';
import { getCompactTime } from '@/utils/time';
import useOrganization from '@/hooks/useOrganization';
import {
  GatewayFieldsFragment,
  useGatewayForOrgQuery,
  useCreateGatewayMutation,
  useDeleteGatewayMutation,
} from '@/apollo/client/graphql/gateways.generated';

const { Text, Paragraph } = Typography;

const GATEWAY_STATUS: Record<
  string,
  { color: string; icon: React.ReactNode }
> = {
  RUNNING: { color: 'green', icon: <CheckCircleOutlined /> },
  STARTING: { color: 'blue', icon: <LoadingOutlined /> },
  STOPPED: { color: 'default', icon: <CloseCircleOutlined /> },
  FAILED: { color: 'red', icon: <CloseCircleOutlined /> },
};

function getStatusTag(status: string) {
  const mapped = GATEWAY_STATUS[status] || { color: 'default', icon: null };
  return (
    <Tag icon={mapped.icon} color={mapped.color}>
      {status}
    </Tag>
  );
}

function SandboxUsageBar({ gateway }: { gateway: GatewayFieldsFragment }) {
  const percent = gateway.maxSandboxes
    ? Math.round((gateway.sandboxCount / gateway.maxSandboxes) * 100)
    : 0;
  const color =
    percent >= 90 ? '#ff4d4f' : percent >= 70 ? '#faad14' : '#52c41a';

  return (
    <div style={{ maxWidth: 200 }}>
      <Text>
        {gateway.sandboxCount} / {gateway.maxSandboxes} sandboxes
      </Text>
      <Progress
        percent={percent}
        size="small"
        strokeColor={color}
        style={{ marginTop: 4 }}
      />
    </div>
  );
}

function GatewayDetail({
  gateway,
  onDelete,
}: {
  gateway: GatewayFieldsFragment;
  onDelete: () => void;
}) {
  return (
    <Card
      title={
        <Space>
          <CloudServerOutlined />
          <span>Gateway #{gateway.id}</span>
          {getStatusTag(gateway.status)}
        </Space>
      }
      extra={
        <Button
          danger
          size="small"
          icon={<DeleteOutlined />}
          onClick={onDelete}
        >
          Delete
        </Button>
      }
    >
      <Row gutter={[24, 24]}>
        <Col span={12}>
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label="Status">
              {getStatusTag(gateway.status)}
            </Descriptions.Item>
            <Descriptions.Item label="Endpoint">
              {gateway.endpoint ? (
                <Text code>
                  {gateway.endpoint}:{gateway.port}
                </Text>
              ) : (
                <Text type="secondary">Not assigned</Text>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="PID">
              {gateway.pid ?? <Text type="secondary">—</Text>}
            </Descriptions.Item>
            <Descriptions.Item label="Version">
              {gateway.version ?? <Text type="secondary">—</Text>}
            </Descriptions.Item>
            <Descriptions.Item label="Last Health Check">
              {gateway.lastHealthCheck
                ? getCompactTime(gateway.lastHealthCheck)
                : '—'}
            </Descriptions.Item>
          </Descriptions>
        </Col>
        <Col span={12}>
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label="CPU">
              {gateway.cpus}
            </Descriptions.Item>
            <Descriptions.Item label="Memory">
              {gateway.memory}
            </Descriptions.Item>
            <Descriptions.Item label="Sandbox Usage">
              <SandboxUsageBar gateway={gateway} />
            </Descriptions.Item>
            <Descriptions.Item label="Created">
              {getCompactTime(gateway.createdAt)}
            </Descriptions.Item>
            <Descriptions.Item label="Updated">
              {getCompactTime(gateway.updatedAt)}
            </Descriptions.Item>
          </Descriptions>
        </Col>
      </Row>
      {gateway.errorMessage && (
        <Card
          size="small"
          style={{ marginTop: 16, borderColor: '#ff4d4f' }}
        >
          <Paragraph type="danger" style={{ marginBottom: 0 }}>
            <ExclamationCircleOutlined /> {gateway.errorMessage}
          </Paragraph>
        </Card>
      )}
    </Card>
  );
}

export default function GatewaysPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();
  const { currentOrgId } = useOrganization();

  const { data, loading, refetch } = useGatewayForOrgQuery({
    variables: { organizationId: currentOrgId! },
    skip: !currentOrgId,
    fetchPolicy: 'cache-and-network',
    pollInterval: 15000,
  });

  const gateway = useMemo(
    () => data?.gatewayForOrganization ?? null,
    [data],
  );

  const [createGateway, { loading: creating }] = useCreateGatewayMutation({
    refetchQueries: ['GatewayForOrganization'],
    awaitRefetchQueries: true,
  });

  const [deleteGateway] = useDeleteGatewayMutation({
    refetchQueries: ['GatewayForOrganization'],
    awaitRefetchQueries: true,
  });

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      await createGateway({
        variables: {
          data: {
            organizationId: currentOrgId!,
            cpus: values.cpus ? String(values.cpus) : undefined,
            memory: values.memory ? `${values.memory}Gi` : undefined,
            maxSandboxes: values.maxSandboxes || undefined,
          },
        },
      });
      message.success('Gateway created');
      form.resetFields();
      setIsModalOpen(false);
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.message || 'Failed to create gateway');
    }
  };

  const handleDelete = () => {
    if (!gateway) return;
    Modal.confirm({
      title: 'Delete gateway?',
      icon: <ExclamationCircleOutlined />,
      content:
        'This will shut down the gateway process and disconnect all sandboxes. This action cannot be undone.',
      okText: 'Delete',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await deleteGateway({
            variables: { where: { id: gateway.id } },
          });
          message.success('Gateway deleted');
        } catch (err: any) {
          message.error(err?.message || 'Failed to delete gateway');
        }
      },
    });
  };

  return (
    <SiderLayout>
      <PageLayout
        title={
          <Space>
            <CloudServerOutlined style={{ fontSize: 20 }} />
            Gateways
          </Space>
        }
        description="Monitor and manage the OpenShell gateway for your organization."
        titleExtra={
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => refetch()}
              loading={loading}
            >
              Refresh
            </Button>
            {!gateway && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setIsModalOpen(true)}
              >
                Create Gateway
              </Button>
            )}
          </Space>
        }
      >
        {loading && !gateway ? (
          <div style={{ textAlign: 'center', padding: 64 }}>
            <Spin size="large" />
          </div>
        ) : gateway ? (
          <GatewayDetail gateway={gateway} onDelete={handleDelete} />
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No gateway for this organization yet."
          >
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setIsModalOpen(true)}
            >
              Create Gateway
            </Button>
          </Empty>
        )}
      </PageLayout>

      <Modal
        title="Create Gateway"
        open={isModalOpen}
        onOk={handleCreate}
        onCancel={() => {
          form.resetFields();
          setIsModalOpen(false);
        }}
        confirmLoading={creating}
        okText="Create"
      >
        <Paragraph type="secondary" style={{ marginBottom: 16 }}>
          Provision an OpenShell gateway for your organization. Defaults will be
          applied if fields are left empty.
        </Paragraph>
        <Form form={form} layout="vertical">
          <Form.Item
            label="CPUs"
            name="cpus"
            tooltip="Number of CPU cores (e.g. 2)"
          >
            <InputNumber
              min={1}
              max={64}
              placeholder="2"
              style={{ width: '100%' }}
            />
          </Form.Item>
          <Form.Item
            label="Memory (GiB)"
            name="memory"
            tooltip="RAM in gibibytes (e.g. 4)"
          >
            <InputNumber
              min={1}
              max={256}
              placeholder="4"
              style={{ width: '100%' }}
            />
          </Form.Item>
          <Form.Item
            label="Max Sandboxes"
            name="maxSandboxes"
            tooltip="Maximum number of sandboxes this gateway can host"
          >
            <InputNumber
              min={1}
              max={100}
              placeholder="10"
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Form>
      </Modal>
    </SiderLayout>
  );
}
