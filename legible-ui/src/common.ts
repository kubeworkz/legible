import { getConfig } from '@server/config';
import { bootstrapKnex } from './apollo/server/utils/knex';
import {
  ProjectRepository,
  ViewRepository,
  DeployLogRepository,
  ThreadRepository,
  ThreadResponseRepository,
  ModelRepository,
  ModelColumnRepository,
  RelationRepository,
  SchemaChangeRepository,
  ModelNestedColumnRepository,
  LearningRepository,
  DashboardItemRepository,
  DashboardRepository,
  SqlPairRepository,
  AskingTaskRepository,
  InstructionRepository,
  ApiHistoryRepository,
  DashboardItemRefreshJobRepository,
  UserRepository,
  OrganizationRepository,
  MemberRepository,
  SessionRepository,
  InvitationRepository,
  OrgApiKeyRepository,
  ProjectApiKeyRepository,
  SessionPropertyRepository,
  RlsPolicyRepository,
  UserSessionPropertyValueRepository,
  FolderRepository,
  FolderAccessRepository,
  SpreadsheetRepository,
  SpreadsheetHistoryRepository,
  ProjectMemberRepository,
  ProjectPermissionOverrideRepository,
  AuditLogRepository,
  MagicLinkRepository,
  OidcProviderRepository,
  UserIdentityRepository,
} from '@server/repositories';
import { FolderService } from '@server/services/folderService';
import { SpreadsheetService } from '@server/services/spreadsheetService';
import { ProjectMemberService } from '@server/services/projectMemberService';
import { AuditLogService } from '@server/services/auditLogService';
import {
  WrenEngineAdaptor,
  WrenAIAdaptor,
  IbisAdaptor,
} from '@server/adaptors';
import {
  DataSourceMetadataService,
  QueryService,
  ProjectService,
  DeployService,
  AskingService,
  MDLService,
  DashboardService,
  AskingTaskTracker,
  InstructionService,
  AuthService,
  OrganizationService,
  MemberService,
  OrgApiKeyService,
  ProjectApiKeyService,
} from '@server/services';
import { RlsPolicyService } from './apollo/server/services/rlsPolicyService';
import { RateLimitService } from './apollo/server/services/rateLimitService';
import { BillingService } from './apollo/server/services/billingService';
import {
  BillingConfigRepository,
  MonthlyUsageCacheRepository,
} from './apollo/server/repositories/billingRepository';
import { QueryUsageRepository } from './apollo/server/repositories/queryUsageRepository';
import { QueryMeteringService } from './apollo/server/services/queryMeteringService';
import { StripeService } from './apollo/server/services/stripeService';
import { EmailService } from './apollo/server/services/emailService';
import { OidcService } from './apollo/server/services/oidcService';
import { SubscriptionRepository } from './apollo/server/repositories/subscriptionRepository';
import { PostHogTelemetry } from './apollo/server/telemetry/telemetry';
import {
  ProjectRecommendQuestionBackgroundTracker,
  ThreadRecommendQuestionBackgroundTracker,
  DashboardCacheBackgroundTracker,
} from './apollo/server/backgrounds';
import { SqlPairService } from './apollo/server/services/sqlPairService';
import {
  AgentRepository,
  AgentAuditLogRepository,
} from './apollo/server/repositories/agentRepository';
import { AgentService } from './apollo/server/services/agentService';
import { GatewayRepository } from './apollo/server/repositories/gatewayRepository';
import { GatewayService } from './apollo/server/services/gatewayService';
import { BlueprintRepository } from './apollo/server/repositories/blueprintRepository';
import { BlueprintService } from './apollo/server/services/blueprintService';
import { BlueprintRegistryRepository } from './apollo/server/repositories/blueprintRegistryRepository';
import { BlueprintRegistryService } from './apollo/server/services/blueprintRegistryService';
import { AutoProvisionConfigRepository } from './apollo/server/repositories/autoProvisionConfigRepository';
import { AutoProvisionService } from './apollo/server/services/autoProvisionService';
import {
  PromptTemplateRepository,
  PromptTemplateVersionRepository,
} from '@server/repositories/promptTemplateRepository';
import { ToolDefinitionRepository } from '@server/repositories/toolDefinitionRepository';
import {
  WorkflowRepository,
  WorkflowVersionRepository,
} from '@server/repositories/workflowRepository';
import { PromptTemplateService } from '@server/services/promptTemplateService';
import { ToolDefinitionService } from '@server/services/toolDefinitionService';
import { WorkflowService } from '@server/services/workflowService';
import {
  WorkflowExecutionRepository,
  WorkflowExecutionStepRepository,
} from '@server/repositories/workflowExecutionRepository';
import { WorkflowExecutionService } from '@server/services/workflow/executionEngine';
import { LLMService } from '@server/services/llmService';
import { ToolExecutionService } from '@server/services/toolExecutionService';
import {
  AgentDefinitionRepository,
  AgentDefinitionVersionRepository,
} from '@server/repositories/agentDefinitionRepository';
import { AgentDefinitionService } from '@server/services/agentDefinitionService';
import { getLogger } from '@server/utils';

export const serverConfig = getConfig();

export const initComponents = () => {
  const telemetry = new PostHogTelemetry();
  const knex = bootstrapKnex({
    dbType: serverConfig.dbType,
    pgUrl: serverConfig.pgUrl,
    debug: serverConfig.debug,
    sqliteFile: serverConfig.sqliteFile,
  });

  // repositories
  const projectRepository = new ProjectRepository(knex);
  const deployLogRepository = new DeployLogRepository(knex);
  const threadRepository = new ThreadRepository(knex);
  const threadResponseRepository = new ThreadResponseRepository(knex);
  const viewRepository = new ViewRepository(knex);
  const modelRepository = new ModelRepository(knex);
  const modelColumnRepository = new ModelColumnRepository(knex);
  const modelNestedColumnRepository = new ModelNestedColumnRepository(knex);
  const relationRepository = new RelationRepository(knex);
  const schemaChangeRepository = new SchemaChangeRepository(knex);
  const learningRepository = new LearningRepository(knex);
  const dashboardRepository = new DashboardRepository(knex);
  const dashboardItemRepository = new DashboardItemRepository(knex);
  const sqlPairRepository = new SqlPairRepository(knex);
  const askingTaskRepository = new AskingTaskRepository(knex);
  const instructionRepository = new InstructionRepository(knex);
  const apiHistoryRepository = new ApiHistoryRepository(knex);
  const dashboardItemRefreshJobRepository =
    new DashboardItemRefreshJobRepository(knex);
  const userRepository = new UserRepository(knex);
  const organizationRepository = new OrganizationRepository(knex);
  const memberRepository = new MemberRepository(knex);
  const sessionRepository = new SessionRepository(knex);
  const invitationRepository = new InvitationRepository(knex);
  const orgApiKeyRepository = new OrgApiKeyRepository(knex);
  const projectApiKeyRepository = new ProjectApiKeyRepository(knex);
  const sessionPropertyRepository = new SessionPropertyRepository(knex);
  const rlsPolicyRepository = new RlsPolicyRepository(knex);
  const userSessionPropertyValueRepository =
    new UserSessionPropertyValueRepository(knex);
  const folderRepository = new FolderRepository(knex);
  const folderAccessRepository = new FolderAccessRepository(knex);
  const spreadsheetRepository = new SpreadsheetRepository(knex);
  const spreadsheetHistoryRepository = new SpreadsheetHistoryRepository(knex);
  const projectMemberRepository = new ProjectMemberRepository(knex);
  const projectPermissionOverrideRepository =
    new ProjectPermissionOverrideRepository(knex);
  const auditLogRepository = new AuditLogRepository(knex);
  const billingConfigRepository = new BillingConfigRepository(knex);
  const monthlyUsageCacheRepository = new MonthlyUsageCacheRepository(knex);
  const queryUsageRepository = new QueryUsageRepository(knex);
  const subscriptionRepository = new SubscriptionRepository(knex);
  const magicLinkRepository = new MagicLinkRepository(knex);
  const oidcProviderRepository = new OidcProviderRepository(knex);
  const userIdentityRepository = new UserIdentityRepository(knex);
  const agentRepository = new AgentRepository(knex);
  const agentAuditLogRepository = new AgentAuditLogRepository(knex);
  const gatewayRepository = new GatewayRepository(knex);
  const blueprintRepository = new BlueprintRepository(knex);
  const blueprintRegistryRepository = new BlueprintRegistryRepository(knex);
  const autoProvisionConfigRepository = new AutoProvisionConfigRepository(knex);
  const promptTemplateRepository = new PromptTemplateRepository(knex);
  const promptTemplateVersionRepository = new PromptTemplateVersionRepository(knex);
  const toolDefinitionRepository = new ToolDefinitionRepository(knex);
  const workflowRepository = new WorkflowRepository(knex);
  const workflowVersionRepository = new WorkflowVersionRepository(knex);
  const workflowExecutionRepository = new WorkflowExecutionRepository(knex);
  const workflowExecutionStepRepository = new WorkflowExecutionStepRepository(knex);
  const agentDefinitionRepository = new AgentDefinitionRepository(knex);
  const agentDefinitionVersionRepository = new AgentDefinitionVersionRepository(knex);

  // adaptors
  const wrenEngineAdaptor = new WrenEngineAdaptor({
    wrenEngineEndpoint: serverConfig.wrenEngineEndpoint,
  });
  const wrenAIAdaptor = new WrenAIAdaptor({
    wrenAIBaseEndpoint: serverConfig.wrenAIEndpoint,
  });
  const ibisAdaptor = new IbisAdaptor({
    ibisServerEndpoint: serverConfig.ibisServerEndpoint,
  });

  // services
  const metadataService = new DataSourceMetadataService({
    ibisAdaptor,
    wrenEngineAdaptor,
  });
  const queryMeteringService = new QueryMeteringService({
    queryUsageRepository,
    subscriptionRepository,
  });
  const queryService = new QueryService({
    ibisAdaptor,
    wrenEngineAdaptor,
    telemetry,
    queryMeteringService,
  });
  const deployService = new DeployService({
    wrenAIAdaptor,
    deployLogRepository,
    telemetry,
  });
  const mdlService = new MDLService({
    projectRepository,
    modelRepository,
    modelColumnRepository,
    modelNestedColumnRepository,
    relationRepository,
    viewRepository,
    rlsPolicyRepository,
    sessionPropertyRepository,
  });
  const projectService = new ProjectService({
    projectRepository,
    metadataService,
    mdlService,
    wrenAIAdaptor,
    telemetry,
  });
  const askingTaskTracker = new AskingTaskTracker({
    wrenAIAdaptor,
    askingTaskRepository,
    threadResponseRepository,
    viewRepository,
  });
  const askingService = new AskingService({
    telemetry,
    wrenAIAdaptor,
    deployService,
    projectService,
    viewRepository,
    threadRepository,
    threadResponseRepository,
    queryService,
    mdlService,
    askingTaskTracker,
    askingTaskRepository,
  });
  const dashboardService = new DashboardService({
    projectService,
    dashboardItemRepository,
    dashboardRepository,
  });
  const sqlPairService = new SqlPairService({
    sqlPairRepository,
    wrenAIAdaptor,
    ibisAdaptor,
  });
  const instructionService = new InstructionService({
    instructionRepository,
    wrenAIAdaptor,
  });
  const emailService = new EmailService({
    postmarkServerToken: serverConfig.postmarkServerToken,
    emailFrom: serverConfig.emailFrom,
    appBaseUrl: serverConfig.appBaseUrl,
  });
  const authService = new AuthService({
    userRepository,
    sessionRepository,
    organizationRepository,
    memberRepository,
    projectRepository,
    magicLinkRepository,
    oidcProviderRepository,
    emailService,
  });
  const oidcService = new OidcService({
    oidcProviderRepository,
    userIdentityRepository,
    userRepository,
    sessionRepository,
    organizationRepository,
    memberRepository,
    projectRepository,
    encryptionPassword: serverConfig.encryptionPassword,
    encryptionSalt: serverConfig.encryptionSalt,
  });
  const organizationService = new OrganizationService({
    organizationRepository,
    memberRepository,
    userRepository,
    projectRepository,
  });
  const memberService = new MemberService({
    memberRepository,
    invitationRepository,
    userRepository,
    organizationRepository,
    emailService,
  });
  const orgApiKeyService = new OrgApiKeyService({
    orgApiKeyRepository,
    userRepository,
  });
  const projectApiKeyService = new ProjectApiKeyService({
    projectApiKeyRepository,
    userRepository,
  });
  const rateLimitService = new RateLimitService({
    orgApiKeyRepository,
    projectApiKeyRepository,
  });
  const billingService = new BillingService({
    billingConfigRepository,
    monthlyUsageCacheRepository,
    apiHistoryRepository,
  });
  const rlsPolicyService = new RlsPolicyService({
    sessionPropertyRepository,
    rlsPolicyRepository,
    userSessionPropertyValueRepository,
  });
  const folderService = new FolderService({
    folderRepository,
    folderAccessRepository,
    dashboardRepository,
    threadRepository,
    spreadsheetRepository,
  });
  const spreadsheetService = new SpreadsheetService({
    projectService,
    spreadsheetRepository,
    spreadsheetHistoryRepository,
  });
  const projectMemberService = new ProjectMemberService({
    projectMemberRepository,
    memberRepository,
  });
  const auditLogService = new AuditLogService({
    auditLogRepository,
  });
  const stripeService = new StripeService({
    stripeSecretKey: serverConfig.stripeSecretKey,
    stripeProPriceId: serverConfig.stripeProPriceId,
    stripePortalReturnUrl: serverConfig.stripePortalReturnUrl,
    stripeTrialDays: serverConfig.stripeTrialDays,
    subscriptionRepository,
  });

  const agentService = new AgentService({
    agentRepository,
    agentAuditLogRepository,
  });

  const gatewayService = new GatewayService({
    gatewayRepository,
  });

  const blueprintService = new BlueprintService({
    blueprintRepository,
  });

  const blueprintRegistryService = new BlueprintRegistryService({
    blueprintRegistryRepository,
    blueprintRepository,
  });

  const autoProvisionService = new AutoProvisionService({
    autoProvisionConfigRepository,
    blueprintRepository,
    blueprintRegistryRepository,
    agentRepository,
    organizationRepository,
    projectRepository,
    gatewayService,
  });

  const promptTemplateService = new PromptTemplateService({
    promptTemplateRepository,
    promptTemplateVersionRepository,
  });

  const toolDefinitionService = new ToolDefinitionService({
    toolDefinitionRepository,
  });

  const workflowService = new WorkflowService({
    workflowRepository,
    workflowVersionRepository,
  });

  const llmService = new LLMService({
    projectRepository,
  });

  const toolExecutionService = new ToolExecutionService({
    toolDefinitionService,
    queryService,
    deployService,
    projectRepository,
  });

  const workflowExecutionService = new WorkflowExecutionService({
    workflowRepository,
    workflowExecutionRepository,
    workflowExecutionStepRepository,
    promptTemplateService,
    llmService,
    toolExecutionService,
  });

  const agentDefinitionService = new AgentDefinitionService({
    agentDefinitionRepository,
    agentDefinitionVersionRepository,
  });

  // Wire stripeService into metering (created earlier, avoids circular init)
  queryMeteringService.setStripeService(stripeService);

  // background trackers
  const projectRecommendQuestionBackgroundTracker =
    new ProjectRecommendQuestionBackgroundTracker({
      telemetry,
      wrenAIAdaptor,
      projectRepository,
    });
  const threadRecommendQuestionBackgroundTracker =
    new ThreadRecommendQuestionBackgroundTracker({
      telemetry,
      wrenAIAdaptor,
      threadRepository,
    });
  const dashboardCacheBackgroundTracker = new DashboardCacheBackgroundTracker({
    dashboardRepository,
    dashboardItemRepository,
    dashboardItemRefreshJobRepository,
    projectService,
    deployService,
    queryService,
  });

  return {
    knex,
    telemetry,

    // repositories
    projectRepository,
    deployLogRepository,
    threadRepository,
    threadResponseRepository,
    viewRepository,
    modelRepository,
    modelColumnRepository,
    relationRepository,
    schemaChangeRepository,
    learningRepository,
    modelNestedColumnRepository,
    dashboardRepository,
    dashboardItemRepository,
    sqlPairRepository,
    askingTaskRepository,
    apiHistoryRepository,
    instructionRepository,
    dashboardItemRefreshJobRepository,
    userRepository,
    organizationRepository,
    memberRepository,
    sessionRepository,
    invitationRepository,
    orgApiKeyRepository,
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
    agentRepository,
    agentAuditLogRepository,
    gatewayRepository,

    // adaptors
    wrenEngineAdaptor,
    wrenAIAdaptor,
    ibisAdaptor,

    // services
    metadataService,
    projectService,
    queryService,
    deployService,
    askingService,
    mdlService,
    dashboardService,
    sqlPairService,
    instructionService,
    askingTaskTracker,
    authService,
    organizationService,
    memberService,
    orgApiKeyService,
    projectApiKeyService,
    rateLimitService,
    billingService,
    rlsPolicyService,
    folderService,
    spreadsheetService,
    projectMemberService,
    auditLogService,
    queryMeteringService,
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

    // background trackers
    projectRecommendQuestionBackgroundTracker,
    threadRecommendQuestionBackgroundTracker,
    dashboardCacheBackgroundTracker,
  };
};

// singleton components
export const components = initComponents();

// ----- Scheduled maintenance tasks -----

const maintenanceLogger = getLogger('MAINTENANCE');

// Auto-purge expired sessions every hour
setInterval(async () => {
  try {
    const deleted = await components.sessionRepository.deleteExpired();
    if (deleted > 0) {
      maintenanceLogger.info(`Purged ${deleted} expired session(s)`);
      // Audit log the session expiry
      components.auditLogService.log({
        category: 'auth' as any,
        action: 'session_expired' as any,
        detail: { expiredCount: deleted, trigger: 'scheduled_cleanup' },
      });
    }
  } catch (err: any) {
    maintenanceLogger.error(`Session cleanup failed: ${err.message}`);
  }
}, 60 * 60 * 1000); // 1 hour

// Auto-purge old audit logs daily
const retentionDays = serverConfig.auditLogRetentionDays || 365;
setInterval(async () => {
  try {
    const deleted = await components.auditLogService.purge(retentionDays);
    if (deleted > 0) {
      maintenanceLogger.info(
        `Purged ${deleted} audit log(s) older than ${retentionDays} days`,
      );
    }
  } catch (err: any) {
    maintenanceLogger.error(`Audit log retention failed: ${err.message}`);
  }
}, 24 * 60 * 60 * 1000); // 24 hours
