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
} from 'antd';
import styled from 'styled-components';
import SiderLayout from '@/components/layouts/SiderLayout';
import PageLayout from '@/components/layouts/PageLayout';
import DollarOutlined from '@ant-design/icons/DollarOutlined';
import SettingOutlined from '@ant-design/icons/SettingOutlined';
import DownloadOutlined from '@ant-design/icons/DownloadOutlined';
import ReloadOutlined from '@ant-design/icons/ReloadOutlined';
import ThunderboltOutlined from '@ant-design/icons/ThunderboltOutlined';
import { useQuery, useMutation } from '@apollo/client';
import {
  BILLING_OVERVIEW,
  UPDATE_BILLING_CONFIG,
  RECOMPUTE_MONTHLY_BILLING,
} from '@/apollo/client/graphql/billing';
import type {
  BillingOverview,
  MonthlyBillingSummary,
  KeyCostBreakdown,
  ApiTypeCostBreakdown,
  BillingConfig,
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

  const [updateConfig] = useMutation(UPDATE_BILLING_CONFIG);
  const [recomputeBilling] = useMutation(RECOMPUTE_MONTHLY_BILLING);

  const overview = data?.billingOverview;
  const config = overview?.config;
  const currentMonth = overview?.currentMonth;
  const history = overview?.history || [];

  const currency = config?.currency || 'USD';

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
