/**
 * Mock fixtures for connector E2E tests.
 *
 * These provide predefined GraphQL responses so the tests
 * can exercise every data-source form without a real backend.
 */

// ---------------------------------------------------------------------------
// Shared sample table schema returned by listDataSourceTables
// ---------------------------------------------------------------------------
export const MOCK_TABLES = [
  {
    name: 'customers',
    columns: [
      { name: 'id', type: 'INTEGER' },
      { name: 'name', type: 'VARCHAR' },
      { name: 'email', type: 'VARCHAR' },
      { name: 'created_at', type: 'TIMESTAMP' },
    ],
  },
  {
    name: 'orders',
    columns: [
      { name: 'id', type: 'INTEGER' },
      { name: 'customer_id', type: 'INTEGER' },
      { name: 'total', type: 'DECIMAL' },
      { name: 'status', type: 'VARCHAR' },
      { name: 'ordered_at', type: 'TIMESTAMP' },
    ],
  },
  {
    name: 'products',
    columns: [
      { name: 'id', type: 'INTEGER' },
      { name: 'name', type: 'VARCHAR' },
      { name: 'price', type: 'DECIMAL' },
      { name: 'category', type: 'VARCHAR' },
    ],
  },
];

export const MOCK_RELATIONS = [
  {
    id: 1,
    displayName: 'orders',
    referenceName: 'orders',
    relations: [
      {
        fromModelId: 1,
        fromModelReferenceName: 'orders',
        fromColumnId: 2,
        fromColumnReferenceName: 'customer_id',
        toModelId: 0,
        toModelReferenceName: 'customers',
        toColumnId: 0,
        toColumnReferenceName: 'id',
        type: 'MANY_TO_ONE',
        name: 'orders_customer_id_customers_id',
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Per-connector form fill data
// ---------------------------------------------------------------------------
export interface ConnectorFormData {
  /** Text shown on the data source selector button */
  buttonLabel: string;
  /** Enum value returned in saveDataSource response */
  type: string;
  /** Steps to fill the form. Each step: { label, value, action? } */
  fields: FormField[];
}

export interface FormField {
  /** Ant Design label text (matches getByLabel / getByText) */
  label: string;
  /** Value to fill / select */
  value: string;
  /** 'fill' (default), 'check', 'upload', 'radio', 'skip' */
  action?: 'fill' | 'check' | 'upload' | 'radio' | 'skip';
}

export const CONNECTORS: ConnectorFormData[] = [
  // ── 1. PostgreSQL ──────────────────────────────────────────────
  {
    buttonLabel: 'PostgreSQL',
    type: 'POSTGRES',
    fields: [
      { label: 'Display name', value: 'test-postgres' },
      { label: 'Host', value: '127.0.0.1' },
      { label: 'Port', value: '5432' },
      { label: 'Username', value: 'testuser' },
      { label: 'Password', value: 'testpass' },
      { label: 'Database name', value: 'testdb' },
    ],
  },

  // ── 2. MySQL ───────────────────────────────────────────────────
  {
    buttonLabel: 'MySQL',
    type: 'MYSQL',
    fields: [
      { label: 'Display name', value: 'test-mysql' },
      { label: 'Host', value: '127.0.0.1' },
      { label: 'Port', value: '3306' },
      { label: 'Username', value: 'testuser' },
      { label: 'Password', value: 'testpass' },
      { label: 'Database name', value: 'testdb' },
    ],
  },

  // ── 3. SQL Server ──────────────────────────────────────────────
  {
    buttonLabel: 'SQL Server',
    type: 'MSSQL',
    fields: [
      { label: 'Display name', value: 'test-mssql' },
      { label: 'Host', value: '127.0.0.1' },
      { label: 'Port', value: '1433' },
      { label: 'Username', value: 'sa' },
      { label: 'Password', value: 'TestPass123!' },
      { label: 'Database name', value: 'testdb' },
    ],
  },

  // ── 4. Oracle ──────────────────────────────────────────────────
  {
    buttonLabel: 'Oracle',
    type: 'ORACLE',
    fields: [
      { label: 'Display name', value: 'test-oracle' },
      { label: 'Host', value: '127.0.0.1' },
      { label: 'Port', value: '1521' },
      { label: 'Username', value: 'testuser' },
      { label: 'Password', value: 'testpass' },
      { label: 'Database name', value: 'XEPDB1' },
    ],
  },

  // ── 5. ClickHouse ──────────────────────────────────────────────
  {
    buttonLabel: 'ClickHouse',
    type: 'CLICK_HOUSE',
    fields: [
      { label: 'Display name', value: 'test-clickhouse' },
      { label: 'Host', value: '127.0.0.1' },
      { label: 'Port', value: '8123' },
      { label: 'Username', value: 'default' },
      { label: 'Password', value: '' },
      { label: 'Database name', value: 'default' },
    ],
  },

  // ── 6. Trino ───────────────────────────────────────────────────
  {
    buttonLabel: 'Trino',
    type: 'TRINO',
    fields: [
      { label: 'Display name', value: 'test-trino' },
      { label: 'Host', value: '127.0.0.1' },
      { label: 'Port', value: '8080' },
      { label: 'Schemas', value: 'public' },
      { label: 'Username', value: 'trino' },
      { label: 'Password', value: '' },
    ],
  },

  // ── 7. DuckDB ──────────────────────────────────────────────────
  {
    buttonLabel: 'DuckDB',
    type: 'DUCKDB',
    fields: [
      { label: 'Display name', value: 'test-duckdb' },
      {
        label: 'Initial SQL statements',
        value:
          "CREATE TABLE customers(id INTEGER, name VARCHAR);\nINSERT INTO customers VALUES (1, 'Alice');",
      },
    ],
  },

  // ── 8. Snowflake ───────────────────────────────────────────────
  {
    buttonLabel: 'Snowflake',
    type: 'SNOWFLAKE',
    fields: [
      { label: 'Display name', value: 'test-snowflake' },
      { label: 'Account', value: 'xy12345.us-east-1' },
      { label: 'Database name', value: 'TESTDB' },
      { label: 'Schema', value: 'PUBLIC' },
      { label: 'Warehouse', value: 'COMPUTE_WH' },
      { label: 'User', value: 'testuser' },
      { label: 'Password', value: 'testpass' },
    ],
  },

  // ── 9. BigQuery ────────────────────────────────────────────────
  {
    buttonLabel: 'BigQuery',
    type: 'BIG_QUERY',
    fields: [
      { label: 'Display name', value: 'test-bigquery' },
      { label: 'Project ID', value: 'my-gcp-project' },
      { label: 'Dataset ID', value: 'my_dataset' },
      // Credentials: handled specially (file upload) — see test
      { label: 'Credentials', value: '', action: 'upload' },
    ],
  },

  // ── 10. Athena ─────────────────────────────────────────────────
  {
    buttonLabel: 'Athena (Trino)',
    type: 'ATHENA',
    fields: [
      { label: 'Display name', value: 'test-athena' },
      { label: 'Database (schema)', value: 'default' },
      { label: 'S3 staging directory', value: 's3://my-bucket/staging/' },
      { label: 'AWS region', value: 'us-east-1' },
      // Default auth = AWS credentials
      { label: 'AWS access key ID', value: 'AKIAIOSFODNN7EXAMPLE' },
      { label: 'AWS secret access key', value: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY' },
    ],
  },

  // ── 11. Redshift ───────────────────────────────────────────────
  {
    buttonLabel: 'Redshift',
    type: 'REDSHIFT',
    fields: [
      { label: 'Display name', value: 'test-redshift' },
      // Default auth = Username and password
      { label: 'Host', value: 'my-cluster.abc123.us-east-1.redshift.amazonaws.com' },
      { label: 'Port', value: '5439' },
      { label: 'Username', value: 'testuser' },
      { label: 'Password', value: 'testpass' },
      { label: 'Database', value: 'dev' },
    ],
  },

  // ── 12. Databricks ─────────────────────────────────────────────
  {
    buttonLabel: 'Databricks',
    type: 'DATABRICKS',
    fields: [
      { label: 'Display name', value: 'test-databricks' },
      // Default auth = Personal Access Token
      { label: 'Server hostname', value: 'adb-1234567890.12.azuredatabricks.net' },
      { label: 'HTTP path', value: '/sql/1.0/warehouses/abcdef' },
      { label: 'Access token', value: 'dapi0123456789abcdef' },
    ],
  },
];
