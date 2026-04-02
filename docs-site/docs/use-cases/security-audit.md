---
sidebar_position: 4
title: "Security Audit Agent"
---

# Security Audit Agent

An agent that scans your database configuration for security misconfigurations, stale credentials, overly permissive grants, and known vulnerabilities — producing an actionable audit report.

## The Problem

Database security audits are typically done quarterly at best. Between audits, roles accumulate excessive privileges, default passwords linger, SSL gets disabled for "debugging," and public schemas gain unintended grants. These drift silently until a breach.

## How It Works

1. The agent queries system catalogs and configuration views through the Legible MCP server
2. It checks against a comprehensive security checklist: authentication, authorization, encryption, network exposure, and logging
3. It cross-references installed extensions and versions against known CVE databases
4. It generates a severity-ranked report with specific remediation commands

## Blueprint

```yaml
agent:
  type: claude
  description: Database security auditing and compliance checking

components:
  sandbox:
    image: ghcr.io/nvidia/openshell/sandbox-base:latest
    resources:
      cpus: "2.0"
      memory: "4g"
  inference:
    profiles:
      anthropic:
        model: claude-sonnet-4-20250514
        provider_type: anthropic

policies:
  network: policy.yaml
```

**Network policy** — deliberately restrictive (read-only catalog access, no internet):
```yaml
version: "1.0"
rules:
  - name: legible-mcp
    protocol: tcp
    port: 443
    destination: "your-legible-instance.example.com"
  - name: db-catalog-readonly
    protocol: tcp
    port: 5432
    destination: "your-db-host.example.com"
```

## Usage

```bash
legible agent create security-auditor --blueprint security-audit --profile anthropic
legible agent connect security-auditor

# Inside the sandbox:
# > Run a full security audit of the production database
# > Check for roles with SUPERUSER that shouldn't have it
# > List all tables accessible to the public role
# > Show me users who haven't changed passwords in 90 days
# > Generate remediation scripts for all HIGH severity findings
```

## Audit Checklist

| Category | Checks |
|----------|--------|
| **Authentication** | Password policy compliance, default credentials, authentication method (`md5` vs `scram-sha-256`) |
| **Authorization** | Excessive GRANT chains, `SUPERUSER` roles, public schema exposure, `SECURITY DEFINER` functions |
| **Encryption** | SSL/TLS status, `ssl_ciphers` strength, at-rest encryption config |
| **Network** | `pg_hba.conf` rules, bind address, exposed ports, connection limits |
| **Logging** | `log_connections`, `log_disconnections`, `log_statement` settings, audit trail coverage |
| **Extensions** | Installed extension versions vs. known CVEs, unnecessary extensions |
| **Configuration** | `shared_preload_libraries`, `row_security`, `password_encryption` |

## Output

The agent produces a structured report:

```
SECURITY AUDIT REPORT — production-db — 2026-04-02
═══════════════════════════════════════════════════

CRITICAL (2)
  • Role "app_admin" has SUPERUSER privilege — should use specific GRANTs
  • SSL disabled on primary connection (pg_hba.conf line 12)

HIGH (5)
  • 3 roles with password_valid_until in the past
  • Public schema has INSERT on "audit_logs" table
  • Extension pgcrypto v1.3 has known CVE-2025-XXXX
  ...

MEDIUM (8)
  ...

Remediation scripts: ./remediation/
```

## Supported Databases

| Database | Catalog Source |
|----------|---------------|
| PostgreSQL | `pg_roles`, `pg_hba_file_rules`, `pg_stat_ssl`, `information_schema` |
| MySQL | `mysql.user`, `performance_schema`, `INFORMATION_SCHEMA.USER_PRIVILEGES` |
| SQL Server | `sys.server_principals`, `sys.database_permissions`, DMVs |
| Oracle | `DBA_USERS`, `DBA_ROLE_PRIVS`, `DBA_SYS_PRIVS`, audit trail views |
