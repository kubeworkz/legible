import microCors from 'micro-cors';
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

const serverConfig = getConfig();
const logger = getLogger('APOLLO');
logger.level = 'debug';

const cors = microCors();

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

  const apolloServer: ApolloServer = new ApolloServer({
    typeDefs,
    resolvers,
    plugins: [createAuthPlugin()],
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
        // repository
        projectRepository,
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
        // background trackers
        projectRecommendQuestionBackgroundTracker,
        threadRecommendQuestionBackgroundTracker,
        dashboardCacheBackgroundTracker,
      };
    },
  });
  await apolloServer.start();
  return apolloServer;
};

const startServer = bootstrapServer();

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const apolloServer = await startServer;
  await apolloServer.createHandler({
    path: '/api/graphql',
  })(req, res);
};

export default cors((req: NextApiRequest, res: NextApiResponse) =>
  req.method === 'OPTIONS' ? res.status(200).end() : handler(req, res),
);
