/**
 * Self-hosted documentation links.
 * Base URL is configurable via NEXT_PUBLIC_DOCS_URL env var.
 */
const DOCS_BASE =
  process.env.NEXT_PUBLIC_DOCS_URL || 'https://docs.kubeworkz.io';

function doc(path: string) {
  return `${DOCS_BASE}${path}`;
}

export const DOC_LINKS = {
  // Getting started
  quickstart: doc('/getting-started/quickstart'),

  // Data sources
  connectOverview: doc('/guides/connecting-data-sources'),
  connectBigQuery: doc('/guides/connecting-data-sources#bigquery'),
  connectDuckDB: doc('/guides/connecting-data-sources#duckdb'),
  connectPostgres: doc('/guides/connecting-data-sources#postgresql'),
  connectMySQL: doc('/guides/connecting-data-sources#mysql'),
  connectOracle: doc('/guides/connecting-data-sources#oracle'),
  connectSQLServer: doc('/guides/connecting-data-sources#sql-server'),
  connectClickHouse: doc('/guides/connecting-data-sources#clickhouse'),
  connectTrino: doc('/guides/connecting-data-sources#trino'),
  connectSnowflake: doc('/guides/connecting-data-sources#snowflake'),
  connectAthena: doc('/guides/connecting-data-sources#athena'),
  connectRedshift: doc('/guides/connecting-data-sources#redshift'),
  connectDatabricks: doc('/guides/connecting-data-sources#databricks'),
  connectPostgresTroubleshoot: doc(
    '/guides/connecting-data-sources#troubleshooting',
  ),

  // Sample datasets
  sampleEcommerce: doc('/getting-started/quickstart#sample-datasets'),
  sampleHR: doc('/getting-started/quickstart#sample-datasets'),
  sampleCardTransaction: doc('/getting-started/quickstart#sample-datasets'),

  // Modeling
  modelingOverview: doc('/guides/modeling'),
  modelingModels: doc('/guides/modeling#models'),
  modelingViews: doc('/guides/modeling#views'),
  modelingRelationships: doc('/guides/modeling#relationships'),
  modelingPrimaryKey: doc('/guides/modeling#primary-key'),

  // SQL
  wrenSQL: doc('/guides/sql-syntax'),
  viewFullSQL: doc('/guides/sql-syntax#viewing-full-sql'),

  // Dashboard
  dashboard: doc('/guides/dashboard'),

  // Knowledge
  questionSQLPairs: doc('/guides/knowledge'),
  questionSQLPairsSave: doc('/guides/knowledge#saving-question-sql-pairs'),
  instructions: doc('/guides/knowledge#instructions'),

  // API
  apiHistory: doc('/guides/api-access'),
  apiReference: doc('/api-reference/overview'),

  // Security
  rlsPolicy: doc('/guides/data-security'),

  // MCP
  mcpIntegration: doc('/guides/mcp-integration'),

  // CLI
  cli: doc('/guides/cli'),
} as const;
