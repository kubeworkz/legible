import { useMemo, useState } from 'react';
import {
  Button,
  Card,
  Col,
  Empty,
  Input,
  message,
  Modal,
  Row,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
} from 'antd';
import AppstoreOutlined from '@ant-design/icons/AppstoreOutlined';
import DownloadOutlined from '@ant-design/icons/DownloadOutlined';
import SearchOutlined from '@ant-design/icons/SearchOutlined';
import StarFilled from '@ant-design/icons/StarFilled';
import DatabaseOutlined from '@ant-design/icons/DatabaseOutlined';
import SiderLayout from '@/components/layouts/SiderLayout';
import PageLayout from '@/components/layouts/PageLayout';
import {
  RegistryEntryData,
  useRegistryQuery,
  useInstallRegistryEntryMutation,
} from '@/apollo/client/graphql/registry.generated';

const { Text, Paragraph, Title } = Typography;
const { Meta } = Card;

const CONNECTOR_OPTIONS = [
  { label: 'All Connectors', value: '' },
  { label: 'PostgreSQL', value: 'POSTGRES' },
  { label: 'BigQuery', value: 'BIG_QUERY' },
  { label: 'Snowflake', value: 'SNOWFLAKE' },
  { label: 'MySQL', value: 'MYSQL' },
  { label: 'Oracle', value: 'ORACLE' },
  { label: 'SQL Server', value: 'MSSQL' },
  { label: 'ClickHouse', value: 'CLICK_HOUSE' },
  { label: 'Trino', value: 'TRINO' },
  { label: 'DuckDB', value: 'DUCKDB' },
  { label: 'Athena', value: 'ATHENA' },
  { label: 'Redshift', value: 'REDSHIFT' },
  { label: 'Databricks', value: 'DATABRICKS' },
];

const CATEGORY_OPTIONS = [
  { label: 'All Categories', value: '' },
  { label: 'Connector', value: 'connector' },
  { label: 'General', value: 'general' },
  { label: 'Analysis', value: 'analysis' },
];

const CATEGORY_COLORS: Record<string, string> = {
  connector: 'blue',
  general: 'green',
  analysis: 'purple',
};

function ConnectorTags({ connectors }: { connectors: string[] }) {
  if (!connectors || connectors.length === 0) return <Text type="secondary">Universal</Text>;
  if (connectors.length > 4) {
    return (
      <Space size={[4, 4]} wrap>
        {connectors.slice(0, 3).map((c) => (
          <Tag key={c} style={{ margin: 0 }}>{c}</Tag>
        ))}
        <Tag style={{ margin: 0 }}>+{connectors.length - 3} more</Tag>
      </Space>
    );
  }
  return (
    <Space size={[4, 4]} wrap>
      {connectors.map((c) => (
        <Tag key={c} style={{ margin: 0 }}>{c}</Tag>
      ))}
    </Space>
  );
}

function RegistryCard({
  entry,
  onInstall,
  installing,
}: {
  entry: RegistryEntryData;
  onInstall: (entry: RegistryEntryData) => void;
  installing: boolean;
}) {
  return (
    <Card
      hoverable
      style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
      bodyStyle={{ flex: 1, display: 'flex', flexDirection: 'column' }}
      actions={[
        <Button
          key="install"
          type="link"
          icon={<DownloadOutlined />}
          loading={installing}
          onClick={() => onInstall(entry)}
        >
          Install to Project
        </Button>,
      ]}
    >
      <Meta
        title={
          <Space>
            <DatabaseOutlined />
            <span>{entry.name}</span>
            {entry.isOfficial && (
              <Tag color="gold" icon={<StarFilled />} style={{ marginLeft: 4 }}>
                Official
              </Tag>
            )}
          </Space>
        }
        description={
          <Space direction="vertical" size={4} style={{ width: '100%' }}>
            <Text type="secondary">v{entry.version}</Text>
            {entry.category && (
              <Tag color={CATEGORY_COLORS[entry.category] || 'default'}>
                {entry.category}
              </Tag>
            )}
          </Space>
        }
      />
      <Paragraph
        type="secondary"
        ellipsis={{ rows: 2 }}
        style={{ marginTop: 12, marginBottom: 8 }}
      >
        {entry.description || 'No description'}
      </Paragraph>
      <div style={{ marginTop: 'auto' }}>
        <ConnectorTags connectors={entry.supportedConnectors} />
        {entry.tags && entry.tags.length > 0 && (
          <div style={{ marginTop: 8 }}>
            {entry.tags.map((tag) => (
              <Tag key={tag} color="cyan" style={{ marginBottom: 4 }}>
                {tag}
              </Tag>
            ))}
          </div>
        )}
        <div style={{ marginTop: 8 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {entry.installCount} install{entry.installCount !== 1 ? 's' : ''}
          </Text>
        </div>
      </div>
    </Card>
  );
}

export default function RegistryPage() {
  const { data, loading, refetch } = useRegistryQuery();
  const [installEntry, { loading: installing }] =
    useInstallRegistryEntryMutation();
  const [connectorFilter, setConnectorFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [searchText, setSearchText] = useState('');

  const entries = useMemo(() => {
    let result = data?.blueprintRegistry || [];

    if (connectorFilter) {
      result = result.filter((e) =>
        e.supportedConnectors?.includes(connectorFilter),
      );
    }
    if (categoryFilter) {
      result = result.filter((e) => e.category === categoryFilter);
    }
    if (searchText) {
      const lower = searchText.toLowerCase();
      result = result.filter(
        (e) =>
          e.name.toLowerCase().includes(lower) ||
          (e.description || '').toLowerCase().includes(lower) ||
          (e.tags || []).some((t) => t.toLowerCase().includes(lower)),
      );
    }

    return result;
  }, [data, connectorFilter, categoryFilter, searchText]);

  const handleInstall = async (entry: RegistryEntryData) => {
    Modal.confirm({
      title: `Install "${entry.name}" to your project?`,
      content:
        'This will create a new blueprint in your project based on this template. You can customize it after installation.',
      okText: 'Install',
      onOk: async () => {
        try {
          await installEntry({
            variables: { registryEntryId: entry.id },
          });
          message.success(`Blueprint "${entry.name}" installed to project`);
          refetch();
        } catch (err: any) {
          message.error(err?.message || 'Failed to install blueprint');
        }
      },
    });
  };

  return (
    <SiderLayout>
      <PageLayout
        title={
          <Space>
            <AppstoreOutlined style={{ fontSize: 20 }} />
            Template Gallery
          </Space>
        }
        description="Browse and install pre-built agent blueprints optimized for your data sources. Each template includes connector-specific tools, network policies, and inference profiles."
      >
        {/* Filters */}
        <Space style={{ marginBottom: 16 }} size="middle" wrap>
          <Input
            placeholder="Search templates..."
            prefix={<SearchOutlined />}
            allowClear
            style={{ width: 240 }}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
          <Select
            value={connectorFilter}
            onChange={setConnectorFilter}
            options={CONNECTOR_OPTIONS}
            style={{ width: 180 }}
            placeholder="Filter by connector"
          />
          <Select
            value={categoryFilter}
            onChange={setCategoryFilter}
            options={CATEGORY_OPTIONS}
            style={{ width: 180 }}
            placeholder="Filter by category"
          />
          {(connectorFilter || categoryFilter || searchText) && (
            <Button
              onClick={() => {
                setConnectorFilter('');
                setCategoryFilter('');
                setSearchText('');
              }}
            >
              Clear Filters
            </Button>
          )}
        </Space>

        {/* Results summary */}
        <div style={{ marginBottom: 16 }}>
          <Text type="secondary">
            {entries.length} template{entries.length !== 1 ? 's' : ''} available
          </Text>
        </div>

        {/* Gallery grid */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" />
          </div>
        ) : entries.length === 0 ? (
          <Empty
            description={
              connectorFilter || categoryFilter || searchText
                ? 'No templates match your filters'
                : 'No templates in the registry yet. Templates will be populated on startup.'
            }
          />
        ) : (
          <Row gutter={[16, 16]}>
            {entries.map((entry) => (
              <Col key={entry.id} xs={24} sm={12} lg={8} xl={6}>
                <RegistryCard
                  entry={entry}
                  onInstall={handleInstall}
                  installing={installing}
                />
              </Col>
            ))}
          </Row>
        )}
      </PageLayout>
    </SiderLayout>
  );
}
