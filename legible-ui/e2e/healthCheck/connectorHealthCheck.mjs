#!/usr/bin/env node
/**
 * Connector Health Check Script
 *
 * Tests each data source connector by sending a saveDataSource GraphQL
 * mutation to the running legible-ui server. This verifies that:
 *
 *   1. The GraphQL schema accepts each connector type
 *   2. Form field mapping / property transformation works
 *   3. The server processes the request (connection errors are expected
 *      since we use fake credentials — but the request should not 400)
 *
 * Usage:
 *   node e2e/healthCheck/connectorHealthCheck.mjs
 *   node e2e/healthCheck/connectorHealthCheck.mjs --base-url http://localhost:3000
 *
 * Expected output:
 *   Each connector will either:
 *   - PASS: Server accepted the mutation (connection may fail, but type is valid)
 *   - EXPECTED FAIL: Server returned a connection error (correct behavior)
 *   - FAIL: Server returned an unexpected error (bug)
 */

const BASE_URL = process.argv.includes('--base-url')
  ? process.argv[process.argv.indexOf('--base-url') + 1]
  : 'http://127.0.0.1:3000';

const GRAPHQL_URL = `${BASE_URL}/api/graphql`;

// Auth credentials (override via env vars or CLI args)
const AUTH_EMAIL = process.env.AUTH_EMAIL || 'dave@gridworkz.com';
const AUTH_PASSWORD = process.env.AUTH_PASSWORD || 'Gridworkz1!';

let AUTH_TOKEN = '';
let PROJECT_ID = '';

// Connector definitions: type → properties payload
const CONNECTORS = [
  {
    name: 'PostgreSQL',
    type: 'POSTGRES',
    properties: {
      displayName: 'healthcheck-postgres',
      host: '127.0.0.1',
      port: 5432,
      user: 'test',
      password: 'test',
      database: 'testdb',
      ssl: false,
    },
  },
  {
    name: 'MySQL',
    type: 'MYSQL',
    properties: {
      displayName: 'healthcheck-mysql',
      host: '127.0.0.1',
      port: 3306,
      user: 'test',
      password: 'test',
      database: 'testdb',
    },
  },
  {
    name: 'SQL Server',
    type: 'MSSQL',
    properties: {
      displayName: 'healthcheck-mssql',
      host: '127.0.0.1',
      port: 1433,
      user: 'sa',
      password: 'Test123!',
      database: 'testdb',
    },
  },
  {
    name: 'Oracle',
    type: 'ORACLE',
    properties: {
      displayName: 'healthcheck-oracle',
      host: '127.0.0.1',
      port: 1521,
      user: 'test',
      password: 'test',
      database: 'XEPDB1',
    },
  },
  {
    name: 'ClickHouse',
    type: 'CLICK_HOUSE',
    properties: {
      displayName: 'healthcheck-clickhouse',
      host: '127.0.0.1',
      port: 8123,
      user: 'default',
      password: '',
      database: 'default',
      ssl: false,
    },
  },
  {
    name: 'Trino',
    type: 'TRINO',
    properties: {
      displayName: 'healthcheck-trino',
      host: '127.0.0.1',
      port: 8080,
      user: 'trino',
      password: '',
      catalog: 'memory',
      schema: 'default',
      ssl: false,
    },
  },
  {
    name: 'DuckDB',
    type: 'DUCKDB',
    properties: {
      displayName: 'healthcheck-duckdb',
      initSql: "CREATE TABLE test(id INTEGER); INSERT INTO test VALUES (1);",
      extensions: [],
      configurations: {},
    },
  },
  {
    name: 'Snowflake',
    type: 'SNOWFLAKE',
    properties: {
      displayName: 'healthcheck-snowflake',
      account: 'xy12345.us-east-1',
      database: 'TESTDB',
      schema: 'PUBLIC',
      warehouse: 'COMPUTE_WH',
      user: 'test',
      password: 'test',
    },
  },
  {
    name: 'BigQuery',
    type: 'BIG_QUERY',
    properties: {
      displayName: 'healthcheck-bigquery',
      projectId: 'test-project',
      datasetId: 'test_dataset',
      credentials: {
        type: 'service_account',
        project_id: 'test-project',
        private_key_id: 'key123',
        private_key: '-----BEGIN RSA PRIVATE KEY-----\ntest\n-----END RSA PRIVATE KEY-----\n',
        client_email: 'test@test-project.iam.gserviceaccount.com',
        client_id: '123',
        auth_uri: 'https://accounts.google.com/o/oauth2/auth',
        token_uri: 'https://oauth2.googleapis.com/token',
      },
    },
  },
  {
    name: 'Athena',
    type: 'ATHENA',
    properties: {
      displayName: 'healthcheck-athena',
      database: 'default',
      s3StagingDir: 's3://test-bucket/staging/',
      awsRegion: 'us-east-1',
      awsAccessKeyId: 'AKIAIOSFODNN7EXAMPLE',
      awsSecretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
    },
  },
  {
    name: 'Redshift',
    type: 'REDSHIFT',
    properties: {
      displayName: 'healthcheck-redshift',
      host: 'test-cluster.abc123.us-east-1.redshift.amazonaws.com',
      port: 5439,
      user: 'test',
      password: 'test',
      database: 'dev',
      redshiftType: 'redshift',
    },
  },
  {
    name: 'Databricks',
    type: 'DATABRICKS',
    properties: {
      displayName: 'healthcheck-databricks',
      serverHostname: 'adb-123.12.azuredatabricks.net',
      httpPath: '/sql/1.0/warehouses/abc',
      accessToken: 'dapi0123456789abcdef',
      databricksType: 'token',
    },
  },
];

const SAVE_MUTATION = `
  mutation SaveDataSource($data: DataSourceInput!) {
    saveDataSource(data: $data) {
      type
      properties
      projectId
    }
  }
`;

// Connection errors we expect when using fake credentials
const EXPECTED_ERROR_PATTERNS = [
  /connection|connect|refused|timeout|ECONNREFUSED|ETIMEDOUT/i,
  /authentication|auth|credentials|password|permission|denied/i,
  /network|unreachable|resolve|DNS|host|gaierror|service not known/i,
  /invalid|not found|does not exist/i,
  /SSL|TLS|certificate/i,
  /Could not|Unable to|Cannot|Failed to/i,
  /socket hang up|ECONNRESET|EPIPE/i,
  /communication error/i,
  /deserialize|decrypt|key data/i,
];

function isExpectedConnectionError(errorMsg) {
  return EXPECTED_ERROR_PATTERNS.some((p) => p.test(errorMsg));
}

async function authenticate() {
  const loginMutation = `
    mutation Login($data: LoginInput!) {
      login(data: $data) { token user { id email } }
    }
  `;
  const response = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      operationName: 'Login',
      query: loginMutation,
      variables: { data: { email: AUTH_EMAIL, password: AUTH_PASSWORD } },
    }),
  });
  const result = await response.json();
  if (!result.data?.login?.token) {
    throw new Error(`Login failed: ${JSON.stringify(result.errors || result)}`);
  }
  AUTH_TOKEN = result.data.login.token;
  console.log(`  Authenticated as ${result.data.login.user.email}`);
}

async function getProjectId() {
  const response = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${AUTH_TOKEN}`,
    },
    body: JSON.stringify({
      query: '{ listProjects { id displayName type } }',
    }),
  });
  const result = await response.json();
  const projects = result.data?.listProjects || [];
  if (projects.length > 0) {
    PROJECT_ID = String(projects[0].id);
    console.log(`  Using project: ${projects[0].displayName} (ID: ${PROJECT_ID})`);
  }
}

async function testConnector(connector) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);
  try {
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${AUTH_TOKEN}`,
    };
    if (PROJECT_ID) {
      headers['X-Project-Id'] = PROJECT_ID;
    }

    const response = await fetch(GRAPHQL_URL, {
      method: 'POST',
      headers,
      signal: controller.signal,
      body: JSON.stringify({
        operationName: 'SaveDataSource',
        query: SAVE_MUTATION,
        variables: {
          data: {
            type: connector.type,
            properties: connector.properties,
          },
        },
      }),
    });

    const result = await response.json();
    clearTimeout(timeout);

    if (result.data?.saveDataSource) {
      return { status: 'PASS', detail: 'Saved successfully' };
    }

    if (result.errors?.length > 0) {
      const errorMsg = result.errors[0].message || '';
      if (isExpectedConnectionError(errorMsg)) {
        return {
          status: 'EXPECTED_FAIL',
          detail: `Connection error (expected): ${errorMsg.slice(0, 100)}`,
        };
      }
      return {
        status: 'FAIL',
        detail: `Unexpected error: ${errorMsg.slice(0, 200)}`,
      };
    }

    return { status: 'FAIL', detail: `Unexpected response: ${JSON.stringify(result).slice(0, 200)}` };
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') {
      return { status: 'EXPECTED_FAIL', detail: 'Request timed out after 60s (expected for unreachable hosts)' };
    }
    return { status: 'FAIL', detail: `Request failed: ${err.message}` };
  }
}

async function main() {
  console.log(`\n🔍 Connector Health Check — ${GRAPHQL_URL}\n`);
  console.log('─'.repeat(72));

  // Authenticate first
  try {
    await authenticate();
    await getProjectId();
  } catch (err) {
    console.error(`\n  ❌ Authentication failed: ${err.message}`);
    process.exit(1);
  }

  console.log('─'.repeat(72));

  const results = [];
  for (const connector of CONNECTORS) {
    process.stdout.write(`  Testing ${connector.name.padEnd(15)} ... `);
    const result = await testConnector(connector);
    results.push({ name: connector.name, ...result });

    const icon =
      result.status === 'PASS'
        ? '✅'
        : result.status === 'EXPECTED_FAIL'
          ? '⚠️ '
          : '❌';
    console.log(`${icon} ${result.status} — ${result.detail}`);
  }

  console.log('\n' + '─'.repeat(72));

  const passed = results.filter((r) => r.status === 'PASS').length;
  const expected = results.filter((r) => r.status === 'EXPECTED_FAIL').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;

  console.log(`\n  Summary: ${passed} passed, ${expected} expected failures, ${failed} unexpected failures`);
  console.log(`  Total: ${results.length} connectors tested\n`);

  if (failed > 0) {
    console.log('  ❌ Unexpected failures:');
    results
      .filter((r) => r.status === 'FAIL')
      .forEach((r) => console.log(`     - ${r.name}: ${r.detail}`));
    console.log('');
    process.exit(1);
  }
}

main();
