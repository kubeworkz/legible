export enum Path {
  Home = '/projects/[projectId]/home',
  HomeDashboard = '/projects/[projectId]/home/dashboard',
  Thread = '/projects/[projectId]/home/[id]',
  Modeling = '/projects/[projectId]/modeling',
  Onboarding = '/projects/[projectId]/setup',
  OnboardingConnection = '/projects/[projectId]/setup/connection',
  OnboardingModels = '/projects/[projectId]/setup/models',
  OnboardingRelationships = '/projects/[projectId]/setup/relationships',
  Knowledge = '/projects/[projectId]/knowledge',
  KnowledgeQuestionSQLPairs = '/projects/[projectId]/knowledge/question-sql-pairs',
  KnowledgeInstructions = '/projects/[projectId]/knowledge/instructions',
  APIManagement = '/projects/[projectId]/api-management',
  APIManagementHistory = '/projects/[projectId]/api-management/history',
  Settings = '/projects/[projectId]/settings',
  SettingsGeneral = '/projects/[projectId]/settings/general',
  SettingsDataConnection = '/projects/[projectId]/settings/data-connection',
  SettingsDangerZone = '/projects/[projectId]/settings/danger-zone',
}

/**
 * Replace [projectId] in a Path template with the actual project ID.
 * Usage: buildPath(Path.Home, 123) => '/projects/123/home'
 */
export function buildPath(
  path: Path | string,
  projectId: number | string,
): string {
  return path.replace('[projectId]', String(projectId));
}
