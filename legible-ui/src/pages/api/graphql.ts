import { NextApiRequest, NextApiResponse } from 'next';
import { ApolloServer } from 'apollo-server-micro';
import { typeDefs } from '@server';
import resolvers from '@server/resolvers';
import { IContext } from '@server/types';
import { GraphQLError } from 'graphql';
import { getLogger } from '@server/utils';
import { getConfig } from '@server/config';
import { ModelService } from '@server/services/modelService';
import {
  defaultApolloErrorHandler,
  GeneralErrorCodes,
} from '@/apollo/server/utils/error';
import { createAuthPlugin } from '@/apollo/server/utils/authPlugin';
import { TelemetryEvent } from '@/apollo/server/telemetry/telemetry';
import { components } from '@/common';
import { byokStore } from '@server/utils/byokContext';
import { getDecryptedByokKey } from '@server/resolvers/byokResolver';
import depthLimit from 'graphql-depth-limit';
import { seedBuiltinRegistryEntries } from '@server/utils/seedRegistry';

const serverConfig = getConfig();
const logger = getLogger('APOLLO');
logger.level = 'debug';

// Restrict CORS to configured origins (defaults to same-origin only).
// Internal services (AI service) communicate server-to-server and are
// unaffected by CORS restrictions.
const ALLOWED_ORIGINS = process.env.CORS_ALLOWED_ORIGINS
  ? process.env.CORS_ALLOWED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
  : [];

const CORS_HEADERS = [
  'Content-Type',
  'Authorization',
  'X-Project-Id',
  'X-Organization-Id',
  'X-Service-Token',
].join(', ');

function applyCors(req: NextApiRequest, res: NextApiResponse): boolean {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.length > 0 && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  // If no allowed origins configured or origin not in list, no ACAO header
  // is set — browsers will block the cross-origin request (same-origin OK).

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', CORS_HEADERS);
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return true; // Preflight handled — stop processing
  }
  return false; // Continue to handler
}

export const config = {
  api: {
    bodyParser: false,
  },
};

const bootstrapServer = async () => {
  const {
    telemetry,

    // repositories
    projectRepository,
    threadRepository,
    modelRepository,
    modelColumnRepository,
    relationRepository,
    deployLogRepository,
    viewRepository,
    schemaChangeRepository,
    learningRepository,
    modelNestedColumnRepository,
    dashboardRepository,
    dashboardItemRepository,
    sqlPairRepository,
    instructionRepository,
    apiHistoryRepository,
    dashboardItemRefreshJobRepository,
    userRepository,
    organizationRepository,
    memberRepository,
    sessionRepository,
    invitationRepository,
    projectApiKeyRepository,
    sessionPropertyRepository,
    rlsPolicyRepository,
    userSessionPropertyValueRepository,
    folderRepository,
    folderAccessRepository,
    spreadsheetRepository,
    projectMemberRepository,
    projectPermissionOverrideRepository,
    auditLogRepository,
    queryUsageRepository,
    oidcProviderRepository,
    userIdentityRepository,
    // adaptors
    wrenEngineAdaptor,
    ibisAdaptor,
    wrenAIAdaptor,

    // services
    projectService,
    queryService,
    askingService,
    deployService,
    mdlService,
    dashboardService,
    sqlPairService,

    instructionService,
    // auth services
    authService,
    organizationService,
    memberService,
    orgApiKeyService,
    projectApiKeyService,
    rlsPolicyService,
    folderService,
    spreadsheetService,
    projectMemberService,
    auditLogService,
    queryMeteringService,
    rateLimitService,
    billingService,
    stripeService,
    emailService,
    oidcService,
    agentService,
    gatewayService,
    blueprintService,
    blueprintRegistryService,
    autoProvisionService,
    promptTemplateService,
    toolDefinitionService,
    workflowService,
    workflowExecutionService,
    agentDefinitionService,
    agentChatService,
    subscriptionRepository,
    // background trackers
    projectRecommendQuestionBackgroundTracker,
    threadRecommendQuestionBackgroundTracker,
    dashboardCacheBackgroundTracker,
  } = components;

  const modelService = new ModelService({
    projectService,
    modelRepository,
    modelColumnRepository,
    relationRepository,
    viewRepository,
    mdlService,
    wrenEngineAdaptor,
    queryService,
  });

  // initialize services
  await Promise.all([
    askingService.initialize(),
    projectRecommendQuestionBackgroundTracker.initialize(),
    threadRecommendQuestionBackgroundTracker.initialize(),
  ]);

  // Seed built-in blueprint registry entries (idempotent)
  await seedBuiltinRegistryEntries(blueprintRegistryService);

  // Backfill: auto-install registry blueprints into existing projects that have none
  try {
    const allProjects = await projectRepository.listProjects();
    const registryEntries =
      await blueprintRegistryService.listRegistryEntries();
    for (const project of allProjects) {
      for (const entry of registryEntries) {
        await blueprintRegistryService.installToProject(entry.id, project.id);
      }
    }
  } catch (err: any) {
    logger.warn(`Blueprint backfill failed: ${err.message}`);
  }

  const apolloServer: ApolloServer = new ApolloServer({
    typeDefs,
    resolvers,
    plugins: [createAuthPlugin()],
    validationRules: [depthLimit(10)],
    formatError: (error: GraphQLError) => {
      // stop print error stacktrace of dry run error
      if (error.extensions?.code === GeneralErrorCodes.DRY_RUN_ERROR) {
        return defaultApolloErrorHandler(error);
      }

      // print error stacktrace of graphql error
      const stacktrace = error.extensions?.exception?.stacktrace;
      if (stacktrace) {
        logger.error(stacktrace.join('\n'));
      }

      // print original error stacktrace
      const originalError = error.extensions?.originalError as Error;
      if (originalError) {
        logger.error(`== original error ==`);
        // error may not have stack, so print error message if stack is not available
        logger.error(originalError.stack || originalError.message);
      }

      // telemetry: capture internal server error
      if (error.extensions?.code === GeneralErrorCodes.INTERNAL_SERVER_ERROR) {
        telemetry.sendEvent(
          TelemetryEvent.GRAPHQL_ERROR,
          {
            originalErrorStack: originalError?.stack,
            originalErrorMessage: originalError?.message,
            errorMessage: error.message,
          },
          error.extensions?.service,
          false,
        );
      }
      return defaultApolloErrorHandler(error);
    },
    introspection: process.env.NODE_ENV !== 'production',
    context: async ({ req }): Promise<IContext> => {
      // Extract client IP for rate limiting
      const xff = req?.headers?.['x-forwarded-for'];
      const xri = req?.headers?.['x-real-ip'];
      const clientIp = xff
        ? (Array.isArray(xff) ? xff[0] : xff).split(',')[0].trim()
        : xri
          ? (Array.isArray(xri) ? xri[0] : String(xri))
          : req?.socket?.remoteAddress || 'unknown';

      // Extract projectId from X-Project-Id header if present
      const projectIdHeader = req?.headers?.['x-project-id'];
      const projectId = projectIdHeader
        ? parseInt(String(projectIdHeader), 10)
        : undefined;

      // Extract organizationId from X-Organization-Id header if present
      const orgIdHeader = req?.headers?.['x-organization-id'];
      const organizationId = orgIdHeader
        ? parseInt(String(orgIdHeader), 10)
        : undefined;

      // Extract auth token from Authorization header
      const authHeader = req?.headers?.authorization || '';
      const authToken = authHeader.startsWith('Bearer ')
        ? authHeader.slice(7)
        : undefined;

      // Resolve current user from session token or API key
      let currentUser = null;
      let resolvedOrgId = organizationId;
      let resolvedProjectId = projectId;
      if (authToken) {
        if (authToken.startsWith('osk-')) {
          // Organization API key authentication
          const keyResult = await orgApiKeyService.validateKey(authToken);
          if (keyResult) {
            resolvedOrgId = keyResult.organizationId;
          }
        } else if (authToken.startsWith('psk-')) {
          // Project API key authentication
          const keyResult = await projectApiKeyService.validateKey(authToken);
          if (keyResult) {
            resolvedOrgId = keyResult.organizationId;
            resolvedProjectId = keyResult.projectId;
          }
        } else {
          // Session token authentication
          currentUser = await authService.validateSession(authToken);
        }
      }

      // Auto-resolve organizationId from user's membership when header is missing
      if (!resolvedOrgId && currentUser) {
        try {
          const userOrgs =
            await organizationService.listUserOrganizations(currentUser.id);
          if (userOrgs.length > 0) {
            resolvedOrgId = userOrgs[0].id;
          }
        } catch {
          // ignore — org resolution is best-effort
        }
      }

      return {
        config: serverConfig,
        telemetry,
        projectId: !isNaN(resolvedProjectId) ? resolvedProjectId : undefined,
        organizationId: !isNaN(resolvedOrgId) ? resolvedOrgId : undefined,
        // auth
        currentUser,
        authToken,
        clientIp,
        // adaptor
        wrenEngineAdaptor,
        ibisServerAdaptor: ibisAdaptor,
        wrenAIAdaptor,
        // services
        projectService,
        modelService,
        mdlService,
        deployService,
        askingService,
        queryService,
        dashboardService,
        sqlPairService,
        instructionService,
        authService,
        organizationService,
        memberService,
        orgApiKeyService,
        projectApiKeyService,
        rlsPolicyService,
        folderService,
        spreadsheetService,
        projectMemberService,
        auditLogService,
        queryMeteringService,
        // repository
        projectRepository,
        threadRepository,
        modelRepository,
        modelColumnRepository,
        modelNestedColumnRepository,
        relationRepository,
        viewRepository,
        deployRepository: deployLogRepository,
        schemaChangeRepository,
        learningRepository,
        dashboardRepository,
        dashboardItemRepository,
        sqlPairRepository,
        instructionRepository,
        apiHistoryRepository,
        dashboardItemRefreshJobRepository,
        userRepository,
        organizationRepository,
        memberRepository,
        sessionRepository,
        invitationRepository,
        projectApiKeyRepository,
        sessionPropertyRepository,
        rlsPolicyRepository,
        userSessionPropertyValueRepository,
        folderRepository,
        folderAccessRepository,
        spreadsheetRepository,
        projectMemberRepository,
        projectPermissionOverrideRepository,
        auditLogRepository,
        queryUsageRepository,
        subscriptionRepository,
        oidcProviderRepository,
        userIdentityRepository,
        // rate limiting
        rateLimitService,
        // billing
        billingService,
        stripeService,
        emailService,
        oidcService,
        agentService,
        gatewayService,
        blueprintService,
        blueprintRegistryService,
        autoProvisionService,
        promptTemplateService,
        toolDefinitionService,
        workflowService,
        workflowExecutionService,
        agentDefinitionService,
        agentChatService,
        // background trackers
        projectRecommendQuestionBackgroundTracker,
        threadRecommendQuestionBackgroundTracker,
        dashboardCacheBackgroundTracker,
      };
    },
  });
  await apolloServer.start();
  return { apolloServer, projectRepository };
};

const startServer = bootstrapServer();

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const { apolloServer, projectRepository } = await startServer;

  // Read project ID from request header to look up BYOK config
  const projectIdHeader = req?.headers?.['x-project-id'];
  const projectId = projectIdHeader
    ? parseInt(String(projectIdHeader), 10)
    : undefined;

  // Resolve the BYOK config for this project (if any)
  const byokConfig =
    projectId && !isNaN(projectId)
      ? await getDecryptedByokKey(projectRepository, projectId)
      : null;

  // Run the Apollo handler within the BYOK context so that the adaptor's
  // axios interceptor can pick up the API key from AsyncLocalStorage.
  return byokStore.run(byokConfig, () =>
    apolloServer.createHandler({ path: '/api/graphql' })(req, res),
  );
};

export default async function graphqlHandler(req: NextApiRequest, res: NextApiResponse) {
  // Apply CORS; returns true for preflight OPTIONS to stop processing
  if (applyCors(req, res)) return;
  return handler(req, res);
}
