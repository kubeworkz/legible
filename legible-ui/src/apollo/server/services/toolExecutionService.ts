/**
 * Tool Execution Service — invokes registered tools for Agent Builder workflow nodes.
 *
 * Supports three tool sources:
 *   - custom_api: HTTP requests to external APIs
 *   - builtin:    SQL queries via Wren Engine / Ibis
 *   - mcp:        MCP server tool invocation
 */
import axios from 'axios';
import { getLogger } from '@server/utils';
import { IToolDefinitionService } from '@server/services/toolDefinitionService';
import { IQueryService } from '@server/services/queryService';
import { IDeployService } from '@server/services/deployService';
import { IProjectRepository } from '@server/repositories/projectRepository';
import { ToolDefinition } from '@server/repositories/toolDefinitionRepository';

const logger = getLogger('ToolExecutionService');

// ─── Types ─────────────────────────────────────────────

export interface ToolExecutionResult {
  toolId: number;
  toolName: string;
  source: string;
  parameters: Record<string, any>;
  response: any;
  durationMs: number;
  statusCode?: number;
}

export interface IToolExecutionService {
  executeTool(
    projectId: number,
    toolDefinitionId: number,
    parameters: Record<string, any>,
  ): Promise<ToolExecutionResult>;
}

// ─── Implementation ────────────────────────────────────

export class ToolExecutionService implements IToolExecutionService {
  private readonly toolDefinitionService: IToolDefinitionService;
  private readonly queryService: IQueryService;
  private readonly deployService: IDeployService;
  private readonly projectRepository: IProjectRepository;

  constructor({
    toolDefinitionService,
    queryService,
    deployService,
    projectRepository,
  }: {
    toolDefinitionService: IToolDefinitionService;
    queryService: IQueryService;
    deployService: IDeployService;
    projectRepository: IProjectRepository;
  }) {
    this.toolDefinitionService = toolDefinitionService;
    this.queryService = queryService;
    this.deployService = deployService;
    this.projectRepository = projectRepository;
  }

  public async executeTool(
    projectId: number,
    toolDefinitionId: number,
    parameters: Record<string, any>,
  ): Promise<ToolExecutionResult> {
    const tool = await this.toolDefinitionService.getTool(toolDefinitionId);
    if (!tool) {
      throw new Error(`Tool definition not found: ${toolDefinitionId}`);
    }
    if (!tool.enabled) {
      throw new Error(`Tool "${tool.name}" is disabled`);
    }

    const startTime = Date.now();
    let response: any;

    logger.info(
      `Executing tool: ${tool.name} (source=${tool.source}, id=${tool.id})`,
    );

    switch (tool.source) {
      case 'custom_api':
        response = await this.executeCustomApi(tool, parameters);
        break;
      case 'builtin':
        response = await this.executeBuiltin(tool, projectId, parameters);
        break;
      case 'mcp':
        response = await this.executeMcp(tool, parameters);
        break;
      default:
        throw new Error(`Unknown tool source: ${tool.source}`);
    }

    const durationMs = Date.now() - startTime;
    logger.info(`Tool ${tool.name} completed in ${durationMs}ms`);

    return {
      toolId: tool.id,
      toolName: tool.name,
      source: tool.source,
      parameters,
      response,
      durationMs,
    };
  }

  // ─── Custom API ──────────────────────────────────────

  private async executeCustomApi(
    tool: ToolDefinition,
    parameters: Record<string, any>,
  ): Promise<any> {
    if (!tool.endpoint) {
      throw new Error(`Tool "${tool.name}" has no endpoint configured`);
    }

    const method = (tool.method || 'POST').toUpperCase();

    // Build URL — substitute path parameters like {id} from params
    let url = tool.endpoint;
    const bodyParams = { ...parameters };
    const pathParamPattern = /\{(\w+)\}/g;
    let match: RegExpExecArray | null;
    while ((match = pathParamPattern.exec(tool.endpoint)) !== null) {
      const paramName = match[1];
      if (paramName in bodyParams) {
        url = url.replace(match[0], encodeURIComponent(String(bodyParams[paramName])));
        delete bodyParams[paramName];
      }
    }

    // Build headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(tool.headers || {}),
    };

    // Apply auth config
    if (tool.authConfig) {
      this.applyAuth(headers, tool.authConfig);
    }

    // Build request
    const config: any = {
      method,
      url,
      headers,
      timeout: 60000, // 60 second timeout
    };

    // GET/DELETE use query params; POST/PUT/PATCH use body
    if (['GET', 'DELETE', 'HEAD'].includes(method)) {
      config.params = bodyParams;
    } else {
      config.data = bodyParams;
    }

    try {
      const response = await axios(config);
      return {
        statusCode: response.status,
        headers: this.sanitizeResponseHeaders(response.headers),
        data: response.data,
      };
    } catch (err: any) {
      if (err.response) {
        // Server responded with an error status
        return {
          statusCode: err.response.status,
          headers: this.sanitizeResponseHeaders(err.response.headers),
          data: err.response.data,
          error: `HTTP ${err.response.status}: ${err.response.statusText}`,
        };
      }
      throw new Error(`HTTP request failed: ${err.message}`);
    }
  }

  // ─── Builtin (SQL Query via Wren Engine) ─────────────

  private async executeBuiltin(
    tool: ToolDefinition,
    projectId: number,
    parameters: Record<string, any>,
  ): Promise<any> {
    const sql = parameters.sql;
    if (!sql || typeof sql !== 'string') {
      throw new Error(
        `Builtin tool "${tool.name}" requires a "sql" parameter`,
      );
    }

    // Load project and deployment manifest
    const project = await this.projectRepository.findOneBy({ id: projectId });
    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }

    const deployment = await this.deployService.getLastDeployment(projectId);
    if (!deployment || !deployment.manifest) {
      throw new Error('No active deployment found. Deploy your model first.');
    }

    const limit = parameters.limit || 500;

    try {
      const result = await this.queryService.preview(sql, {
        project,
        manifest: deployment.manifest as any,
        limit,
        modelingOnly: false,
      });

      // queryService.preview returns IbisQueryResponse or PreviewDataResponse
      if (typeof result === 'boolean') {
        return { success: result };
      }

      return {
        columns: (result as any).columns || [],
        data: (result as any).data || [],
        dtypes: (result as any).dtypes || {},
        rowCount: (result as any).data?.length || 0,
      };
    } catch (err: any) {
      throw new Error(`SQL execution failed: ${err.message}`);
    }
  }

  // ─── MCP Tool Invocation ─────────────────────────────

  private async executeMcp(
    tool: ToolDefinition,
    parameters: Record<string, any>,
  ): Promise<any> {
    if (!tool.mcpServerName) {
      throw new Error(`MCP tool "${tool.name}" has no server name configured`);
    }

    // MCP tools are invoked via the MCP server's HTTP endpoint.
    // The MCP server exposes a JSON-RPC compatible endpoint.
    // Convention: the tool's endpoint field stores the MCP server URL,
    // or we derive it from mcpServerName via known registry.
    const mcpEndpoint = tool.endpoint || this.resolveMcpEndpoint(tool.mcpServerName);

    if (!mcpEndpoint) {
      throw new Error(
        `Cannot resolve MCP endpoint for server "${tool.mcpServerName}". ` +
          'Set the endpoint field on the tool definition.',
      );
    }

    try {
      const response = await axios.post(
        mcpEndpoint,
        {
          jsonrpc: '2.0',
          method: 'tools/call',
          params: {
            name: tool.name,
            arguments: parameters,
          },
          id: `wf-${Date.now()}`,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            ...(tool.headers || {}),
          },
          timeout: 120000, // 2 minute timeout for MCP
        },
      );

      const data = response.data;

      // JSON-RPC response
      if (data.error) {
        throw new Error(
          `MCP error: ${data.error.message || JSON.stringify(data.error)}`,
        );
      }

      // MCP tool result: { content: [{ type, text }], isError }
      const result = data.result || data;
      if (result.isError) {
        const errorText = result.content
          ?.filter((c: any) => c.type === 'text')
          .map((c: any) => c.text)
          .join('\n');
        throw new Error(`MCP tool error: ${errorText || 'Unknown error'}`);
      }

      // Extract text content from MCP response
      const textContent = result.content
        ?.filter((c: any) => c.type === 'text')
        .map((c: any) => {
          // Try to parse JSON text
          try {
            return JSON.parse(c.text);
          } catch {
            return c.text;
          }
        });

      return {
        content: textContent || result,
        raw: result,
      };
    } catch (err: any) {
      if (err.response) {
        throw new Error(
          `MCP call failed (${err.response.status}): ${
            err.response.data?.error?.message || err.response.statusText
          }`,
        );
      }
      throw err;
    }
  }

  // ─── Helpers ─────────────────────────────────────────

  /**
   * Apply authentication config to request headers.
   * Supports: bearer token, basic auth, api-key header.
   */
  private applyAuth(
    headers: Record<string, string>,
    authConfig: Record<string, any>,
  ): void {
    const type = (authConfig.type || '').toLowerCase();

    switch (type) {
      case 'bearer':
        if (authConfig.token) {
          headers['Authorization'] = `Bearer ${authConfig.token}`;
        }
        break;
      case 'basic':
        if (authConfig.username && authConfig.password) {
          const credentials = Buffer.from(
            `${authConfig.username}:${authConfig.password}`,
          ).toString('base64');
          headers['Authorization'] = `Basic ${credentials}`;
        }
        break;
      case 'api_key':
      case 'api-key':
        if (authConfig.headerName && authConfig.headerValue) {
          headers[authConfig.headerName] = authConfig.headerValue;
        }
        break;
      // No auth or unknown type — skip
    }
  }

  /**
   * Resolve MCP server endpoint from known server name patterns.
   */
  private resolveMcpEndpoint(serverName: string): string | null {
    // Common local MCP server patterns
    const knownServers: Record<string, string> = {
      'wren-engine': 'http://localhost:5555/mcp',
    };
    return knownServers[serverName] || null;
  }

  /**
   * Sanitize response headers — remove sensitive/noisy headers.
   */
  private sanitizeResponseHeaders(
    headers: Record<string, any>,
  ): Record<string, string> {
    const safe: Record<string, string> = {};
    const allowList = [
      'content-type',
      'content-length',
      'x-request-id',
      'x-ratelimit-remaining',
      'x-ratelimit-limit',
      'retry-after',
    ];
    for (const key of allowList) {
      if (headers[key]) {
        safe[key] = String(headers[key]);
      }
    }
    return safe;
  }
}
