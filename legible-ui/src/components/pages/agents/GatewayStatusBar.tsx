import { useMemo } from 'react';
import { Card, Col, Row, Space, Tag, Typography, Progress } from 'antd';
import styled from 'styled-components';
import CloudServerOutlined from '@ant-design/icons/CloudServerOutlined';
import CheckCircleOutlined from '@ant-design/icons/CheckCircleOutlined';
import CloseCircleOutlined from '@ant-design/icons/CloseCircleOutlined';
import LoadingOutlined from '@ant-design/icons/LoadingOutlined';
import useOrganization from '@/hooks/useOrganization';
import {
  GatewayFieldsFragment,
  useGatewayForOrgQuery,
} from '@/apollo/client/graphql/gateways.generated';

const { Text } = Typography;

const StyledCard = styled(Card)`
  margin-bottom: 16px;

  .ant-card-body {
    padding: 16px 24px;
  }
`;

const StatLabel = styled(Text)`
  display: block;
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
  margin-bottom: 4px;
`;

const GATEWAY_STATUS_MAP: Record<
  string,
  { color: string; icon: React.ReactNode; label: string }
> = {
  RUNNING: {
    color: 'green',
    icon: <CheckCircleOutlined />,
    label: 'Running',
  },
  STARTING: {
    color: 'blue',
    icon: <LoadingOutlined />,
    label: 'Starting',
  },
  STOPPED: {
    color: 'default',
    icon: <CloseCircleOutlined />,
    label: 'Stopped',
  },
  FAILED: {
    color: 'red',
    icon: <CloseCircleOutlined />,
    label: 'Failed',
  },
};

function getStatusTag(status: string) {
  const mapped = GATEWAY_STATUS_MAP[status] || {
    color: 'default',
    icon: null,
    label: status,
  };
  return (
    <Tag icon={mapped.icon} color={mapped.color}>
      {mapped.label}
    </Tag>
  );
}

function SandboxUsage({ gateway }: { gateway: GatewayFieldsFragment }) {
  const percent = gateway.maxSandboxes
    ? Math.round((gateway.sandboxCount / gateway.maxSandboxes) * 100)
    : 0;
  const color = percent >= 90 ? '#ff4d4f' : percent >= 70 ? '#faad14' : '#52c41a';

  return (
    <div>
      <Text strong>
        {gateway.sandboxCount} / {gateway.maxSandboxes}
      </Text>
      <Progress
        percent={percent}
        size="small"
        strokeColor={color}
        showInfo={false}
        style={{ marginTop: 4, marginBottom: 0 }}
      />
    </div>
  );
}

export default function GatewayStatusBar() {
  const { currentOrgId } = useOrganization();

  const { data, loading } = useGatewayForOrgQuery({
    variables: { organizationId: currentOrgId! },
    skip: !currentOrgId,
    fetchPolicy: 'cache-and-network',
    pollInterval: 15000,
  });

  const gateway = useMemo(
    () => data?.gatewayForOrganization ?? null,
    [data],
  );

  if (loading && !gateway) return null;
  if (!gateway) return null;

  return (
    <StyledCard>
      <Row align="middle" gutter={32}>
        <Col>
          <Space>
            <CloudServerOutlined style={{ fontSize: 20, color: '#1890ff' }} />
            <Text strong>Gateway</Text>
            {getStatusTag(gateway.status)}
          </Space>
        </Col>
        <Col>
          <StatLabel>Endpoint</StatLabel>
          <Text code>
            {gateway.endpoint
              ? `${gateway.endpoint}:${gateway.port}`
              : '—'}
          </Text>
        </Col>
        <Col>
          <StatLabel>Resources</StatLabel>
          <Text>
            {gateway.cpus} CPU · {gateway.memory} RAM
          </Text>
        </Col>
        <Col>
          <StatLabel>Sandboxes</StatLabel>
          <SandboxUsage gateway={gateway} />
        </Col>
        {gateway.version && (
          <Col>
            <StatLabel>Version</StatLabel>
            <Text>{gateway.version}</Text>
          </Col>
        )}
        {gateway.errorMessage && (
          <Col flex="auto">
            <StatLabel>Error</StatLabel>
            <Text type="danger">{gateway.errorMessage}</Text>
          </Col>
        )}
      </Row>
    </StyledCard>
  );
}
