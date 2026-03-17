---
sidebar_position: 2
title: Connecting Data Sources
---

# Connecting Data Sources

Legible supports 22+ data source connectors. This guide walks you through connecting common databases.

## Supported Data Sources

| Data Source | Status |
|------------|--------|
| PostgreSQL | ✅ Fully supported |
| MySQL | ✅ Fully supported |
| DuckDB | ✅ Fully supported |
| BigQuery | ✅ Fully supported |
| Snowflake | ✅ Fully supported |
| ClickHouse | ✅ Fully supported |
| SQL Server (MSSQL) | ✅ Fully supported |
| Trino | ✅ Fully supported |
| Oracle | ✅ Fully supported |
| Athena | ✅ Fully supported |
| Databricks | ✅ Fully supported |
| Apache Spark | ✅ Fully supported |
| Apache Doris | ✅ Fully supported |
| Redshift | ✅ Fully supported |
| Local Files (CSV, Parquet) | ✅ Fully supported |
| S3 Files | ✅ Fully supported |
| GCS Files | ✅ Fully supported |
| MinIO Files | ✅ Fully supported |

## Connecting via the UI

1. Navigate to your project settings
2. Go to **Data Source** configuration
3. Select your database type
4. Enter connection credentials:
   - Host / endpoint
   - Port
   - Database name
   - Username / password (or service account for cloud databases)
5. Click **Test Connection** to verify
6. Save the configuration

## Connection Info Format

Each data source requires specific connection parameters. Here's the format for common databases:

### PostgreSQL

```json
{
  "host": "your-host.example.com",
  "port": "5432",
  "user": "your_user",
  "password": "your_password",
  "database": "your_database"
}
```

### BigQuery

```json
{
  "project_id": "your-gcp-project",
  "dataset_id": "your_dataset",
  "credentials": "base64-encoded-service-account-json"
}
```

### DuckDB

```json
{
  "extensions": ["httpfs", "parquet"],
  "configurations": {
    "s3_region": "us-east-1"
  }
}
```

### Snowflake

```json
{
  "account": "your-account",
  "user": "your_user",
  "password": "your_password",
  "database": "your_database",
  "schema": "public",
  "warehouse": "COMPUTE_WH"
}
```

## Docker Networking

When running Legible in Docker and connecting to a database on the same host, use `host.docker.internal` instead of `localhost`:

```json
{
  "host": "host.docker.internal",
  "port": "5432",
  "user": "postgres",
  "password": "password",
  "database": "mydb"
}
```

## MDL Data Source Field

Your MDL manifest must include a `dataSource` field matching your connection type:

```json
{
  "catalog": "my_catalog",
  "schema": "my_schema",
  "dataSource": "postgres",
  "models": [...]
}
```

Valid `dataSource` values: `postgres`, `mysql`, `bigquery`, `snowflake`, `duckdb`, `clickhouse`, `mssql`, `trino`, `oracle`, `athena`, `databricks`, `spark`, `doris`, `redshift`.

## Connector-Specific Notes

### MySQL

Uses port `3306` by default. Ensure the user has `SELECT` privileges on the target database.

### Oracle

Requires the `SID` or `Service Name` for the connection. Use the TNS format if your DBA provides a TNS entry.

### SQL Server

Uses port `1433` by default. Enable TCP/IP in SQL Server Configuration Manager if connecting remotely.

### ClickHouse

Uses the HTTP interface on port `8123` by default. Ensure the user has read access to the target database.

### Trino

Specify the `catalog` and `schema` in the connection settings. Authentication depends on your Trino cluster configuration.

### Athena

Requires AWS credentials and an S3 output location for query results.

### Redshift

Connection is similar to PostgreSQL. Use port `5439` (default Redshift port) and your cluster endpoint.

### Databricks

Requires a workspace URL, HTTP path, and personal access token.

## Troubleshooting

If you're having trouble connecting:

1. **Check network access** — ensure the database is reachable from the Legible server (or Docker container)
2. **Verify credentials** — double-check username, password, and database name
3. **Check firewall rules** — ensure the database port is open
4. **Docker networking** — use `host.docker.internal` for databases on the same machine as Docker
5. **SSL/TLS** — some databases require SSL connections; check your data source's SSL settings
