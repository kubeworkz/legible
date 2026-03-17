import { useMemo, useCallback } from 'react';
import { Typography, message, Button, Alert, Progress, Card, Row, Col } from 'antd';
import styled from 'styled-components';
import CopyOutlined from '@ant-design/icons/CopyOutlined';
import KeyOutlined from '@ant-design/icons/KeyOutlined';
import BarChartOutlined from '@ant-design/icons/BarChartOutlined';
import { useRouter } from 'next/router';
import { useQuery } from '@apollo/client';
import SettingsLayout from '@/components/layouts/SettingsLayout';
import useProject from '@/hooks/useProject';
import { Path, buildPath } from '@/utils/enum';
import { QUERY_USAGE_OVERVIEW } from '@/apollo/client/graphql/queryUsage';

const { Title, Text, Paragraph } = Typography;

const PageContainer = styled.div`
  max-width: 720px;
  padding: 24px 32px;
`;

const Section = styled.div`
  margin-bottom: 32px;
`;

const CodeBlock = styled.pre`
  background: var(--gray-2);
  border: 1px solid var(--gray-4);
  border-radius: 8px;
  padding: 16px;
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: 13px;
  line-height: 1.5;
  overflow-x: auto;
  position: relative;
  white-space: pre-wrap;
  word-break: break-all;
`;

const CopyButton = styled(Button)`
  position: absolute;
  top: 8px;
  right: 8px;
`;

const CodeBlockWrapper = styled.div`
  position: relative;
`;

const MonoValue = styled.span`
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  color: var(--gray-8);
  background: var(--gray-3);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 13px;
`;

const FieldLabel = styled.div`
  color: var(--gray-8);
  font-weight: 500;
  margin-bottom: 4px;
`;

const FieldDescription = styled.div`
  color: var(--gray-6);
  font-size: 12px;
  margin-top: 2px;
  margin-bottom: 16px;
`;

const StatLabel = styled.div`
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
  margin-bottom: 2px;
`;

const StatValue = styled.div`
  font-size: 20px;
  font-weight: 600;
`;

const FREE_TIER_LIMIT = 25;

function copyText(text: string) {
  if (navigator.clipboard) {
    navigator.clipboard
      .writeText(text)
      .then(() => message.success('Copied to clipboard'))
      .catch(() => {
        fallbackCopy(text);
        message.success('Copied to clipboard');
      });
  } else {
    fallbackCopy(text);
    message.success('Copied to clipboard');
  }
}

function fallbackCopy(text: string) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  document.body.removeChild(ta);
}

export default function SettingsMcp() {
  const { currentProject } = useProject();
  const router = useRouter();

  // Fetch usage overview for the summary card
  const { data: usageData } = useQuery(QUERY_USAGE_OVERVIEW, {
    fetchPolicy: 'cache-and-network',
  });
  const overview = usageData?.queryUsageOverview;

  // Build the MCP endpoint URL.
  // In production this is the same host the user is on, port 9000.
  const mcpEndpoint = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const hostname = window.location.hostname;
    return `http://${hostname}:9000/mcp`;
  }, []);

  const navigateToApiKeys = useCallback(() => {
    if (currentProject?.id) {
      router.push(buildPath(Path.SettingsProjectApiKeys, currentProject.id));
    }
  }, [currentProject, router]);

  const navigateToUsage = useCallback(() => {
    if (currentProject?.id) {
      router.push(buildPath(Path.APIManagementQueryUsage, currentProject.id));
    }
  }, [currentProject, router]);

  // Config snippet for Claude Desktop / Cursor / etc.
  const configSnippet = useMemo(() => {
    return JSON.stringify(
      {
        mcpServers: {
          legible: {
            url: mcpEndpoint,
            headers: {
              Authorization: 'Bearer YOUR_PROJECT_API_KEY',
            },
          },
        },
      },
      null,
      2,
    );
  }, [mcpEndpoint]);

  // curl test command
  const curlCommand = useMemo(() => {
    return `curl -X POST ${mcpEndpoint} \\
  -H "Content-Type: application/json" \\
  -H "Accept: application/json, text/event-stream" \\
  -H "Authorization: Bearer YOUR_PROJECT_API_KEY" \\
  -d '{"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}},"id":1}'`;
  }, [mcpEndpoint]);

  return (
    <SettingsLayout>
      <PageContainer>
        <Title level={4} style={{ marginBottom: 4 }}>
          MCP Connection
        </Title>
        <Paragraph type="secondary" style={{ marginBottom: 24 }}>
          Connect AI assistants like Claude, Cursor, or Cline to your data
          through the{' '}
          <a
            href="https://modelcontextprotocol.io"
            target="_blank"
            rel="noopener noreferrer"
          >
            Model Context Protocol (MCP)
          </a>
          .
        </Paragraph>

        <Section>
          <FieldLabel>MCP Endpoint</FieldLabel>
          <FieldDescription>
            The Streamable HTTP endpoint for MCP clients.
          </FieldDescription>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <MonoValue>{mcpEndpoint}</MonoValue>
            <Button
              type="text"
              size="small"
              icon={<CopyOutlined />}
              onClick={() => copyText(mcpEndpoint)}
            />
          </div>
        </Section>

        <Section>
          <FieldLabel>Authentication</FieldLabel>
          <FieldDescription>
            Each MCP connection requires a Project API Key. The key routes
            queries to this project&apos;s data source and MDL, and tracks usage
            for billing.
          </FieldDescription>
          <Button
            icon={<KeyOutlined />}
            onClick={navigateToApiKeys}
          >
            Manage Project API Keys
          </Button>
        </Section>

        {overview && (
          <Section>
            <FieldLabel>Query Usage</FieldLabel>
            <FieldDescription>
              MCP queries count toward your organization&apos;s usage quota.
            </FieldDescription>
            <Card size="small" style={{ marginBottom: 12 }}>
              <Row gutter={24}>
                <Col span={8}>
                  <StatLabel>Queries This Month</StatLabel>
                  <StatValue>{overview.summary.totalQueries}</StatValue>
                </Col>
                <Col span={8}>
                  <StatLabel>Free Tier Remaining</StatLabel>
                  <StatValue
                    style={{
                      color:
                        overview.freeTierRemaining <= 0
                          ? '#cf1322'
                          : undefined,
                    }}
                  >
                    {overview.freeTierRemaining}
                  </StatValue>
                </Col>
                <Col span={8}>
                  <StatLabel>Total Cost</StatLabel>
                  <StatValue>${overview.summary.totalCost.toFixed(2)}</StatValue>
                </Col>
              </Row>
              {overview.isFreeTier && (
                <Progress
                  percent={Math.min(
                    100,
                    Math.round(
                      ((FREE_TIER_LIMIT - overview.freeTierRemaining) /
                        FREE_TIER_LIMIT) *
                        100,
                    ),
                  )}
                  size="small"
                  status={
                    overview.freeTierRemaining <= 0 ? 'exception' : 'active'
                  }
                  style={{ marginTop: 12 }}
                  format={() =>
                    `${FREE_TIER_LIMIT - overview.freeTierRemaining} / ${FREE_TIER_LIMIT}`
                  }
                />
              )}
            </Card>
            <Button
              icon={<BarChartOutlined />}
              onClick={navigateToUsage}
            >
              View Full Usage Dashboard
            </Button>
          </Section>
        )}

        <Section>
          <FieldLabel>Client Configuration</FieldLabel>
          <FieldDescription>
            Add this to your MCP client config (Claude Desktop, Cursor, Cline,
            etc.). Replace <MonoValue>YOUR_PROJECT_API_KEY</MonoValue> with a
            key from the API Keys page.
          </FieldDescription>
          <CodeBlockWrapper>
            <CodeBlock>{configSnippet}</CodeBlock>
            <CopyButton
              type="text"
              size="small"
              icon={<CopyOutlined />}
              onClick={() => copyText(configSnippet)}
            />
          </CodeBlockWrapper>
        </Section>

        <Section>
          <FieldLabel>Test Connection</FieldLabel>
          <FieldDescription>
            Run this curl command to verify the MCP endpoint is working.
          </FieldDescription>
          <CodeBlockWrapper>
            <CodeBlock>{curlCommand}</CodeBlock>
            <CopyButton
              type="text"
              size="small"
              icon={<CopyOutlined />}
              onClick={() => copyText(curlCommand)}
            />
          </CodeBlockWrapper>
        </Section>

        <Section>
          <FieldLabel>Available Tools</FieldLabel>
          <FieldDescription>
            Once connected, your AI assistant will have access to these tools:
          </FieldDescription>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Text>
              <strong>query</strong> — Execute SQL queries against your data
              source
            </Text>
            <Text>
              <strong>get_available_tables</strong> — List all tables in your
              semantic model
            </Text>
            <Text>
              <strong>get_table_info</strong> — Get detailed table schema and
              descriptions
            </Text>
            <Text>
              <strong>get_relationships</strong> — View table relationships and
              joins
            </Text>
            <Text>
              <strong>dry_run</strong> — Validate SQL without executing it
            </Text>
            <Text type="secondary" style={{ marginTop: 4 }}>
              …and 14 more tools for schema exploration, deployment, and
              validation.
            </Text>
          </div>
        </Section>

        <Alert
          type="info"
          showIcon
          message="DuckDB projects are not supported via MCP"
          description="MCP connections require a remote data source (PostgreSQL, BigQuery, Snowflake, etc.). DuckDB projects use a local engine that MCP cannot route through."
          style={{ marginTop: 8 }}
        />
      </PageContainer>
    </SettingsLayout>
  );
}
