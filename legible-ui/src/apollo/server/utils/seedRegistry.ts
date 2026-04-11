import {
  IBlueprintRegistryService,
  CreateRegistryEntryInput,
} from '@server/services/blueprintRegistryService';
import { getLogger } from '@server/utils';

const logger = getLogger('SeedRegistry');

/**
 * Built-in blueprint templates to seed into the registry on startup.
 * Each entry is idempotent — if a name already exists, it is skipped.
 */
const BUILTIN_ENTRIES: CreateRegistryEntryInput[] = [
  {
    name: 'legible-default',
    version: '0.3.0',
    description:
      'Universal agent blueprint with broad data source support. Provides a generic sandbox with MCP connectivity and configurable inference profiles.',
    supportedConnectors: [
      'POSTGRES', 'BIG_QUERY', 'SNOWFLAKE', 'MYSQL', 'ORACLE', 'MSSQL',
      'CLICK_HOUSE', 'TRINO', 'DUCKDB', 'ATHENA', 'REDSHIFT', 'DATABRICKS', 'DB2I',
    ],
    category: 'general',
    tags: ['universal', 'default'],
    sandboxImage: 'legible-sandbox:latest',
    defaultAgentType: 'claude',
    blueprintYaml: `version: "0.3.0"
description: Universal default agent blueprint.
components:
  sandbox:
    image: "legible-sandbox:latest"
    name: "legible-agent"
  inference:
    profiles:
      anthropic:
        provider_type: anthropic
        model: claude-sonnet-4-20250514
  mcp:
    servers:
      legible:
        transport: streamable-http
        url: "http://host.docker.internal:9000/mcp"
agent:
  type: claude
  allowed_types: [claude, codex, opencode, copilot]
`,
    isOfficial: true,
  },
  {
    name: 'legible-analyst',
    version: '0.3.0',
    description:
      'Analysis-focused agent with extended tooling for data exploration, charting, and reporting.',
    supportedConnectors: [
      'POSTGRES', 'BIG_QUERY', 'SNOWFLAKE', 'MYSQL', 'ORACLE', 'MSSQL',
      'CLICK_HOUSE', 'TRINO', 'DUCKDB', 'ATHENA', 'REDSHIFT', 'DATABRICKS', 'DB2I',
    ],
    category: 'analysis',
    tags: ['analyst', 'charting', 'reporting'],
    sandboxImage: 'legible-sandbox:latest',
    defaultAgentType: 'claude',
    blueprintYaml: `version: "0.3.0"
description: Analysis agent with data exploration and charting.
components:
  sandbox:
    image: "legible-sandbox:latest"
    name: "legible-analyst"
  inference:
    profiles:
      anthropic:
        provider_type: anthropic
        model: claude-sonnet-4-20250514
  mcp:
    servers:
      legible:
        transport: streamable-http
        url: "http://host.docker.internal:9000/mcp"
agent:
  type: claude
  allowed_types: [claude, codex, opencode, copilot]
`,
    isOfficial: true,
  },
  {
    name: 'legible-postgres',
    version: '0.3.0',
    description:
      'PostgreSQL-optimized agent with psql/pgcli CLI tools and PostgreSQL-specific network policies.',
    supportedConnectors: ['POSTGRES'],
    category: 'connector',
    tags: ['postgresql', 'psql', 'relational'],
    sandboxImage: 'legible-sandbox:latest',
    defaultAgentType: 'claude',
    blueprintYaml: `version: "0.3.0"
description: PostgreSQL-optimized agent blueprint.
components:
  sandbox:
    image: "legible-sandbox:latest"
    name: "legible-postgres-agent"
  tools:
    install: [postgresql-client, pgcli]
  inference:
    profiles:
      anthropic:
        provider_type: anthropic
        model: claude-sonnet-4-20250514
  mcp:
    servers:
      legible:
        transport: streamable-http
        url: "http://host.docker.internal:9000/mcp"
agent:
  type: claude
  allowed_types: [claude, codex, opencode, copilot]
`,
    isOfficial: true,
  },
  {
    name: 'legible-bigquery',
    version: '0.3.0',
    description:
      'BigQuery-optimized agent with bq CLI and Google Cloud network policies.',
    supportedConnectors: ['BIG_QUERY'],
    category: 'connector',
    tags: ['bigquery', 'google-cloud', 'warehouse'],
    sandboxImage: 'legible-sandbox:latest',
    defaultAgentType: 'claude',
    blueprintYaml: `version: "0.3.0"
description: BigQuery-optimized agent blueprint.
components:
  sandbox:
    image: "legible-sandbox:latest"
    name: "legible-bigquery-agent"
  tools:
    install: [google-cloud-sdk]
  inference:
    profiles:
      anthropic:
        provider_type: anthropic
        model: claude-sonnet-4-20250514
  mcp:
    servers:
      legible:
        transport: streamable-http
        url: "http://host.docker.internal:9000/mcp"
agent:
  type: claude
  allowed_types: [claude, codex, opencode, copilot]
`,
    isOfficial: true,
  },
  {
    name: 'legible-snowflake',
    version: '0.3.0',
    description:
      'Snowflake-optimized agent with SnowSQL CLI and Snowflake-specific network policies.',
    supportedConnectors: ['SNOWFLAKE'],
    category: 'connector',
    tags: ['snowflake', 'warehouse'],
    sandboxImage: 'legible-sandbox:latest',
    defaultAgentType: 'claude',
    blueprintYaml: `version: "0.3.0"
description: Snowflake-optimized agent blueprint.
components:
  sandbox:
    image: "legible-sandbox:latest"
    name: "legible-snowflake-agent"
  tools:
    install: [snowsql]
  inference:
    profiles:
      anthropic:
        provider_type: anthropic
        model: claude-sonnet-4-20250514
  mcp:
    servers:
      legible:
        transport: streamable-http
        url: "http://host.docker.internal:9000/mcp"
agent:
  type: claude
  allowed_types: [claude, codex, opencode, copilot]
`,
    isOfficial: true,
  },
  {
    name: 'legible-mysql',
    version: '0.3.0',
    description:
      'MySQL-optimized agent with mysql-client/mycli tools and MySQL network policies.',
    supportedConnectors: ['MYSQL'],
    category: 'connector',
    tags: ['mysql', 'relational'],
    sandboxImage: 'legible-sandbox:latest',
    defaultAgentType: 'claude',
    blueprintYaml: `version: "0.3.0"
description: MySQL-optimized agent blueprint.
components:
  sandbox:
    image: "legible-sandbox:latest"
    name: "legible-mysql-agent"
  tools:
    install: [mysql-client, mycli]
  inference:
    profiles:
      anthropic:
        provider_type: anthropic
        model: claude-sonnet-4-20250514
  mcp:
    servers:
      legible:
        transport: streamable-http
        url: "http://host.docker.internal:9000/mcp"
agent:
  type: claude
  allowed_types: [claude, codex, opencode, copilot]
`,
    isOfficial: true,
  },
  {
    name: 'legible-clickhouse',
    version: '0.3.0',
    description:
      'ClickHouse-optimized agent with clickhouse-client and ClickHouse network policies.',
    supportedConnectors: ['CLICK_HOUSE'],
    category: 'connector',
    tags: ['clickhouse', 'columnar', 'analytics'],
    sandboxImage: 'legible-sandbox:latest',
    defaultAgentType: 'claude',
    blueprintYaml: `version: "0.3.0"
description: ClickHouse-optimized agent blueprint.
components:
  sandbox:
    image: "legible-sandbox:latest"
    name: "legible-clickhouse-agent"
  tools:
    install: [clickhouse-client]
  inference:
    profiles:
      anthropic:
        provider_type: anthropic
        model: claude-sonnet-4-20250514
  mcp:
    servers:
      legible:
        transport: streamable-http
        url: "http://host.docker.internal:9000/mcp"
agent:
  type: claude
  allowed_types: [claude, codex, opencode, copilot]
`,
    isOfficial: true,
  },
  {
    name: 'legible-duckdb',
    version: '0.3.0',
    description:
      'DuckDB-optimized agent with embedded DuckDB CLI. Minimal network policies for local-first analytics.',
    supportedConnectors: ['DUCKDB'],
    category: 'connector',
    tags: ['duckdb', 'embedded', 'analytics'],
    sandboxImage: 'legible-sandbox:latest',
    defaultAgentType: 'claude',
    blueprintYaml: `version: "0.3.0"
description: DuckDB-optimized agent blueprint.
components:
  sandbox:
    image: "legible-sandbox:latest"
    name: "legible-duckdb-agent"
  tools:
    install: [duckdb]
  inference:
    profiles:
      anthropic:
        provider_type: anthropic
        model: claude-sonnet-4-20250514
  mcp:
    servers:
      legible:
        transport: streamable-http
        url: "http://host.docker.internal:9000/mcp"
agent:
  type: claude
  allowed_types: [claude, codex, opencode, copilot]
`,
    isOfficial: true,
  },
  {
    name: 'legible-mssql',
    version: '0.3.0',
    description:
      'SQL Server agent with mssql-tools18 and TDS/Azure SQL network policies.',
    supportedConnectors: ['MSSQL'],
    category: 'connector',
    tags: ['mssql', 'sql-server', 'azure-sql', 'relational'],
    sandboxImage: 'legible-sandbox:latest',
    defaultAgentType: 'claude',
    blueprintYaml: `version: "0.3.0"
description: SQL Server agent blueprint.
components:
  sandbox:
    image: "legible-sandbox:latest"
    name: "legible-mssql-agent"
  tools:
    install: [mssql-tools18]
  inference:
    profiles:
      anthropic:
        provider_type: anthropic
        model: claude-sonnet-4-20250514
  mcp:
    servers:
      legible:
        transport: streamable-http
        url: "http://host.docker.internal:9000/mcp"
agent:
  type: claude
  allowed_types: [claude, codex, opencode, copilot]
`,
    isOfficial: true,
  },
  {
    name: 'legible-oracle',
    version: '0.3.0',
    description:
      'Oracle Database agent with Instant Client sqlplus and Oracle Net network policies.',
    supportedConnectors: ['ORACLE'],
    category: 'connector',
    tags: ['oracle', 'relational'],
    sandboxImage: 'legible-sandbox:latest',
    defaultAgentType: 'claude',
    blueprintYaml: `version: "0.3.0"
description: Oracle Database agent blueprint.
components:
  sandbox:
    image: "legible-sandbox:latest"
    name: "legible-oracle-agent"
  tools:
    install: [oracle-instantclient-sqlplus]
  inference:
    profiles:
      anthropic:
        provider_type: anthropic
        model: claude-sonnet-4-20250514
  mcp:
    servers:
      legible:
        transport: streamable-http
        url: "http://host.docker.internal:9000/mcp"
agent:
  type: claude
  allowed_types: [claude, codex, opencode, copilot]
`,
    isOfficial: true,
  },
  {
    name: 'legible-trino',
    version: '0.3.0',
    description:
      'Trino agent with trino-cli and HTTP-based Trino network policies.',
    supportedConnectors: ['TRINO'],
    category: 'connector',
    tags: ['trino', 'distributed-sql'],
    sandboxImage: 'legible-sandbox:latest',
    defaultAgentType: 'claude',
    blueprintYaml: `version: "0.3.0"
description: Trino agent blueprint.
components:
  sandbox:
    image: "legible-sandbox:latest"
    name: "legible-trino-agent"
  tools:
    install: [trino-cli]
  inference:
    profiles:
      anthropic:
        provider_type: anthropic
        model: claude-sonnet-4-20250514
  mcp:
    servers:
      legible:
        transport: streamable-http
        url: "http://host.docker.internal:9000/mcp"
agent:
  type: claude
  allowed_types: [claude, codex, opencode, copilot]
`,
    isOfficial: true,
  },
  {
    name: 'legible-redshift',
    version: '0.3.0',
    description:
      'Amazon Redshift agent with psql and AWS CLI. Network policies for Redshift clusters and STS auth.',
    supportedConnectors: ['REDSHIFT'],
    category: 'connector',
    tags: ['redshift', 'aws', 'warehouse'],
    sandboxImage: 'legible-sandbox:latest',
    defaultAgentType: 'claude',
    blueprintYaml: `version: "0.3.0"
description: Amazon Redshift agent blueprint.
components:
  sandbox:
    image: "legible-sandbox:latest"
    name: "legible-redshift-agent"
  tools:
    install: [postgresql-client, awscli]
  inference:
    profiles:
      anthropic:
        provider_type: anthropic
        model: claude-sonnet-4-20250514
  mcp:
    servers:
      legible:
        transport: streamable-http
        url: "http://host.docker.internal:9000/mcp"
agent:
  type: claude
  allowed_types: [claude, codex, opencode, copilot]
`,
    isOfficial: true,
  },
  {
    name: 'legible-databricks',
    version: '0.3.0',
    description:
      'Databricks agent with Databricks CLI. Network policies for workspace API and SQL warehouse.',
    supportedConnectors: ['DATABRICKS'],
    category: 'connector',
    tags: ['databricks', 'lakehouse', 'spark'],
    sandboxImage: 'legible-sandbox:latest',
    defaultAgentType: 'claude',
    blueprintYaml: `version: "0.3.0"
description: Databricks agent blueprint.
components:
  sandbox:
    image: "legible-sandbox:latest"
    name: "legible-databricks-agent"
  tools:
    install: [databricks-cli]
  inference:
    profiles:
      anthropic:
        provider_type: anthropic
        model: claude-sonnet-4-20250514
  mcp:
    servers:
      legible:
        transport: streamable-http
        url: "http://host.docker.internal:9000/mcp"
agent:
  type: claude
  allowed_types: [claude, codex, opencode, copilot]
`,
    isOfficial: true,
  },
  {
    name: 'legible-athena',
    version: '0.3.0',
    description:
      'Amazon Athena agent with AWS CLI. Network policies for Athena API, S3 results, and STS auth.',
    supportedConnectors: ['ATHENA'],
    category: 'connector',
    tags: ['athena', 'aws', 'serverless'],
    sandboxImage: 'legible-sandbox:latest',
    defaultAgentType: 'claude',
    blueprintYaml: `version: "0.3.0"
description: Amazon Athena agent blueprint.
components:
  sandbox:
    image: "legible-sandbox:latest"
    name: "legible-athena-agent"
  tools:
    install: [awscli]
  inference:
    profiles:
      anthropic:
        provider_type: anthropic
        model: claude-sonnet-4-20250514
  mcp:
    servers:
      legible:
        transport: streamable-http
        url: "http://host.docker.internal:9000/mcp"
agent:
  type: claude
  allowed_types: [claude, codex, opencode, copilot]
`,
    isOfficial: true,
  },
  {
    name: 'legible-db2i',
    version: '0.3.0',
    description:
      'IBM DB2 for i agent with mcp-server-db2i. Read-only SQL queries, schema inspection, and table metadata via JT400 JDBC.',
    supportedConnectors: ['DB2I'],
    category: 'connector',
    tags: ['db2i', 'ibm', 'as400', 'iseries'],
    sandboxImage: 'legible-sandbox:latest',
    defaultAgentType: 'claude',
    blueprintYaml: `version: "0.3.0"
description: IBM DB2 for i agent blueprint.
components:
  sandbox:
    image: "legible-sandbox:latest"
    name: "legible-db2i-agent"
  inference:
    profiles:
      anthropic:
        provider_type: anthropic
        model: claude-sonnet-4-20250514
  mcp:
    servers:
      legible:
        transport: streamable-http
        url: "http://host.docker.internal:9000/mcp"
      db2i:
        transport: streamable-http
        url: "http://host.docker.internal:9002/mcp"
agent:
  type: claude
  allowed_types: [claude, codex, opencode, copilot]
`,
    isOfficial: true,
  },
];

/**
 * Seed built-in blueprint registry entries. Idempotent — skips entries
 * that already exist (matched by name).
 */
export async function seedBuiltinRegistryEntries(
  registryService: IBlueprintRegistryService,
): Promise<void> {
  let seeded = 0;
  let skipped = 0;

  for (const entry of BUILTIN_ENTRIES) {
    try {
      await registryService.getRegistryEntryByName(entry.name);
      skipped++;
    } catch {
      // Entry doesn't exist — create it
      try {
        await registryService.createRegistryEntry(entry);
        seeded++;
      } catch (err: any) {
        logger.warn(`Failed to seed registry entry "${entry.name}": ${err.message}`);
      }
    }
  }

  if (seeded > 0) {
    logger.info(`Seeded ${seeded} built-in registry entries (${skipped} already existed)`);
  } else {
    logger.debug(`All ${skipped} built-in registry entries already exist`);
  }
}
