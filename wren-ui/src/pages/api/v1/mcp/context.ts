import { NextApiRequest, NextApiResponse } from 'next';
import { components } from '@/common';
import { getLogger } from '@server/utils';
import { toIbisConnectionInfo } from '@server/dataSource';
import { DataSourceName } from '@server/types';

const logger = getLogger('API_MCP_CONTEXT');

const {
  projectApiKeyService,
  projectService,
  mdlService,
  deployService,
  queryMeteringService,
} = components;

/**
 * POST /api/v1/mcp/context
 *
 * Called by the MCP server to validate a project API key and retrieve
 * the project's MDL manifest + connection info for per-request routing.
 *
 * Headers:
 *   X-Service-Token: <INTERNAL_SERVICE_TOKEN>
 *
 * Body:
 *   { "apiKey": "psk-..." }
 *
 * Returns:
 *   {
 *     "projectId": 13,
 *     "organizationId": 1,
 *     "dataSource": "postgres",
 *     "manifestStr": "<base64 MDL>",
 *     "connectionInfo": { ... ibis-format ... },
 *     "queryAllowance": { "allowed": true, ... }
 *   }
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  // Only POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify internal service token
  const serviceToken = req.headers['x-service-token'] as string;
  const expectedToken = process.env.INTERNAL_SERVICE_TOKEN || '';
  if (!expectedToken || serviceToken !== expectedToken) {
    return res.status(403).json({ error: 'Invalid service token' });
  }

  const { apiKey } = req.body || {};
  if (!apiKey || typeof apiKey !== 'string') {
    return res.status(400).json({ error: 'apiKey is required' });
  }

  if (!apiKey.startsWith('psk-')) {
    return res.status(400).json({ error: 'Only project API keys (psk-) are supported for MCP' });
  }

  try {
    // Validate the API key
    const keyResult = await projectApiKeyService.validateKey(apiKey);
    if (!keyResult) {
      return res.status(401).json({ error: 'Invalid or expired API key' });
    }

    const { projectId, organizationId, keyId } = keyResult;

    // Check query allowance
    const allowance = await queryMeteringService.checkQueryAllowance(organizationId);

    // Get project info (includes connection info + data source type)
    const project = await projectService.getCurrentProject(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const dataSourceType = project.type as DataSourceName;

    // DuckDB uses the legacy engine, not ibis-server
    if (dataSourceType === DataSourceName.DUCKDB) {
      return res.status(400).json({
        error: 'DuckDB projects are not supported via MCP (uses legacy engine)',
      });
    }

    // Get the latest deployed MDL
    const deployment = await deployService.getLastDeployment(projectId);
    if (!deployment) {
      return res.status(400).json({
        error: 'No deployment found. Deploy the project first via the UI.',
      });
    }

    // Build base64-encoded manifest
    const manifestStr = Buffer.from(
      JSON.stringify(deployment.manifest),
    ).toString('base64');

    // Get ibis-format connection info (decrypts sensitive fields)
    let connectionInfo: Record<string, unknown> = {};
    try {
      connectionInfo = toIbisConnectionInfo(
        dataSourceType,
        project.connectionInfo,
      );
    } catch (err) {
      logger.error(`Failed to build connection info: ${(err as Error).message}`);
      return res.status(400).json({
        error: `Cannot build connection info for ${dataSourceType}`,
      });
    }

    // Map DataSourceName enum to ibis URL segment
    const dataSourceMap: Record<string, string> = {
      POSTGRES: 'postgres',
      BIG_QUERY: 'bigquery',
      SNOWFLAKE: 'snowflake',
      MYSQL: 'mysql',
      ORACLE: 'oracle',
      MSSQL: 'mssql',
      CLICK_HOUSE: 'clickhouse',
      TRINO: 'trino',
      ATHENA: 'athena',
      REDSHIFT: 'redshift',
      DATABRICKS: 'databricks',
    };

    return res.status(200).json({
      projectId,
      organizationId,
      keyId,
      dataSource: dataSourceMap[dataSourceType] || dataSourceType.toLowerCase(),
      manifestStr,
      connectionInfo,
      queryAllowance: allowance,
    });
  } catch (err) {
    logger.error(`MCP context error: ${(err as Error).message}`);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
