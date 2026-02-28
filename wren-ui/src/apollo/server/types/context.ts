import { IConfig } from '@server/config';
import {
  IIbisAdaptor,
  IWrenAIAdaptor,
  IWrenEngineAdaptor,
} from '@server/adaptors';
import {
  IModelColumnRepository,
  IModelNestedColumnRepository,
  IModelRepository,
  IProjectRepository,
  IRelationRepository,
  IViewRepository,
  ILearningRepository,
  ISchemaChangeRepository,
  IDeployLogRepository,
  IDashboardRepository,
  IDashboardItemRepository,
  ISqlPairRepository,
  IInstructionRepository,
  IApiHistoryRepository,
  IDashboardItemRefreshJobRepository,
  IUserRepository,
  IOrganizationRepository,
  IMemberRepository,
  ISessionRepository,
  IInvitationRepository,
} from '@server/repositories';
import { IProjectApiKeyRepository } from '@server/repositories/projectApiKeyRepository';
import { ISessionPropertyRepository } from '@server/repositories/sessionPropertyRepository';
import { IRlsPolicyRepository } from '@server/repositories/rlsPolicyRepository';
import { IUserSessionPropertyValueRepository } from '@server/repositories/userSessionPropertyValueRepository';
import {
  IQueryService,
  IAskingService,
  IDeployService,
  IModelService,
  IMDLService,
  IProjectService,
  IDashboardService,
  IInstructionService,
  IAuthService,
  IOrganizationService,
  IMemberService,
  IOrgApiKeyService,
} from '@server/services';
import { IProjectApiKeyService } from '../services/projectApiKeyService';
import { IRlsPolicyService } from '../services/rlsPolicyService';
import { ITelemetry } from '@server/telemetry/telemetry';
import {
  ProjectRecommendQuestionBackgroundTracker,
  ThreadRecommendQuestionBackgroundTracker,
  DashboardCacheBackgroundTracker,
} from '@server/backgrounds';
import { ISqlPairService } from '../services/sqlPairService';
import { User } from '@server/repositories/userRepository';

export interface IContext {
  config: IConfig;
  // telemetry
  telemetry: ITelemetry;

  // active project (set from X-Project-Id header or falls back to first project)
  projectId?: number;

  // active organization (set from X-Organization-Id header)
  organizationId?: number;

  // auth
  currentUser?: User | null;
  authToken?: string;

  // adaptor
  wrenEngineAdaptor: IWrenEngineAdaptor;
  ibisServerAdaptor: IIbisAdaptor;
  wrenAIAdaptor: IWrenAIAdaptor;

  // services
  projectService: IProjectService;
  modelService: IModelService;
  mdlService: IMDLService;
  deployService: IDeployService;
  askingService: IAskingService;
  queryService: IQueryService;
  dashboardService: IDashboardService;
  sqlPairService: ISqlPairService;
  instructionService: IInstructionService;
  authService: IAuthService;
  organizationService: IOrganizationService;
  memberService: IMemberService;
  orgApiKeyService: IOrgApiKeyService;
  projectApiKeyService: IProjectApiKeyService;
  rlsPolicyService: IRlsPolicyService;

  // repository
  projectRepository: IProjectRepository;
  modelRepository: IModelRepository;
  modelColumnRepository: IModelColumnRepository;
  modelNestedColumnRepository: IModelNestedColumnRepository;
  relationRepository: IRelationRepository;
  viewRepository: IViewRepository;
  deployRepository: IDeployLogRepository;
  schemaChangeRepository: ISchemaChangeRepository;
  learningRepository: ILearningRepository;
  dashboardRepository: IDashboardRepository;
  dashboardItemRepository: IDashboardItemRepository;
  sqlPairRepository: ISqlPairRepository;
  instructionRepository: IInstructionRepository;
  apiHistoryRepository: IApiHistoryRepository;
  dashboardItemRefreshJobRepository: IDashboardItemRefreshJobRepository;
  userRepository: IUserRepository;
  organizationRepository: IOrganizationRepository;
  memberRepository: IMemberRepository;
  sessionRepository: ISessionRepository;
  invitationRepository: IInvitationRepository;
  projectApiKeyRepository: IProjectApiKeyRepository;
  sessionPropertyRepository: ISessionPropertyRepository;
  rlsPolicyRepository: IRlsPolicyRepository;
  userSessionPropertyValueRepository: IUserSessionPropertyValueRepository;

  // background trackers
  projectRecommendQuestionBackgroundTracker: ProjectRecommendQuestionBackgroundTracker;
  threadRecommendQuestionBackgroundTracker: ThreadRecommendQuestionBackgroundTracker;
  dashboardCacheBackgroundTracker: DashboardCacheBackgroundTracker;
}
