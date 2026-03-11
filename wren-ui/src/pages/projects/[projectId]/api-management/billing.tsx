import { useState, useCallback } from 'react';
import {
  Table,
  TableColumnsType,
  Card,
  Row,
  Col,
  Tag,
  Typography,
  Spin,
  Empty,
  Button,
  Modal,
  Form,
  InputNumber,
  Input,
  message,
  Tooltip,
  Space,
  Divider,
  Badge,
  Alert,
  Collapse,
} from 'antd';
import styled from 'styled-components';
import SiderLayout from '@/components/layouts/SiderLayout';
import PageLayout from '@/components/layouts/PageLayout';
import DollarOutlined from '@ant-design/icons/DollarOutlined';
import SettingOutlined from '@ant-design/icons/SettingOutlined';
import DownloadOutlined from '@ant-design/icons/DownloadOutlined';
import ReloadOutlined from '@ant-design/icons/ReloadOutlined';
import ThunderboltOutlined from '@ant-design/icons/ThunderboltOutlined';
import CrownOutlined from '@ant-design/icons/CrownOutlined';
import CreditCardOutlined from '@ant-design/icons/CreditCardOutlined';
import FileTextOutlined from '@ant-design/icons/FileTextOutlined';
import LinkOutlined from '@ant-design/icons/LinkOutlined';
import { useQuery, useMutation } from '@apollo/client';
import {
  BILLING_OVERVIEW,
  UPDATE_BILLING_CONFIG,
  RECOMPUTE_MONTHLY_BILLING,
} from '@/apollo/client/graphql/billing';
import {
  SUBSCRIPTION,
  STRIPE_ENABLED,
  CREATE_CHECKOUT_SESSION,
  CREATE_PORTAL_SESSION,
  CANCEL_SUBSCRIPTION,
  RESUME_SUBSCRIPTION,
  INVOICES,
  UPCOMING_INVOICE,
  OVERAGE_BREAKDOWN,
} from '@/apollo/client/graphql/subscription';
import {
  SubscriptionPlan,
  SubscriptionStatus,
} from '@/apollo/client/graphql/__types__';
import type {
  BillingOverview,
  MonthlyBillingSummary,
  KeyCostBreakdown,
  ApiTypeCostBreakdown,
  BillingConfig,
  SubscriptionInfo,
  Invoice,
  InvoiceLineItem,
  OverageBreakdown,
  OverageLineItem,
} from '@/apollo/client/graphql/__types__';

const { Text } = Typography;

// ── Styled Components ─────────────────────────────────

const StatTitle = styled.div`
  color: rgba(0, 0, 0, 0.45);
  font-size: 14px;
  margin-bottom: 4px;
`;

const StatValue = styled.div<{ $color?: string }>`
  font-size: 24px;
  font-weight: 600;
  color: ${({ $color }) => $color || 'rgba(0, 0, 0, 0.85)'};
  display: flex;
  align-items: baseline;
  gap: 6px;
`;

const StatSuffix = styled.span`
  font-size: 14px;
  font-weight: 400;
  color: rgba(0, 0, 0, 0.45);
`;

const SectionTitle = styled.div`
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 12px;
  color: rgba(0, 0, 0, 0.85);
`;

// ── Helpers ───────────────────────────────────────────

const MONTH_NAMES = [
  '',
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function formatCost(amount: number, currency: string): string {
  const symbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency;
  return `${symbol}${amount.toFixed(4)}`;
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

// ── Config Modal ──────────────────────────────────────

interface ConfigModalProps {
  visible: boolean;
  config: BillingConfig | null;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
}

function ConfigModal({
  visible,
  config,
  onClose,
  onSave,
}: ConfigModalProps) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      await onSave({
        costPer1kInputTokens: values.costPer1kInputTokens,
        costPer1kOutputTokens: values.costPer1kOutputTokens,
        currency: values.currency,
        monthlySpendAlert: values.monthlySpendAlert || null,
      });
      message.success('Billing configuration updated');
      onClose();
    } catch (error) {
      if ((error as any)?.errorFields) return;
      message.error('Failed to update billing configuration');
    } finally {
      setSaving(false);
    }
  }, [form, onSave, onClose]);

  return (
    <Modal
      title="Billing Configuration"
      open={visible}
      onOk={handleSave}
      onCancel={onClose}
      confirmLoading={saving}
      okText="Save"
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          costPer1kInputTokens: config?.costPer1kInputTokens ?? 0,
          costPer1kOutputTokens: config?.costPer1kOutputTokens ?? 0,
          currency: config?.currency ?? 'USD',
          monthlySpendAlert: config?.monthlySpendAlert ?? undefined,
        }}
      >
        <Form.Item
          label="Cost per 1K input tokens"
          name="costPer1kInputTokens"
          rules={[{ required: true, message: 'Required' }]}
          extra="e.g. 0.003 for $0.003 per 1,000 input tokens"
        >
          <InputNumber
            min={0}
            step={0.001}
            precision={6}
            style={{ width: '100%' }}
            addonBefore="$"
          />
        </Form.Item>
        <Form.Item
          label="Cost per 1K output tokens"
          name="costPer1kOutputTokens"
          rules={[{ required: true, message: 'Required' }]}
          extra="e.g. 0.015 for $0.015 per 1,000 output tokens"
        >
          <InputNumber
            min={0}
            step={0.001}
            precision={6}
            style={{ width: '100%' }}
            addonBefore="$"
          />
        </Form.Item>
        <Form.Item label="Currency" name="currency">
          <Input maxLength={3} style={{ width: 100 }} />
        </Form.Item>
        <Form.Item
          label="Monthly spend alert threshold"
          name="monthlySpendAlert"
          extra="Get a visual alert when monthly spend exceeds this amount. Leave empty to disable."
        >
          <InputNumber
            min={0}
            step={1}
            precision={2}
            style={{ width: '100%' }}
            placeholder="No alert"
            addonBefore="$"
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}

// ── Page Component ────────────────────────────────────

export default function BillingPage() {
  const [configVisible, setConfigVisible] = useState(false);

  const { data, loading, refetch } = useQuery<{ billingOverview: BillingOverview }>(
    BILLING_OVERVIEW,
    {
      fetchPolicy: 'cache-and-network',
      onError: (err) => console.error('Billing query error:', err),
    },
  );

  const { data: subData, loading: subLoading, refetch: refetchSub } = useQuery<{
    subscription: SubscriptionInfo;
  }>(SUBSCRIPTION, { fetchPolicy: 'cache-and-network' });

  const { data: stripeData } = useQuery<{ stripeEnabled: boolean }>(
    STRIPE_ENABLED,
    { fetchPolicy: 'cache-first' },
  );

  const { data: invoicesData } = useQuery<{ invoices: Invoice[] }>(
    INVOICES,
    { fetchPolicy: 'cache-and-network', skip: !stripeData?.stripeEnabled },
  );

  const { data: upcomingData } = useQuery<{
    upcomingInvoice: Invoice | null;
  }>(UPCOMING_INVOICE, {
    fetchPolicy: 'cache-and-network',
    skip: !stripeData?.stripeEnabled,
  });

  const { data: overageData } = useQuery<{
    overageBreakdown: OverageBreakdown;
  }>(OVERAGE_BREAKDOWN, { fetchPolicy: 'cache-and-network' });

  const [updateConfig] = useMutation(UPDATE_BILLING_CONFIG);
  const [recomputeBilling] = useMutation(RECOMPUTE_MONTHLY_BILLING);
  const [checkoutMutation] = useMutation(CREATE_CHECKOUT_SESSION);
  const [portalMutation] = useMutation(CREATE_PORTAL_SESSION);
  const [cancelMutation] = useMutation(CANCEL_SUBSCRIPTION);
  const [resumeMutation] = useMutation(RESUME_SUBSCRIPTION);

  const overview = data?.billingOverview;
  const config = overview?.config;
  const currentMonth = overview?.currentMonth;
  const history = overview?.history || [];
  const subscription = subData?.subscription;
  const stripeEnabled = stripeData?.stripeEnabled ?? false;

  const currency = config?.currency || 'USD';

  const pastInvoices = invoicesData?.invoices || [];
  const upcomingInvoice = upcomingData?.upcomingInvoice || null;
  const overageBreakdown = overageData?.overageBreakdown || null;

  const handleUpdateConfig = useCallback(
    async (configData: any) => {
      await updateConfig({ variables: { data: configData } });
      await refetch();
    },
    [updateConfig, refetch],
  );

  const handleRecompute = useCallback(
    async (year: number, month: number) => {
      try {
        await recomputeBilling({ variables: { year, month } });
        await refetch();
        message.success(`Recomputed billing for ${MONTH_NAMES[month]} ${year}`);
      } catch {
        message.error('Failed to recompute billing');
      }
    },
    [recomputeBilling, refetch],
  );

  const handleExport = useCallback(() => {
    window.open('/api/export/billing', '_blank');
  }, []);

  const handleUpgrade = useCallback(async () => {
    try {
      const currentUrl = window.location.href;
      const { data: result } = await checkoutMutation({
        variables: {
          data: {
            successUrl: `${currentUrl}?upgraded=1`,
            cancelUrl: currentUrl,
          },
        },
      });
      if (result?.createCheckoutSession?.url) {
        window.location.href = result.createCheckoutSession.url;
      }
    } catch {
      message.error('Failed to create checkout session');
    }
  }, [checkoutMutation]);

  const handleManagePayment = useCallback(async () => {
    try {
      const { data: result } = await portalMutation();
      if (result?.createPortalSession?.url) {
        window.open(result.createPortalSession.url, '_blank');
      }
    } catch {
      message.error('Failed to open billing portal');
    }
  }, [portalMutation]);

  const handleCancelSubscription = useCallback(async () => {
    Modal.confirm({
      title: 'Cancel Subscription',
      content:
        'Your Pro plan will remain active until the end of the current billing period. After that, you will be downgraded to the Free plan.',
      okText: 'Cancel Subscription',
      okType: 'danger',
      onOk: async () => {
        try {
          await cancelMutation();
          await refetchSub();
          message.success('Subscription will be canceled at period end');
        } catch {
          message.error('Failed to cancel subscription');
        }
      },
    });
  }, [cancelMutation, refetchSub]);

  const handleResumeSubscription = useCallback(async () => {
    try {
      await resumeMutation();
      await refetchSub();
      message.success('Subscription resumed');
    } catch {
      message.error('Failed to resume subscription');
    }
  }, [resumeMutation, refetchSub]);

  // ── Monthly history columns ─────────────────────────

  const monthlyColumns: TableColumnsType<MonthlyBillingSummary> = [
    {
      title: 'Month',
      key: 'month',
      width: 160,
      render: (_: any, record: MonthlyBillingSummary) => (
        <Text strong>
          {MONTH_NAMES[record.month]} {record.year}
        </Text>
      ),
    },
    {
      title: 'Requests',
      dataIndex: 'totalRequests',
      key: 'totalRequests',
      width: 100,
      render: (v: number) => v.toLocaleString(),
    },
    {
      title: 'Tokens',
      dataIndex: 'tokensTotal',
      key: 'tokensTotal',
      width: 120,
      render: (v: number) => formatTokens(v),
    },
    {
      title: 'Input tokens',
      dataIndex: 'tokensInput',
      key: 'tokensInput',
      width: 120,
      render: (v: number) => formatTokens(v),
    },
    {
      title: 'Output tokens',
      dataIndex: 'tokensOutput',
      key: 'tokensOutput',
      width: 120,
      render: (v: number) => formatTokens(v),
    },
    {
      title: 'Estimated Cost',
      dataIndex: 'estimatedCost',
      key: 'estimatedCost',
      width: 130,
      render: (v: number) => (
        <Text strong style={{ color: v > 0 ? '#1677ff' : undefined }}>
          {formatCost(v, currency)}
        </Text>
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 60,
      render: (_: any, record: MonthlyBillingSummary) => (
        <Tooltip title="Recompute this month">
          <Button
            type="text"
            size="small"
            icon={<ReloadOutlined />}
            onClick={() => handleRecompute(record.year, record.month)}
          />
        </Tooltip>
      ),
    },
  ];

  // ── Per-key breakdown columns ──────────────────────

  const keyColumns: TableColumnsType<KeyCostBreakdown> = [
    {
      title: 'Key ID',
      dataIndex: 'apiKeyId',
      key: 'apiKeyId',
      width: 80,
    },
    {
      title: 'Type',
      dataIndex: 'apiKeyType',
      key: 'apiKeyType',
      width: 100,
      render: (t: string) => (
        <Tag color={t === 'org' ? 'blue' : 'green'}>{t}</Tag>
      ),
    },
    {
      title: 'Requests',
      dataIndex: 'totalRequests',
      key: 'totalRequests',
      width: 100,
      render: (v: number) => v.toLocaleString(),
    },
    {
      title: 'Tokens',
      dataIndex: 'tokensTotal',
      key: 'tokensTotal',
      width: 120,
      render: (v: number) => formatTokens(v),
    },
    {
      title: 'Est. Cost',
      dataIndex: 'estimatedCost',
      key: 'estimatedCost',
      width: 120,
      render: (v: number) => formatCost(v, currency),
    },
  ];

  // ── Per-API-type breakdown columns ─────────────────

  const apiTypeColumns: TableColumnsType<ApiTypeCostBreakdown> = [
    {
      title: 'API Type',
      dataIndex: 'apiType',
      key: 'apiType',
      width: 200,
      render: (t: string) => (
        <Tag className="gray-8">
          {t.toLowerCase().replace(/_/g, ' ')}
        </Tag>
      ),
    },
    {
      title: 'Requests',
      dataIndex: 'totalRequests',
      key: 'totalRequests',
      width: 100,
      render: (v: number) => v.toLocaleString(),
    },
    {
      title: 'Tokens',
      dataIndex: 'tokensTotal',
      key: 'tokensTotal',
      width: 120,
      render: (v: number) => formatTokens(v),
    },
    {
      title: 'Est. Cost',
      dataIndex: 'estimatedCost',
      key: 'estimatedCost',
      width: 120,
      render: (v: number) => formatCost(v, currency),
    },
  ];

  if (loading && !data) {
    return (
      <SiderLayout loading={false} sidebar={null}>
        <PageLayout
          title={<><DollarOutlined className="mr-2 gray-8" />Billing &amp; Cost</>}
        >
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" />
          </div>
        </PageLayout>
      </SiderLayout>
    );
  }

  const spendAlert = config?.monthlySpendAlert;
  const isOverBudget =
    spendAlert != null &&
    currentMonth != null &&
    currentMonth.estimatedCost > spendAlert;

  return (
    <SiderLayout loading={false} sidebar={null}>
      <PageLayout
        title={<><DollarOutlined className="mr-2 gray-8" />Billing &amp; Cost</>}
        description="Token usage costs based on your configured pricing. Configure per-token rates to see estimated costs."
        titleExtra={
          <Space>
            <Button
              icon={<DownloadOutlined />}
              onClick={handleExport}
            >
              Export CSV
            </Button>
            <Button
              icon={<SettingOutlined />}
              onClick={() => setConfigVisible(true)}
            >
              Configure pricing
            </Button>
          </Space>
        }
      >
        {/* Subscription plan card */}
        {stripeEnabled && subscription && (
          <>
            <Card className="mb-4">
              <Row align="middle" justify="space-between">
                <Col>
                  <Space size="middle" align="center">
                    {subscription.plan === SubscriptionPlan.PRO ? (
                      <Badge
                        count={<CrownOutlined style={{ color: '#faad14' }} />}
                      >
                        <div
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 8,
                            background: '#f6ffed',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <CreditCardOutlined
                            style={{ fontSize: 20, color: '#52c41a' }}
                          />
                        </div>
                      </Badge>
                    ) : (
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 8,
                          background: '#f0f0f0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <CreditCardOutlined
                          style={{ fontSize: 20, color: '#8c8c8c' }}
                        />
                      </div>
                    )}
                    <div>
                      <Text strong style={{ fontSize: 16 }}>
                        {subscription.plan === SubscriptionPlan.FREE
                          ? 'Free Plan'
                          : subscription.plan === SubscriptionPlan.PRO
                            ? 'Pro Plan'
                            : 'Enterprise Plan'}
                      </Text>
                      <br />
                      <Space size={4}>
                        <Tag
                          color={
                            subscription.status === SubscriptionStatus.ACTIVE
                              ? 'green'
                              : subscription.status === SubscriptionStatus.TRIALING
                                ? 'blue'
                                : subscription.status === SubscriptionStatus.PAST_DUE
                                  ? 'red'
                                  : subscription.status === SubscriptionStatus.CANCELED
                                    ? 'default'
                                    : 'orange'
                          }
                        >
                          {subscription.status === SubscriptionStatus.TRIALING
                            ? `Trial · ${subscription.trialDaysRemaining ?? 0} days left`
                            : subscription.status
                                .toLowerCase()
                                .replace(/_/g, ' ')}
                        </Tag>
                        {subscription.plan !== SubscriptionPlan.FREE &&
                          subscription.paymentMethodLast4 && (
                            <Text className="gray-6" style={{ fontSize: 12 }}>
                              {subscription.paymentMethodBrand || 'Card'} ····
                              {subscription.paymentMethodLast4}
                            </Text>
                          )}
                        {subscription.plan !== SubscriptionPlan.FREE &&
                          subscription.currentPeriodEnd && (
                            <Text className="gray-6" style={{ fontSize: 12 }}>
                              · Renews{' '}
                              {new Date(
                                subscription.currentPeriodEnd,
                              ).toLocaleDateString()}
                            </Text>
                          )}
                      </Space>
                    </div>
                  </Space>
                </Col>
                <Col>
                  <Space>
                    {subscription.plan === SubscriptionPlan.FREE && (
                      <Button
                        type="primary"
                        icon={<CrownOutlined />}
                        onClick={handleUpgrade}
                      >
                        Upgrade to Pro
                      </Button>
                    )}
                    {subscription.plan !== SubscriptionPlan.FREE && (
                      <Button onClick={handleManagePayment}>
                        Manage Payment
                      </Button>
                    )}
                    {subscription.plan !== SubscriptionPlan.FREE &&
                      !subscription.canceledAt && (
                        <Button danger onClick={handleCancelSubscription}>
                          Cancel
                        </Button>
                      )}
                    {subscription.canceledAt && (
                      <Button
                        type="primary"
                        onClick={handleResumeSubscription}
                      >
                        Resume Subscription
                      </Button>
                    )}
                  </Space>
                </Col>
              </Row>
              {subscription.canceledAt && (
                <Alert
                  type="warning"
                  showIcon
                  className="mt-3"
                  message={`Your subscription will be canceled on ${new Date(
                    subscription.currentPeriodEnd!,
                  ).toLocaleDateString()}. You can resume anytime before then.`}
                />
              )}
              {subscription.status === SubscriptionStatus.TRIALING && (
                <Alert
                  type="info"
                  showIcon
                  className="mt-3"
                  message={`Your Pro trial ends on ${
                    subscription.trialEnd
                      ? new Date(subscription.trialEnd).toLocaleDateString()
                      : 'soon'
                  }. After the trial, your subscription will convert to a paid plan automatically.`}
                />
              )}
              {subscription.status === SubscriptionStatus.PAST_DUE && (
                <Alert
                  type="error"
                  showIcon
                  className="mt-3"
                  message="Your last payment failed. Please update your payment method to avoid service interruption."
                  action={
                    <Button
                      size="small"
                      danger
                      onClick={handleManagePayment}
                    >
                      Update Payment
                    </Button>
                  }
                />
              )}
            </Card>
            <Divider />
          </>
        )}

        {/* Summary cards */}
        {currentMonth && (
          <>
            <Row gutter={16} className="mb-4">
              <Col span={6}>
                <Card size="small">
                  <StatTitle>Current Month Cost</StatTitle>
                  <StatValue
                    $color={isOverBudget ? '#ff4d4f' : '#1677ff'}
                  >
                    {formatCost(currentMonth.estimatedCost, currency)}
                  </StatValue>
                  {spendAlert != null && (
                    <Text
                      className="gray-6"
                      style={{ fontSize: 12 }}
                    >
                      Budget: {formatCost(spendAlert, currency)}
                    </Text>
                  )}
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small">
                  <StatTitle>Total Requests</StatTitle>
                  <StatValue>
                    {currentMonth.totalRequests.toLocaleString()}
                    <StatSuffix>
                      {MONTH_NAMES[currentMonth.month]}
                    </StatSuffix>
                  </StatValue>
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small">
                  <StatTitle>Input Tokens</StatTitle>
                  <StatValue>
                    {formatTokens(currentMonth.tokensInput)}
                  </StatValue>
                  <Text
                    className="gray-6"
                    style={{ fontSize: 12 }}
                  >
                    @{' '}
                    {config
                      ? `${currency} ${config.costPer1kInputTokens}/1K`
                      : '—'}
                  </Text>
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small">
                  <StatTitle>Output Tokens</StatTitle>
                  <StatValue>
                    {formatTokens(currentMonth.tokensOutput)}
                  </StatValue>
                  <Text
                    className="gray-6"
                    style={{ fontSize: 12 }}
                  >
                    @{' '}
                    {config
                      ? `${currency} ${config.costPer1kOutputTokens}/1K`
                      : '—'}
                  </Text>
                </Card>
              </Col>
            </Row>

            {isOverBudget && (
              <div
                style={{
                  background: '#fff2f0',
                  border: '1px solid #ffccc7',
                  borderRadius: 6,
                  padding: '8px 16px',
                  marginBottom: 16,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <ThunderboltOutlined style={{ color: '#ff4d4f' }} />
                <Text style={{ color: '#ff4d4f' }}>
                  Monthly spend ({formatCost(currentMonth.estimatedCost, currency)})
                  exceeds your alert threshold (
                  {formatCost(spendAlert!, currency)}).
                </Text>
              </div>
            )}
          </>
        )}

        {/* Current month breakdowns */}
        {currentMonth && (
          <Row gutter={16} className="mb-4">
            <Col span={12}>
              <SectionTitle>Cost by API Key</SectionTitle>
              <Table
                dataSource={currentMonth.perKeyBreakdown}
                columns={keyColumns}
                rowKey="apiKeyId"
                pagination={false}
                size="small"
                locale={{
                  emptyText: (
                    <Empty
                      description="No API key usage this month"
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                    />
                  ),
                }}
              />
            </Col>
            <Col span={12}>
              <SectionTitle>Cost by API Type</SectionTitle>
              <Table
                dataSource={currentMonth.perApiTypeBreakdown}
                columns={apiTypeColumns}
                rowKey="apiType"
                pagination={false}
                size="small"
                locale={{
                  emptyText: (
                    <Empty
                      description="No API usage this month"
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                    />
                  ),
                }}
              />
            </Col>
          </Row>
        )}

        {/* ── Overage Breakdown ─────────────────────── */}
        {overageBreakdown && overageBreakdown.totalPaidQueries > 0 && (
          <>
            <Divider />
            <SectionTitle>
              <ThunderboltOutlined className="mr-1" />
              Overage Breakdown — Current Period
            </SectionTitle>
            <Card size="small" className="mb-4">
              <Row gutter={16}>
                <Col span={6}>
                  <Text type="secondary">Billing Period</Text>
                  <br />
                  <Text strong>
                    {new Date(overageBreakdown.periodStart).toLocaleDateString()}{' '}
                    – {new Date(overageBreakdown.periodEnd).toLocaleDateString()}
                  </Text>
                </Col>
                <Col span={6}>
                  <Text type="secondary">Free Tier</Text>
                  <br />
                  <Text strong>
                    {overageBreakdown.freeTierLimit.toLocaleString()} queries
                    included
                  </Text>
                </Col>
                <Col span={6}>
                  <Text type="secondary">Overage Queries</Text>
                  <br />
                  <Text strong style={{ color: '#fa8c16' }}>
                    {overageBreakdown.totalPaidQueries.toLocaleString()} @{' '}
                    ${overageBreakdown.costPerQuery}/query
                  </Text>
                </Col>
                <Col span={6}>
                  <Text type="secondary">Overage Total</Text>
                  <br />
                  <Text strong style={{ color: '#f5222d', fontSize: 16 }}>
                    ${overageBreakdown.totalCost.toFixed(2)}
                  </Text>
                </Col>
              </Row>
            </Card>
            <Collapse
              size="small"
              className="mb-4"
              items={[
                {
                  key: 'daily',
                  label: `Daily overage detail (${overageBreakdown.dailyBreakdown.length} days with charges)`,
                  children: (
                    <Table<OverageLineItem>
                      dataSource={overageBreakdown.dailyBreakdown}
                      rowKey="date"
                      pagination={false}
                      size="small"
                      columns={[
                        {
                          title: 'Date',
                          dataIndex: 'date',
                          key: 'date',
                          width: 140,
                        },
                        {
                          title: 'Paid Queries',
                          dataIndex: 'paidQueries',
                          key: 'paidQueries',
                          align: 'right' as const,
                          width: 120,
                          render: (v: number) => v.toLocaleString(),
                        },
                        {
                          title: 'Rate',
                          dataIndex: 'costPerQuery',
                          key: 'costPerQuery',
                          align: 'right' as const,
                          width: 100,
                          render: (v: number) => `$${v.toFixed(2)}`,
                        },
                        {
                          title: 'Cost',
                          dataIndex: 'cost',
                          key: 'cost',
                          align: 'right' as const,
                          width: 120,
                          render: (v: number) => (
                            <Text strong style={{ color: '#f5222d' }}>
                              ${v.toFixed(2)}
                            </Text>
                          ),
                        },
                      ]}
                      summary={() => (
                        <Table.Summary.Row>
                          <Table.Summary.Cell index={0}>
                            <Text strong>Total</Text>
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={1} align="right">
                            <Text strong>
                              {overageBreakdown.totalPaidQueries.toLocaleString()}
                            </Text>
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={2} />
                          <Table.Summary.Cell index={3} align="right">
                            <Text strong style={{ color: '#f5222d' }}>
                              ${overageBreakdown.totalCost.toFixed(2)}
                            </Text>
                          </Table.Summary.Cell>
                        </Table.Summary.Row>
                      )}
                    />
                  ),
                },
              ]}
            />
          </>
        )}

        {/* ── Invoices ────────────────────────────────── */}
        {stripeEnabled && (upcomingInvoice || pastInvoices.length > 0) && (
          <>
            <Divider />
            <SectionTitle>
              <FileTextOutlined className="mr-1" />
              Invoices
            </SectionTitle>

            {upcomingInvoice && (
              <Card
                size="small"
                className="mb-3"
                title={
                  <Space>
                    <Tag color="blue">Upcoming</Tag>
                    <Text>
                      Next invoice · {upcomingInvoice.lineItems.length} line
                      item{upcomingInvoice.lineItems.length !== 1 ? 's' : ''}
                    </Text>
                  </Space>
                }
                extra={
                  <Text strong style={{ fontSize: 16 }}>
                    ${upcomingInvoice.total.toFixed(2)}{' '}
                    <Text
                      type="secondary"
                      style={{ fontSize: 12, fontWeight: 400 }}
                    >
                      {upcomingInvoice.currency.toUpperCase()}
                    </Text>
                  </Text>
                }
              >
                <Table<InvoiceLineItem>
                  dataSource={upcomingInvoice.lineItems}
                  rowKey="id"
                  pagination={false}
                  size="small"
                  columns={[
                    {
                      title: 'Description',
                      dataIndex: 'description',
                      key: 'description',
                      render: (v: string | null) => v || '—',
                    },
                    {
                      title: 'Qty',
                      dataIndex: 'quantity',
                      key: 'quantity',
                      align: 'right' as const,
                      width: 80,
                      render: (v: number | null) =>
                        v != null ? v.toLocaleString() : '—',
                    },
                    {
                      title: 'Unit Price',
                      dataIndex: 'unitAmount',
                      key: 'unitAmount',
                      align: 'right' as const,
                      width: 110,
                      render: (v: number | null) =>
                        v != null ? `$${v.toFixed(2)}` : '—',
                    },
                    {
                      title: 'Amount',
                      dataIndex: 'amount',
                      key: 'amount',
                      align: 'right' as const,
                      width: 110,
                      render: (v: number) => (
                        <Text strong>${v.toFixed(2)}</Text>
                      ),
                    },
                    {
                      title: 'Period',
                      key: 'period',
                      width: 200,
                      render: (_: any, r: InvoiceLineItem) =>
                        r.periodStart && r.periodEnd
                          ? `${new Date(r.periodStart).toLocaleDateString()} – ${new Date(r.periodEnd).toLocaleDateString()}`
                          : '—',
                    },
                  ]}
                />
              </Card>
            )}

            {pastInvoices.length > 0 && (
              <Table<Invoice>
                dataSource={pastInvoices}
                rowKey="id"
                size="small"
                pagination={{ pageSize: 10 }}
                expandable={{
                  expandedRowRender: (record) => (
                    <Table<InvoiceLineItem>
                      dataSource={record.lineItems}
                      rowKey="id"
                      pagination={false}
                      size="small"
                      columns={[
                        {
                          title: 'Description',
                          dataIndex: 'description',
                          key: 'description',
                          render: (v: string | null) => v || '—',
                        },
                        {
                          title: 'Qty',
                          dataIndex: 'quantity',
                          key: 'quantity',
                          align: 'right' as const,
                          width: 80,
                          render: (v: number | null) =>
                            v != null ? v.toLocaleString() : '—',
                        },
                        {
                          title: 'Unit Price',
                          dataIndex: 'unitAmount',
                          key: 'unitAmount',
                          align: 'right' as const,
                          width: 110,
                          render: (v: number | null) =>
                            v != null ? `$${v.toFixed(2)}` : '—',
                        },
                        {
                          title: 'Amount',
                          dataIndex: 'amount',
                          key: 'amount',
                          align: 'right' as const,
                          width: 110,
                          render: (v: number) => `$${v.toFixed(2)}`,
                        },
                      ]}
                    />
                  ),
                  rowExpandable: (r) => r.lineItems.length > 0,
                }}
                columns={[
                  {
                    title: 'Date',
                    dataIndex: 'created',
                    key: 'created',
                    width: 120,
                    render: (v: string) =>
                      new Date(v).toLocaleDateString(),
                  },
                  {
                    title: 'Status',
                    dataIndex: 'status',
                    key: 'status',
                    width: 100,
                    render: (v: string | null) => (
                      <Tag
                        color={
                          v === 'paid'
                            ? 'green'
                            : v === 'open'
                              ? 'blue'
                              : v === 'draft'
                                ? 'default'
                                : v === 'uncollectible'
                                  ? 'red'
                                  : 'orange'
                        }
                      >
                        {v || 'unknown'}
                      </Tag>
                    ),
                  },
                  {
                    title: 'Total',
                    dataIndex: 'total',
                    key: 'total',
                    align: 'right' as const,
                    width: 110,
                    render: (v: number) => (
                      <Text strong>${v.toFixed(2)}</Text>
                    ),
                  },
                  {
                    title: 'Line Items',
                    key: 'lineCount',
                    width: 100,
                    align: 'center' as const,
                    render: (_: any, r: Invoice) => (
                      <Tag>{r.lineItems.length}</Tag>
                    ),
                  },
                  {
                    title: '',
                    key: 'actions',
                    width: 80,
                    render: (_: any, r: Invoice) => (
                      <Space size={4}>
                        {r.hostedInvoiceUrl && (
                          <Tooltip title="View invoice">
                            <Button
                              type="text"
                              size="small"
                              icon={<LinkOutlined />}
                              onClick={() =>
                                window.open(r.hostedInvoiceUrl!, '_blank')
                              }
                            />
                          </Tooltip>
                        )}
                        {r.invoicePdfUrl && (
                          <Tooltip title="Download PDF">
                            <Button
                              type="text"
                              size="small"
                              icon={<DownloadOutlined />}
                              onClick={() =>
                                window.open(r.invoicePdfUrl!, '_blank')
                              }
                            />
                          </Tooltip>
                        )}
                      </Space>
                    ),
                  },
                ]}
              />
            )}
          </>
        )}

        {/* Monthly history */}
        <SectionTitle>Monthly History</SectionTitle>
        <Table
          dataSource={
            currentMonth
              ? [currentMonth, ...history]
              : history
          }
          columns={monthlyColumns}
          rowKey={(r) => `${r.year}-${r.month}`}
          pagination={{ pageSize: 12 }}
          size="middle"
          locale={{
            emptyText: (
              <Empty
                description="No billing history yet"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            ),
          }}
        />

        {configVisible && (
          <ConfigModal
            visible={configVisible}
            config={config || null}
            onClose={() => setConfigVisible(false)}
            onSave={handleUpdateConfig}
          />
        )}
      </PageLayout>
    </SiderLayout>
  );
}
