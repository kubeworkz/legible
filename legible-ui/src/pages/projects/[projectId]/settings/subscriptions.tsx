import { useCallback, useState } from 'react';
import {
  Table,
  Tag,
  Select,
  Typography,
  message,
  Space,
  Button,
  Modal,
  Tooltip,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import styled from 'styled-components';
import ReloadOutlined from '@ant-design/icons/ReloadOutlined';
import SettingsLayout from '@/components/layouts/SettingsLayout';
import useOrganization from '@/hooks/useOrganization';
import { useQuery, useMutation } from '@apollo/client';
import {
  ADMIN_SUBSCRIPTIONS,
  ADMIN_UPDATE_SUBSCRIPTION,
} from '@/apollo/client/graphql/subscription';

const { Title, Text } = Typography;

const PageContainer = styled.div`
  max-width: 1200px;
  padding: 24px 32px;
`;

const HeaderRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
`;

// ── Types ────────────────────────────────────────────────

interface AdminSubscription {
  id: number;
  organizationId: number;
  organizationName: string | null;
  plan: string;
  status: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  canceledAt: string | null;
  trialStart: string | null;
  trialEnd: string | null;
  paymentMethodBrand: string | null;
  paymentMethodLast4: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

// ── Helpers ──────────────────────────────────────────────

const PLAN_COLORS: Record<string, string> = {
  free: 'default',
  pro: 'blue',
  enterprise: 'purple',
};

const STATUS_COLORS: Record<string, string> = {
  active: 'green',
  trialing: 'geekblue',
  past_due: 'red',
  canceled: 'default',
  unpaid: 'orange',
  incomplete: 'orange',
  incomplete_expired: 'default',
};

const PLAN_OPTIONS = [
  { label: 'Free', value: 'free' },
  { label: 'Pro', value: 'pro' },
  { label: 'Enterprise', value: 'enterprise' },
];

const STATUS_OPTIONS = [
  { label: 'Active', value: 'active' },
  { label: 'Trialing', value: 'trialing' },
  { label: 'Past Due', value: 'past_due' },
  { label: 'Canceled', value: 'canceled' },
  { label: 'Unpaid', value: 'unpaid' },
  { label: 'Incomplete', value: 'incomplete' },
];

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// ── Edit Modal ──────────────────────────────────────────

interface EditModalProps {
  subscription: AdminSubscription | null;
  visible: boolean;
  onClose: () => void;
  onSave: (id: number, plan: string, status: string) => Promise<void>;
}

function EditSubscriptionModal({
  subscription,
  visible,
  onClose,
  onSave,
}: EditModalProps) {
  const [plan, setPlan] = useState('');
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);

  // Sync state when modal opens with a new subscription
  const handleAfterOpenChange = useCallback(
    (open: boolean) => {
      if (open && subscription) {
        setPlan(subscription.plan);
        setStatus(subscription.status);
      }
    },
    [subscription],
  );

  const handleSave = useCallback(async () => {
    if (!subscription) return;
    setSaving(true);
    try {
      await onSave(subscription.id, plan, status);
      onClose();
    } catch {
      message.error('Failed to update subscription.');
    } finally {
      setSaving(false);
    }
  }, [subscription, plan, status, onSave, onClose]);

  return (
    <Modal
      title={`Edit Subscription — ${subscription?.organizationName || `Org #${subscription?.organizationId}`}`}
      open={visible}
      onCancel={onClose}
      afterOpenChange={handleAfterOpenChange}
      onOk={handleSave}
      confirmLoading={saving}
      okText="Save"
    >
      <div className="mb-3">
        <Text strong className="d-block mb-1">
          Plan
        </Text>
        <Select
          value={plan}
          onChange={setPlan}
          options={PLAN_OPTIONS}
          style={{ width: '100%' }}
        />
      </div>
      <div>
        <Text strong className="d-block mb-1">
          Status
        </Text>
        <Select
          value={status}
          onChange={setStatus}
          options={STATUS_OPTIONS}
          style={{ width: '100%' }}
        />
      </div>
    </Modal>
  );
}

// ── Page ─────────────────────────────────────────────────

export default function SubscriptionsPage() {
  const { isAdmin } = useOrganization();
  const [editTarget, setEditTarget] = useState<AdminSubscription | null>(null);

  const { data, loading, refetch } = useQuery(ADMIN_SUBSCRIPTIONS, {
    fetchPolicy: 'network-only',
    skip: !isAdmin,
  });

  const [updateSubscription] = useMutation(ADMIN_UPDATE_SUBSCRIPTION);

  const subscriptions: AdminSubscription[] =
    data?.adminSubscriptions || [];

  const handleSave = useCallback(
    async (id: number, plan: string, status: string) => {
      await updateSubscription({
        variables: { id, data: { plan, status } },
      });
      message.success('Subscription updated.');
      refetch();
    },
    [updateSubscription, refetch],
  );

  const columns: ColumnsType<AdminSubscription> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 60,
      sorter: (a, b) => a.id - b.id,
    },
    {
      title: 'Organization',
      key: 'org',
      width: 180,
      render: (_, record) => (
        <div>
          <Text strong>{record.organizationName || '—'}</Text>
          <br />
          <Text className="gray-6" style={{ fontSize: 12 }}>
            ID: {record.organizationId}
          </Text>
        </div>
      ),
      sorter: (a, b) =>
        (a.organizationName || '').localeCompare(b.organizationName || ''),
    },
    {
      title: 'Plan',
      dataIndex: 'plan',
      key: 'plan',
      width: 100,
      filters: PLAN_OPTIONS.map((o) => ({ text: o.label, value: o.value })),
      onFilter: (value, record) => record.plan === value,
      render: (plan: string) => (
        <Tag color={PLAN_COLORS[plan] || 'default'}>
          {plan.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      filters: STATUS_OPTIONS.map((o) => ({ text: o.label, value: o.value })),
      onFilter: (value, record) => record.status === value,
      render: (status: string) => (
        <Tag color={STATUS_COLORS[status] || 'default'}>
          {status.replace(/_/g, ' ')}
        </Tag>
      ),
    },
    {
      title: 'Payment',
      key: 'payment',
      width: 130,
      render: (_, record) =>
        record.paymentMethodLast4 ? (
          <Text className="gray-7" style={{ fontSize: 13 }}>
            {record.paymentMethodBrand || 'Card'} ····{' '}
            {record.paymentMethodLast4}
          </Text>
        ) : (
          <Text className="gray-5">—</Text>
        ),
    },
    {
      title: 'Period End',
      key: 'periodEnd',
      width: 110,
      render: (_, record) => (
        <Text className="gray-7" style={{ fontSize: 13 }}>
          {formatDate(record.currentPeriodEnd)}
        </Text>
      ),
      sorter: (a, b) =>
        (a.currentPeriodEnd || '').localeCompare(b.currentPeriodEnd || ''),
    },
    {
      title: 'Stripe Customer',
      dataIndex: 'stripeCustomerId',
      key: 'stripeCustomerId',
      width: 160,
      render: (val: string | null) =>
        val ? (
          <Tooltip title={val}>
            <Text
              className="gray-7"
              style={{ fontSize: 12, fontFamily: 'monospace' }}
            >
              {val.length > 18 ? val.slice(0, 18) + '…' : val}
            </Text>
          </Tooltip>
        ) : (
          <Text className="gray-5">—</Text>
        ),
    },
    {
      title: 'Created',
      key: 'createdAt',
      width: 110,
      render: (_, record) => (
        <Text className="gray-7" style={{ fontSize: 13 }}>
          {formatDate(record.createdAt)}
        </Text>
      ),
      sorter: (a, b) =>
        (a.createdAt || '').localeCompare(b.createdAt || ''),
    },
    {
      title: '',
      key: 'actions',
      width: 80,
      render: (_, record) => (
        <Button size="small" onClick={() => setEditTarget(record)}>
          Edit
        </Button>
      ),
    },
  ];

  if (!isAdmin) {
    return (
      <SettingsLayout>
        <PageContainer>
          <Text className="gray-6">
            You do not have permission to view this page.
          </Text>
        </PageContainer>
      </SettingsLayout>
    );
  }

  return (
    <SettingsLayout>
      <PageContainer>
        <HeaderRow>
          <div>
            <Title level={4} className="mb-1">
              Subscriptions
            </Title>
            <Text className="gray-6">
              View and manage subscription plans for all organizations.
            </Text>
          </div>
          <Space>
            <Tag>{subscriptions.length} total</Tag>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => refetch()}
              loading={loading}
            >
              Refresh
            </Button>
          </Space>
        </HeaderRow>

        <Table
          dataSource={subscriptions}
          columns={columns}
          rowKey="id"
          loading={loading}
          size="middle"
          pagination={{ pageSize: 20 }}
          scroll={{ x: 1100 }}
        />

        <EditSubscriptionModal
          subscription={editTarget}
          visible={!!editTarget}
          onClose={() => setEditTarget(null)}
          onSave={handleSave}
        />
      </PageContainer>
    </SettingsLayout>
  );
}
