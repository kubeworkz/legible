import GraphQLJSON from 'graphql-type-json';
import { ProjectResolver } from './resolvers/projectResolver';
import { ModelResolver } from './resolvers/modelResolver';
import { AskingResolver } from './resolvers/askingResolver';
import { DiagramResolver } from './resolvers/diagramResolver';
import { LearningResolver } from './resolvers/learningResolver';
import { DashboardResolver } from './resolvers/dashboardResolver';
import { SqlPairResolver } from './resolvers/sqlPairResolver';
import { InstructionResolver } from './resolvers/instructionResolver';
import { ApiHistoryResolver } from './resolvers/apiHistoryResolver';
import { AuthResolver } from './resolvers/authResolver';
import { OrganizationResolver } from './resolvers/organizationResolver';
import { OrgApiKeyResolver } from './resolvers/orgApiKeyResolver';
import { ProjectApiKeyResolver } from './resolvers/projectApiKeyResolver';
import { RlsPolicyResolver } from './resolvers/rlsPolicyResolver';
import { FolderResolver } from './resolvers/folderResolver';
import { SpreadsheetResolver } from './resolvers/spreadsheetResolver';
import { BillingResolver } from './resolvers/billingResolver';
import { QueryUsageResolver } from './resolvers/queryUsageResolver';
import { PermissionOverrideResolver } from './resolvers/permissionOverrideResolver';
import { ProjectMemberResolver } from './resolvers/projectMemberResolver';
import { AuditLogResolver } from './resolvers/auditLogResolver';
import { ByokResolver } from './resolvers/byokResolver';
import { StripeResolver } from './resolvers/stripeResolver';
import { convertColumnType } from '@server/utils';
import { DialectSQLScalar } from './scalars';

const projectResolver = new ProjectResolver();
const modelResolver = new ModelResolver();
const askingResolver = new AskingResolver();
const diagramResolver = new DiagramResolver();
const learningResolver = new LearningResolver();
const dashboardResolver = new DashboardResolver();
const sqlPairResolver = new SqlPairResolver();
const instructionResolver = new InstructionResolver();
const apiHistoryResolver = new ApiHistoryResolver();
const authResolver = new AuthResolver();
const organizationResolver = new OrganizationResolver();
const orgApiKeyResolver = new OrgApiKeyResolver();
const projectApiKeyResolver = new ProjectApiKeyResolver();
const rlsPolicyResolver = new RlsPolicyResolver();
const folderResolver = new FolderResolver();
const spreadsheetResolver = new SpreadsheetResolver();
const billingResolver = new BillingResolver();
const queryUsageResolver = new QueryUsageResolver();
const permissionOverrideResolver = new PermissionOverrideResolver();
const projectMemberResolver = new ProjectMemberResolver();
const auditLogResolver = new AuditLogResolver();
const byokResolver = new ByokResolver();
const stripeResolver = new StripeResolver();
const resolvers = {
  JSON: GraphQLJSON,
  DialectSQL: DialectSQLScalar,
  Query: {
    // Auth
    me: authResolver.me,
    listOrganizations: organizationResolver.listOrganizations,
    organization: organizationResolver.getOrganization,
    organizationMembers: organizationResolver.getOrganizationMembers,

    // API Keys
    listApiKeys: orgApiKeyResolver.listApiKeys,
    apiKeyRateLimitStatus: orgApiKeyResolver.apiKeyRateLimitStatus,

    // Project API Keys
    listProjectApiKeys: projectApiKeyResolver.listProjectApiKeys,

    listDataSourceTables: projectResolver.listDataSourceTables,
    autoGenerateRelation: projectResolver.autoGenerateRelation,
    listModels: modelResolver.listModels,
    model: modelResolver.getModel,
    onboardingStatus: projectResolver.getOnboardingStatus,
    modelSync: modelResolver.checkModelSync,
    diagram: diagramResolver.getDiagram,
    schemaChange: projectResolver.getSchemaChange,

    // Ask
    askingTask: askingResolver.getAskingTask,
    suggestedQuestions: askingResolver.getSuggestedQuestions,
    instantRecommendedQuestions: askingResolver.getInstantRecommendedQuestions,

    // Adjustment
    adjustmentTask: askingResolver.getAdjustmentTask,

    // Thread
    thread: askingResolver.getThread,
    threads: askingResolver.listThreads,
    threadResponse: askingResolver.getResponse,
    nativeSql: modelResolver.getNativeSql,

    // Views
    listViews: modelResolver.listViews,
    view: modelResolver.getView,

    // Projects
    listProjects: projectResolver.listProjects,
    project: projectResolver.getProject,

    // Settings
    settings: projectResolver.getSettings,
    getMDL: modelResolver.getMDL,

    // Learning
    learningRecord: learningResolver.getLearningRecord,

    // Recommendation questions
    getThreadRecommendationQuestions:
      askingResolver.getThreadRecommendationQuestions,
    getProjectRecommendationQuestions:
      projectResolver.getProjectRecommendationQuestions,

    // Dashboard
    dashboards: dashboardResolver.getDashboards,
    dashboardItems: dashboardResolver.getDashboardItems,
    dashboard: dashboardResolver.getDashboard,

    // SQL Pairs
    sqlPairs: sqlPairResolver.getProjectSqlPairs,
    // Instructions
    instructions: instructionResolver.getInstructions,

    // API History
    apiHistory: apiHistoryResolver.getApiHistory,

    // Api Usage
    apiUsageDashboard: apiHistoryResolver.getApiUsageDashboard,
    apiMonthlyUsage: billingResolver.apiMonthlyUsage,

    // Billing
    billingConfig: billingResolver.billingConfig,
    billingOverview: billingResolver.billingOverview,
    monthlyBilling: billingResolver.monthlyBilling,

    // Query Usage / Metering
    queryUsageOverview: queryUsageResolver.queryUsageOverview,
    queryUsageStats: queryUsageResolver.queryUsageStats,
    queryAllowance: queryUsageResolver.queryAllowance,

    // Stripe / Subscription
    subscription: stripeResolver.subscription,
    stripeEnabled: stripeResolver.stripeEnabled,

    // Data Security
    sessionProperties: rlsPolicyResolver.listSessionProperties,
    rlsPolicies: rlsPolicyResolver.listRlsPolicies,
    rlsPolicy: rlsPolicyResolver.getRlsPolicy,
    userSessionPropertyValues: rlsPolicyResolver.listUserSessionPropertyValues,

    // Folders
    folders: folderResolver.listFolders,
    folder: folderResolver.getFolder,
    folderAccess: folderResolver.getFolderAccess,

    // Permission Overrides
    projectPermissionOverrides:
      permissionOverrideResolver.getProjectPermissionOverrides,

    // Project Members
    projectMembers: projectMemberResolver.listProjectMembers,
    myProjectRole: projectMemberResolver.getMyProjectRole,

    // Audit Logs
    auditLogs: auditLogResolver.getAuditLogs,

    // BYOK
    projectLlmConfig: byokResolver.getProjectLlmConfig,

    // Spreadsheets
    spreadsheets: spreadsheetResolver.getSpreadsheets,
    spreadsheet: spreadsheetResolver.getSpreadsheet,
    spreadsheetHistory: spreadsheetResolver.getSpreadsheetHistory,
  },
  Mutation: {
    // Auth
    signup: authResolver.signup,
    login: authResolver.login,
    logout: authResolver.logout,

    // User Profile
    updateProfile: authResolver.updateProfile,
    changePassword: authResolver.changePassword,
    deleteAccount: authResolver.deleteAccount,

    // Organization
    createOrganization: organizationResolver.createOrganization,
    updateOrganization: organizationResolver.updateOrganization,
    deleteOrganization: organizationResolver.deleteOrganization,

    // Members
    inviteMember: organizationResolver.inviteMember,
    acceptInvitation: organizationResolver.acceptInvitation,
    updateMemberRole: organizationResolver.updateMemberRole,
    removeMember: organizationResolver.removeMember,

    // API Keys
    createApiKey: orgApiKeyResolver.createApiKey,
    revokeApiKey: orgApiKeyResolver.revokeApiKey,
    deleteApiKey: orgApiKeyResolver.deleteApiKey,
    updateApiKeyRateLimits: orgApiKeyResolver.updateApiKeyRateLimits,
    resetApiKeyTokenQuota: orgApiKeyResolver.resetApiKeyTokenQuota,

    // Project API Keys
    createProjectApiKey: projectApiKeyResolver.createProjectApiKey,
    revokeProjectApiKey: projectApiKeyResolver.revokeProjectApiKey,
    deleteProjectApiKey: projectApiKeyResolver.deleteProjectApiKey,
    updateProjectApiKeyRateLimits:
      projectApiKeyResolver.updateProjectApiKeyRateLimits,
    resetProjectApiKeyTokenQuota:
      projectApiKeyResolver.resetProjectApiKeyTokenQuota,

    // Billing
    updateBillingConfig: billingResolver.updateBillingConfig,
    recomputeMonthlyBilling: billingResolver.recomputeMonthlyBilling,

    // Stripe / Subscription
    createCheckoutSession: stripeResolver.createCheckoutSession,
    createPortalSession: stripeResolver.createPortalSession,
    cancelSubscription: stripeResolver.cancelSubscription,
    resumeSubscription: stripeResolver.resumeSubscription,

    deploy: modelResolver.deploy,
    saveDataSource: projectResolver.saveDataSource,
    startSampleDataset: projectResolver.startSampleDataset,
    saveTables: projectResolver.saveTables,
    saveRelations: projectResolver.saveRelations,
    createModel: modelResolver.createModel,
    updateModel: modelResolver.updateModel,
    deleteModel: modelResolver.deleteModel,
    previewModelData: modelResolver.previewModelData,
    updateModelMetadata: modelResolver.updateModelMetadata,
    triggerDataSourceDetection: projectResolver.triggerDataSourceDetection,
    resolveSchemaChange: projectResolver.resolveSchemaChange,

    // calculated field
    createCalculatedField: modelResolver.createCalculatedField,
    validateCalculatedField: modelResolver.validateCalculatedField,
    updateCalculatedField: modelResolver.updateCalculatedField,
    deleteCalculatedField: modelResolver.deleteCalculatedField,

    // relation
    createRelation: modelResolver.createRelation,
    updateRelation: modelResolver.updateRelation,
    deleteRelation: modelResolver.deleteRelation,

    // Ask
    createAskingTask: askingResolver.createAskingTask,
    cancelAskingTask: askingResolver.cancelAskingTask,
    createInstantRecommendedQuestions:
      askingResolver.createInstantRecommendedQuestions,
    rerunAskingTask: askingResolver.rerunAskingTask,

    // Adjustment
    adjustThreadResponse: askingResolver.adjustThreadResponse,
    cancelAdjustmentTask: askingResolver.cancelAdjustThreadResponseAnswer,
    rerunAdjustmentTask: askingResolver.rerunAdjustThreadResponseAnswer,

    // Thread
    createThread: askingResolver.createThread,
    updateThread: askingResolver.updateThread,
    deleteThread: askingResolver.deleteThread,
    createThreadResponse: askingResolver.createThreadResponse,
    updateThreadResponse: askingResolver.updateThreadResponse,
    previewData: askingResolver.previewData,
    previewBreakdownData: askingResolver.previewBreakdownData,

    // Generate Thread Response Breakdown
    generateThreadResponseBreakdown:
      askingResolver.generateThreadResponseBreakdown,

    // Generate Thread Response Answer
    generateThreadResponseAnswer: askingResolver.generateThreadResponseAnswer,

    // Generate Thread Response Chart
    generateThreadResponseChart: askingResolver.generateThreadResponseChart,

    // Adjust Thread Response Chart
    adjustThreadResponseChart: askingResolver.adjustThreadResponseChart,

    // Views
    createView: modelResolver.createView,
    deleteView: modelResolver.deleteView,
    previewViewData: modelResolver.previewViewData,
    validateView: modelResolver.validateView,
    updateViewMetadata: modelResolver.updateViewMetadata,

    // Projects
    createProject: projectResolver.createProject,
    updateProject: projectResolver.updateProject,
    deleteProject: projectResolver.deleteProject,

    // Settings
    resetCurrentProject: projectResolver.resetCurrentProject,
    updateCurrentProject: projectResolver.updateCurrentProject,
    updateDataSource: projectResolver.updateDataSource,

    // preview
    previewSql: modelResolver.previewSql,

    // Learning
    saveLearningRecord: learningResolver.saveLearningRecord,

    // Recommendation questions
    generateThreadRecommendationQuestions:
      askingResolver.generateThreadRecommendationQuestions,
    generateProjectRecommendationQuestions:
      askingResolver.generateProjectRecommendationQuestions,

    // Dashboard
    createDashboard: dashboardResolver.createDashboard,
    updateDashboard: dashboardResolver.updateDashboard,
    deleteDashboard: dashboardResolver.deleteDashboard,
    updateDashboardItemLayouts: dashboardResolver.updateDashboardItemLayouts,
    createDashboardItem: dashboardResolver.createDashboardItem,
    updateDashboardItem: dashboardResolver.updateDashboardItem,
    deleteDashboardItem: dashboardResolver.deleteDashboardItem,
    previewItemSQL: dashboardResolver.previewItemSQL,
    setDashboardSchedule: dashboardResolver.setDashboardSchedule,

    // SQL Pairs
    createSqlPair: sqlPairResolver.createSqlPair,
    updateSqlPair: sqlPairResolver.updateSqlPair,
    deleteSqlPair: sqlPairResolver.deleteSqlPair,
    generateQuestion: sqlPairResolver.generateQuestion,
    modelSubstitute: sqlPairResolver.modelSubstitute,
    // Instructions
    createInstruction: instructionResolver.createInstruction,
    updateInstruction: instructionResolver.updateInstruction,
    deleteInstruction: instructionResolver.deleteInstruction,

    // Data Security: Session Properties
    createSessionProperty: rlsPolicyResolver.createSessionProperty,
    updateSessionProperty: rlsPolicyResolver.updateSessionProperty,
    deleteSessionProperty: rlsPolicyResolver.deleteSessionProperty,

    // Data Security: RLS Policies
    createRlsPolicy: rlsPolicyResolver.createRlsPolicy,
    updateRlsPolicy: rlsPolicyResolver.updateRlsPolicy,
    deleteRlsPolicy: rlsPolicyResolver.deleteRlsPolicy,

    // Data Security: User Session Property Assignments
    assignSessionPropertyValues: rlsPolicyResolver.assignSessionPropertyValues,

    // Folders
    createFolder: folderResolver.createFolder,
    updateFolder: folderResolver.updateFolder,
    deleteFolder: folderResolver.deleteFolder,
    ensureSystemFolders: folderResolver.ensureSystemFolders,
    setFolderAccess: folderResolver.setFolderAccess,
    moveDashboardToFolder: folderResolver.moveDashboardToFolder,
    moveThreadToFolder: folderResolver.moveThreadToFolder,
    moveSpreadsheetToFolder: folderResolver.moveSpreadsheetToFolder,
    reorderFolders: folderResolver.reorderFolders,

    // Permission Overrides
    updateProjectPermissionOverrides:
      permissionOverrideResolver.updateProjectPermissionOverrides,

    // BYOK
    setProjectLlmKey: byokResolver.setProjectLlmKey,
    clearProjectLlmKey: byokResolver.clearProjectLlmKey,

    // Project Members
    addProjectMember: projectMemberResolver.addProjectMember,
    updateProjectMemberRole: projectMemberResolver.updateProjectMemberRole,
    removeProjectMember: projectMemberResolver.removeProjectMember,

    // Spreadsheets
    createSpreadsheet: spreadsheetResolver.createSpreadsheet,
    updateSpreadsheet: spreadsheetResolver.updateSpreadsheet,
    deleteSpreadsheet: spreadsheetResolver.deleteSpreadsheet,
    previewSpreadsheetData: spreadsheetResolver.previewSpreadsheetData,
    saveSpreadsheetWithHistory: spreadsheetResolver.saveSpreadsheetWithHistory,
    restoreSpreadsheetVersion: spreadsheetResolver.restoreSpreadsheetVersion,
    duplicateSpreadsheet: spreadsheetResolver.duplicateSpreadsheet,
  },
  ThreadResponse: askingResolver.getThreadResponseNestedResolver(),
  DetailStep: askingResolver.getDetailStepNestedResolver(),
  ResultCandidate: askingResolver.getResultCandidateNestedResolver(),

  // Handle struct type to record for UI
  DiagramModelField: { type: convertColumnType },
  DiagramModelNestedField: { type: convertColumnType },
  CompactColumn: { type: convertColumnType },
  FieldInfo: { type: convertColumnType },
  DetailedColumn: { type: convertColumnType },
  DetailedNestedColumn: { type: convertColumnType },
  DetailedChangeColumn: { type: convertColumnType },

  // Add this line to include the SqlPair nested resolver
  SqlPair: sqlPairResolver.getSqlPairNestedResolver(),

  // Add ApiHistoryResponse nested resolvers
  ApiHistoryResponse: apiHistoryResolver.getApiHistoryNestedResolver(),

  // Data Security nested resolvers
  RlsPolicy: rlsPolicyResolver.getRlsPolicyNestedResolver(),
  SessionProperty: rlsPolicyResolver.getSessionPropertyNestedResolver(),

  // Folder nested resolvers
  Folder: folderResolver.getFolderNestedResolver(),
};

export default resolvers;
