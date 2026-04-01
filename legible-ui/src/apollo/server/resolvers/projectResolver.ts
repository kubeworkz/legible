import {
  AnalysisRelationInfo,
  DataSource,
  DataSourceName,
  DataSourceProperties,
  IContext,
  RelationData,
  RelationType,
  SampleDatasetData,
} from '../types';
import {
  trim,
  getLogger,
  replaceInvalidReferenceName,
  transformInvalidColumnName,
  handleNestedColumns,
} from '@server/utils';
import {
  DUCKDB_CONNECTION_INFO,
  Model,
  ModelColumn,
  Project,
} from '../repositories';
import {
  SampleDatasetName,
  SampleDatasetRelationship,
  buildInitSql,
  getRelations,
  sampleDatasets,
} from '@server/data';
import { snakeCase } from 'lodash';
import { CompactTable, ProjectData } from '../services';
import { ProjectRole } from '../repositories/projectMemberRepository';
import { DuckDBPrepareOptions } from '@server/adaptors/wrenEngineAdaptor';
import DataSourceSchemaDetector, {
  SchemaChangeType,
} from '@server/managers/dataSourceSchemaDetector';
import { encryptConnectionInfo } from '../dataSource';
import { TelemetryEvent } from '../telemetry/telemetry';
import { requireAuth, requireOrganization, requireProjectRead, requireProjectWrite, requireProjectAdmin } from '../utils/authGuard';
import {
  AuditCategory,
  AuditAction,
} from '@server/repositories/auditLogRepository';

const logger = getLogger('DataSourceResolver');
logger.level = 'debug';

export enum OnboardingStatusEnum {
  NOT_STARTED = 'NOT_STARTED',
  DATASOURCE_SAVED = 'DATASOURCE_SAVED',
  ONBOARDING_FINISHED = 'ONBOARDING_FINISHED',
  WITH_SAMPLE_DATASET = 'WITH_SAMPLE_DATASET',
}

export class ProjectResolver {
  constructor() {
    this.getSettings = this.getSettings.bind(this);
    this.updateCurrentProject = this.updateCurrentProject.bind(this);
    this.resetCurrentProject = this.resetCurrentProject.bind(this);
    this.saveDataSource = this.saveDataSource.bind(this);
    this.updateDataSource = this.updateDataSource.bind(this);
    this.listDataSourceTables = this.listDataSourceTables.bind(this);
    this.saveTables = this.saveTables.bind(this);
    this.autoGenerateRelation = this.autoGenerateRelation.bind(this);
    this.saveRelations = this.saveRelations.bind(this);
    this.getOnboardingStatus = this.getOnboardingStatus.bind(this);
    this.startSampleDataset = this.startSampleDataset.bind(this);
    this.triggerDataSourceDetection =
      this.triggerDataSourceDetection.bind(this);
    this.getSchemaChange = this.getSchemaChange.bind(this);
    this.getProjectRecommendationQuestions =
      this.getProjectRecommendationQuestions.bind(this);
    this.listProjects = this.listProjects.bind(this);
    this.getProject = this.getProject.bind(this);
    this.createProject = this.createProject.bind(this);
    this.updateProject = this.updateProject.bind(this);
    this.deleteProject = this.deleteProject.bind(this);
  }

  public async listProjects(_root: any, _arg: any, ctx: IContext) {
    requireAuth(ctx);
    const projects = await ctx.projectService.listProjects(ctx.organizationId);
    return projects.map((p) => this.formatProjectInfo(p));
  }

  public async getProject(
    _root: any,
    arg: { projectId: number },
    ctx: IContext,
  ) {
    requireAuth(ctx);
    const project = await ctx.projectService.getProjectById(arg.projectId);
    return this.formatProjectInfo(project);
  }

  public async createProject(
    _root: any,
    arg: { data: { displayName: string; language?: string; timezone?: string } },
    ctx: IContext,
  ) {
    requireAuth(ctx);
    requireOrganization(ctx);
    const { displayName, language, timezone } = arg.data;
    if (!displayName || displayName.trim().length === 0) {
      throw new Error('Project display name is required');
    }
    // Create a project without a data source — it will need setup afterward
    const projectValue: Record<string, any> = {
      displayName: displayName.trim(),
      catalog: 'wrenai',
      schema: 'public',
      language: language || 'EN',
    };
    if (timezone) {
      projectValue.timezone = timezone;
    }
    if (ctx.organizationId) {
      projectValue.organizationId = ctx.organizationId;
    }
    const project = await ctx.projectRepository.createOne(projectValue);
    logger.debug(`Project created: ${project.id}`);

    // Auto-assign the creator as project OWNER
    if (ctx.currentUser?.id) {
      await ctx.projectMemberService.addMember(
        project.id,
        ctx.currentUser.id,
        ProjectRole.OWNER,
      );
      logger.debug(`Assigned user ${ctx.currentUser.id} as project OWNER`);
    }

    ctx.auditLogService.log({
      userId: ctx.currentUser?.id,
      userEmail: ctx.currentUser?.email,
      clientIp: ctx.clientIp,
      organizationId: ctx.organizationId,
      projectId: project.id,
      category: AuditCategory.PROJECT,
      action: AuditAction.PROJECT_CREATED,
      targetType: 'project',
      targetId: project.id,
      detail: { displayName: displayName.trim() },
    });

    return this.formatProjectInfo(project);
  }

  public async updateProject(
    _root: any,
    arg: {
      projectId: number;
      data: { displayName?: string; language?: string; timezone?: string };
    },
    ctx: IContext,
  ) {
    const user = requireAuth(ctx);
    await ctx.projectMemberService.requireProjectRole(
      arg.projectId, user.id, [ProjectRole.OWNER], ctx.organizationId,
    );
    const { displayName, language, timezone } = arg.data;
    const updateData: Record<string, any> = {};
    if (displayName !== undefined && displayName !== null) {
      if (displayName.trim().length === 0) {
        throw new Error('Project display name cannot be empty');
      }
      updateData.displayName = displayName.trim();
    }
    if (language !== undefined && language !== null) {
      updateData.language = language;
    }
    if (timezone !== undefined && timezone !== null) {
      updateData.timezone = timezone;
    }
    if (Object.keys(updateData).length === 0) {
      throw new Error('No fields to update');
    }
    await ctx.projectRepository.updateOne(arg.projectId, updateData);
    const project = await ctx.projectService.getProjectById(arg.projectId);

    ctx.auditLogService.log({
      userId: user.id,
      userEmail: user.email,
      clientIp: ctx.clientIp,
      organizationId: ctx.organizationId,
      projectId: arg.projectId,
      category: AuditCategory.PROJECT,
      action: AuditAction.PROJECT_UPDATED,
      targetType: 'project',
      targetId: arg.projectId,
      detail: updateData,
    });

    return this.formatProjectInfo(project);
  }

  public async deleteProject(
    _root: any,
    arg: { projectId: number },
    ctx: IContext,
  ) {
    const user = requireAuth(ctx);
    await ctx.projectMemberService.requireProjectRole(
      arg.projectId, user.id, [ProjectRole.OWNER], ctx.organizationId,
    );
    const { projectId } = arg;

    const allProjects = await ctx.projectService.listProjects(ctx.organizationId);

    // Prevent deleting the last project in the organization
    if (allProjects.length <= 1) {
      throw new Error('Cannot delete the last project. Every organization must have at least one project.');
    }

    const project = await ctx.projectService.getProjectById(projectId);

    // Clean up all associated data
    await ctx.schemaChangeRepository.deleteAllBy({ projectId });
    await ctx.deployService.deleteAllByProjectId(projectId);
    await ctx.askingService.deleteAllByProjectId(projectId);
    await ctx.modelService.deleteAllViewsByProjectId(projectId);
    await ctx.modelService.deleteAllModelsByProjectId(projectId);
    await ctx.projectService.deleteProject(projectId);

    // Clean up AI service state
    try {
      await ctx.wrenAIAdaptor.delete(projectId);
    } catch (err) {
      logger.warn(
        `Failed to clean up AI service for project ${projectId}: ${err.message}`,
      );
    }

    logger.debug(`Project deleted: ${projectId}`);

    ctx.auditLogService.log({
      userId: user.id,
      userEmail: user.email,
      clientIp: ctx.clientIp,
      organizationId: ctx.organizationId,
      projectId,
      category: AuditCategory.PROJECT,
      action: AuditAction.PROJECT_DELETED,
      targetType: 'project',
      targetId: projectId,
      detail: { displayName: (project as any).displayName },
    });

    return true;
  }

  private formatProjectInfo(project: any) {
    return {
      id: project.id,
      type: project.type || null,
      displayName: project.displayName || `Project ${project.id}`,
      language: project.language || 'EN',
      timezone: project.timezone || null,
      sampleDataset: project.sampleDataset || null,
      createdAt: project.createdAt
        ? new Date(project.createdAt).toISOString()
        : new Date().toISOString(),
      updatedAt: project.updatedAt
        ? new Date(project.updatedAt).toISOString()
        : new Date().toISOString(),
    };
  }

  public async getSettings(_root: any, _arg: any, ctx: IContext) {
    await requireProjectRead(ctx);
    const project = await ctx.projectService.getCurrentProject(ctx.projectId);
    const generalConnectionInfo =
      ctx.projectService.getGeneralConnectionInfo(project);
    const dataSourceType = project.type;

    return {
      productVersion: ctx.config.wrenProductVersion || '',
      dataSource: {
        type: dataSourceType,
        properties: {
          displayName: project.displayName,
          ...generalConnectionInfo,
        } as DataSourceProperties,
        sampleDataset: project.sampleDataset,
      },
      language: project.language,
    };
  }

  public async getProjectRecommendationQuestions(
    _root: any,
    _arg: any,
    ctx: IContext,
  ) {
    await requireProjectRead(ctx);
    return ctx.projectService.getProjectRecommendationQuestions(ctx.projectId);
  }

  public async updateCurrentProject(
    _root: any,
    arg: { data: { language: string } },
    ctx: IContext,
  ) {
    await requireProjectWrite(ctx);
    const { language } = arg.data;
    const project = await ctx.projectService.getCurrentProject(ctx.projectId);
    await ctx.projectRepository.updateOne(project.id, {
      language,
    });

    // only generating for user's data source
    if (project.sampleDataset === null) {
      await ctx.projectService.generateProjectRecommendationQuestions(
        ctx.projectId,
      );
    }
    return true;
  }

  public async resetCurrentProject(_root: any, _arg: any, ctx: IContext) {
    await requireProjectAdmin(ctx);
    let project;
    try {
      project = await ctx.projectService.getCurrentProject(ctx.projectId);
    } catch {
      // no project found
      return true;
    }
    const eventName = TelemetryEvent.SETTING_RESET_PROJECT;
    try {
      const id = project.id;
      await ctx.schemaChangeRepository.deleteAllBy({ projectId: id });
      await ctx.deployService.deleteAllByProjectId(id);
      await ctx.askingService.deleteAllByProjectId(id);
      await ctx.modelService.deleteAllViewsByProjectId(id);
      await ctx.modelService.deleteAllModelsByProjectId(id);
      await ctx.projectService.deleteProject(id);
      await ctx.wrenAIAdaptor.delete(id);

      // telemetry
      ctx.telemetry.sendEvent(eventName, {
        projectId: id,
        dataSourceType: project.type,
      });
    } catch (err: any) {
      ctx.telemetry.sendEvent(
        eventName,
        { dataSourceType: project.type, error: err.message },
        err.extensions?.service,
        false,
      );
      throw err;
    }

    return true;
  }

  public async startSampleDataset(
    _root: any,
    _arg: { data: SampleDatasetData },
    ctx: IContext,
  ) {
    await requireProjectWrite(ctx);
    const { name } = _arg.data;
    const dataset = sampleDatasets[snakeCase(name)];
    if (!dataset) {
      throw new Error('Sample dataset not found');
    }
    if (!(name in SampleDatasetName)) {
      throw new Error('Invalid sample dataset name');
    }
    const eventName = TelemetryEvent.CONNECTION_START_SAMPLE_DATASET;
    const eventProperties = {
      datasetName: name,
    };
    try {
      const initSql = buildInitSql(name as SampleDatasetName);
      const duckdbDatasourceProperties = {
        initSql,
        extensions: [],
        configurations: {},
      };

      let projectId!: number;
      let project!: Project;

      // Check if the current project is already configured (switching datasets).
      // If so, reset its data in-place instead of creating a new project.
      let existingProject: Project | null = null;
      if (ctx.projectId) {
        try {
          existingProject = await ctx.projectService.getCurrentProject(ctx.projectId);
          if (existingProject && existingProject.type) {
            // Project already has a data source — reset it in-place
            const pid = existingProject.id;
            await ctx.schemaChangeRepository.deleteAllBy({ projectId: pid });
            await ctx.deployService.deleteAllByProjectId(pid);
            await ctx.askingService.deleteAllByProjectId(pid);
            await ctx.modelService.deleteAllViewsByProjectId(pid);
            await ctx.modelService.deleteAllModelsByProjectId(pid);
            await ctx.dashboardRepository.deleteAllBy({ projectId: pid });
            await ctx.spreadsheetRepository.deleteAllBy({ projectId: pid });
            try { await ctx.wrenAIAdaptor.delete(pid); } catch { /* ignore */ }

            // Reconfigure the project as DuckDB
            const connectionInfo = {
              initSql: duckdbDatasourceProperties.initSql,
              extensions: duckdbDatasourceProperties.extensions,
              configurations: duckdbDatasourceProperties.configurations,
            };
            const encrypted = encryptConnectionInfo(DataSourceName.DUCKDB, connectionInfo as any);
            project = await ctx.projectService.updateProject(pid, {
              type: DataSourceName.DUCKDB,
              connectionInfo: encrypted,
            } as Partial<Project>);
            projectId = pid;
          }
        } catch {
          // No project found for ctx.projectId — fall through to create new
        }
      }

      // If we didn't reuse an existing project, create via saveDataSource
      if (!existingProject || !existingProject.type) {
        // Include displayName so the project gets a proper name instead of null.
        // Preserve the existing project's name if available, otherwise default.
        const dsDisplayName =
          existingProject?.displayName || 'Default Project';
        const dsResult = await this.saveDataSource(
          _root,
          {
            data: {
              type: DataSourceName.DUCKDB,
              properties: {
                ...duckdbDatasourceProperties,
                displayName: dsDisplayName,
              },
            } as DataSource,
          },
          ctx,
        );
        projectId = dsResult.projectId;
        project = await ctx.projectService.getProjectById(projectId);
      } else {
        // Reused existing project — set up DuckDB environment manually
        // (saveDataSource does this internally for the new-project path)
        await this.buildDuckDbEnvironment(ctx, {
          initSql: duckdbDatasourceProperties.initSql,
          extensions: duckdbDatasourceProperties.extensions,
          configurations: duckdbDatasourceProperties.configurations,
        });
      }

      // Update ctx.projectId so subsequent calls use the correct project
      ctx.projectId = projectId;

      // Ensure the current user is a project OWNER (reuse path may skip saveDataSource)
      if (ctx.currentUser?.id) {
        const existing = await ctx.projectMemberRepository.findByProjectAndUser(
          projectId,
          ctx.currentUser.id,
        );
        if (!existing) {
          await ctx.projectMemberService.addMember(
            projectId,
            ctx.currentUser.id,
            ProjectRole.OWNER,
          );
        }
      }

      // list all the tables in the data source
      const tables = await this.listDataSourceTables(_root, _arg, ctx);
      const tableNames = tables.map((table) => table.name);

      // save tables as model and modelColumns
      await this.overwriteModelsAndColumns(tableNames, ctx, project);

      await ctx.modelService.updatePrimaryKeys(dataset.tables, projectId);
      await ctx.modelService.batchUpdateModelProperties(
        dataset.tables,
        projectId,
      );
      await ctx.modelService.batchUpdateColumnProperties(
        dataset.tables,
        projectId,
      );

      // save relations
      const relations = getRelations(name as SampleDatasetName);
      const models = await ctx.modelRepository.findAllBy({
        projectId,
      });
      const columns = await ctx.modelColumnRepository.findAll();
      const mappedRelations = this.buildRelationInput(
        relations,
        models,
        columns,
      );
      await ctx.modelService.saveRelations(mappedRelations, projectId);

      // mark current project as using sample dataset
      await ctx.projectRepository.updateOne(project.id, {
        sampleDataset: name,
      });
      await this.deploy(ctx);

      // Seed sample content (dashboards, spreadsheets, threads) if defined
      if (dataset.sampleContent) {
        try {
          await this.seedSampleContent(dataset.sampleContent, projectId, ctx);
        } catch (seedErr: any) {
          // Log but don't fail the overall setup if seeding fails
          console.warn('Failed to seed sample content:', seedErr.message);
        }
      }

      // telemetry
      ctx.telemetry.sendEvent(eventName, eventProperties);
      return { name, projectId };
    } catch (err: any) {
      ctx.telemetry.sendEvent(
        eventName,
        { ...eventProperties, error: err.message },
        err.extensions?.service,
        false,
      );
      throw err;
    }
  }

  private async seedSampleContent(
    content: import('@server/data/sample').SampleContent,
    projectId: number,
    ctx: IContext,
  ) {
    // Resolve or create the public folder for this project
    let folderId: number | undefined;
    try {
      const userId = ctx.currentUser?.id;
      if (userId) {
        const systemFolders = await ctx.folderService.ensureSystemFolders(projectId, userId);
        folderId = systemFolders.public.id;
      }
    } catch {
      // If folder creation fails, items will have no folder
    }

    // Create sample dashboards with items
    if (content.dashboards) {
      for (const dash of content.dashboards) {
        const dashboard = await ctx.dashboardService.createDashboard(projectId, {
          name: dash.name,
          folderId,
        });

        // Create dashboard items with explicit layouts
        if (dash.items) {
          for (const item of dash.items) {
            await ctx.dashboardItemRepository.createOne({
              dashboardId: dashboard.id,
              type: item.type as any,
              displayName: item.displayName,
              detail: {
                sql: item.sql,
                chartSchema: item.chartSchema || undefined,
              },
              layout: item.layout,
            });
          }
        }
      }
    }

    // Create sample spreadsheets
    if (content.spreadsheets) {
      for (const sheet of content.spreadsheets) {
        await ctx.spreadsheetService.createSpreadsheet(projectId, {
          name: sheet.name,
          folderId,
          sourceSql: sheet.sql,
        });
      }
    }

    // Create sample threads (with pre-written SQL, no AI task needed)
    if (content.threads) {
      for (const thread of content.threads) {
        await ctx.askingService.createThread(
          {
            question: thread.question,
            sql: thread.sql,
            // breakdownDetail with FINISHED status (no steps) lets the
            // View SQL tab show the pre-written parent.sql.
            breakdownDetail: {
              queryId: '',
              status: 'FINISHED',
              description: '',
            },
            // answerDetail with FINISHED status, content, and numRowsUsedInLLM
            // displays a pre-written text answer in the Answer tab, matching
            // WrenAI cloud behavior. numRowsUsedInLLM > 0 shows "View results".
            answerDetail: {
              status: 'FINISHED',
              content: thread.answer || null,
              numRowsUsedInLLM: thread.answer ? 1 : 0,
            },
            // chartDetail with FINISHED status and Vega-Lite schema renders a
            // pre-built chart in the Chart tab without triggering the AI service.
            ...(thread.chartDetail && {
              chartDetail: {
                queryId: '',
                status: 'FINISHED',
                description: thread.chartDetail.description,
                chartType: thread.chartDetail.chartType,
                chartSchema: thread.chartDetail.chartSchema,
              },
            }),
          },
          projectId,
          folderId,
        );
      }
    }
  }

  public async getOnboardingStatus(_root: any, _arg: any, ctx: IContext) {
    await requireProjectRead(ctx);
    let project: Project | null;
    try {
      project = await ctx.projectRepository.getCurrentProject(ctx.projectId);
    } catch (_err: any) {
      return {
        status: OnboardingStatusEnum.NOT_STARTED,
      };
    }
    // A project without a data source type hasn't completed connection setup
    if (!project.type) {
      return {
        status: OnboardingStatusEnum.NOT_STARTED,
      };
    }
    const { id, sampleDataset } = project;
    if (sampleDataset) {
      return {
        status: OnboardingStatusEnum.WITH_SAMPLE_DATASET,
      };
    }
    const models = await ctx.modelRepository.findAllBy({ projectId: id });
    if (!models.length) {
      return {
        status: OnboardingStatusEnum.DATASOURCE_SAVED,
      };
    } else {
      return {
        status: OnboardingStatusEnum.ONBOARDING_FINISHED,
      };
    }
  }

  public async saveDataSource(
    _root: any,
    args: {
      data: DataSource;
    },
    ctx: IContext,
  ) {
    await requireProjectWrite(ctx);
    const { type, properties } = args.data;

    const { displayName, ...connectionInfo } = properties;

    // If the org has an unconfigured project (Default Project with no type),
    // update it instead of creating a new one. This activates the placeholder
    // project created at signup.
    let project: Project;
    let activatedExisting = false;
    if (ctx.organizationId) {
      const orgProjects = await ctx.projectRepository.listProjects(ctx.organizationId);
      const unconfigured = orgProjects.find((p) => !p.type);
      if (unconfigured) {
        const encrypted = encryptConnectionInfo(type, connectionInfo as any);
        project = await ctx.projectService.updateProject(unconfigured.id, {
          displayName: displayName || unconfigured.displayName,
          type,
          connectionInfo: encrypted,
        } as Partial<Project>);
        activatedExisting = true;
        logger.debug(`Default project ${unconfigured.id} activated with data source.`);
      } else {
        project = await ctx.projectService.createProject({
          displayName: displayName || 'Default Project',
          type,
          connectionInfo,
        } as ProjectData, ctx.organizationId);
        logger.debug(`Project created.`);
      }
    } else {
      project = await ctx.projectService.createProject({
        displayName: displayName || 'Default Project',
        type,
        connectionInfo,
      } as ProjectData, ctx.organizationId);
      logger.debug(`Project created.`);
    }

    // init dashboard
    logger.debug('Dashboard init...');
    await ctx.dashboardService.initDashboard(project.id);
    logger.debug('Dashboard created.');

    // Auto-assign the creator as project OWNER (if not already assigned)
    if (ctx.currentUser?.id) {
      const existing = await ctx.projectMemberRepository.findByProjectAndUser(
        project.id,
        ctx.currentUser.id,
      );
      if (!existing) {
        await ctx.projectMemberService.addMember(
          project.id,
          ctx.currentUser.id,
          ProjectRole.OWNER,
        );
        logger.debug(`Assigned user ${ctx.currentUser.id} as project OWNER`);
      }
    }

    const eventName = TelemetryEvent.CONNECTION_SAVE_DATA_SOURCE;
    const eventProperties = {
      dataSourceType: type,
    };

    // try to connect to the data source
    try {
      // handle duckdb connection
      if (type === DataSourceName.DUCKDB) {
        connectionInfo as DUCKDB_CONNECTION_INFO;
        await this.buildDuckDbEnvironment(ctx, {
          initSql: connectionInfo.initSql,
          extensions: connectionInfo.extensions,
          configurations: connectionInfo.configurations,
        });
      } else {
        // handle other data source
        await ctx.projectService.getProjectDataSourceTables(project);
        const version =
          await ctx.projectService.getProjectDataSourceVersion(project);
        await ctx.projectService.updateProject(project.id, {
          version,
        });
        logger.debug(`Data source tables fetched`);
      }
      // telemetry
      ctx.telemetry.sendEvent(eventName, eventProperties);
    } catch (err) {
      logger.error(
        'Failed to get project tables',
        JSON.stringify(err, null, 2),
      );
      if (activatedExisting) {
        // Revert the Default Project back to unconfigured state
        await ctx.projectService.updateProject(project.id, {
          type: null,
          connectionInfo: null,
        } as Partial<Project>);
      } else {
        await ctx.projectRepository.deleteOne(project.id);
      }
      ctx.telemetry.sendEvent(
        eventName,
        { eventProperties, error: err.message },
        err.extensions?.service,
        false,
      );
      throw err;
    }

    return {
      type: project.type,
      properties: {
        displayName: project.displayName,
        ...ctx.projectService.getGeneralConnectionInfo(project),
      },
      projectId: project.id,
    };
  }

  public async updateDataSource(
    _root: any,
    args: { data: DataSource },
    ctx: IContext,
  ) {
    await requireProjectWrite(ctx);
    const { properties } = args.data;
    const { displayName, ...connectionInfo } = properties;
    const project = await ctx.projectService.getCurrentProject(ctx.projectId);
    const dataSourceType = project.type;

    // only new connection info needed to encrypt
    const toUpdateConnectionInfo = encryptConnectionInfo(
      dataSourceType,
      connectionInfo as any,
    );

    if (dataSourceType === DataSourceName.DUCKDB) {
      // prepare duckdb environment in wren-engine
      const { initSql, extensions, configurations } =
        toUpdateConnectionInfo as DUCKDB_CONNECTION_INFO;
      await this.buildDuckDbEnvironment(ctx, {
        initSql,
        extensions,
        configurations,
      });
    } else {
      const updatedProject = {
        ...project,
        displayName,
        connectionInfo: {
          ...project.connectionInfo,
          ...toUpdateConnectionInfo,
        },
      } as Project;

      await ctx.projectService.getProjectDataSourceTables(updatedProject);
      logger.debug(`Data source tables fetched`);
    }
    const updatedProject = await ctx.projectRepository.updateOne(project.id, {
      displayName,
      connectionInfo: { ...project.connectionInfo, ...toUpdateConnectionInfo },
    });
    return {
      type: updatedProject.type,
      properties: {
        displayName: updatedProject.displayName,
        ...ctx.projectService.getGeneralConnectionInfo(updatedProject),
      },
    };
  }

  public async listDataSourceTables(_root: any, _arg, ctx: IContext) {
    await requireProjectRead(ctx);
    return await ctx.projectService.getProjectDataSourceTables(
      undefined,
      ctx.projectId,
    );
  }

  public async saveTables(
    _root: any,
    arg: {
      data: { tables: string[] };
    },
    ctx: IContext,
  ) {
    await requireProjectWrite(ctx);
    const eventName = TelemetryEvent.CONNECTION_SAVE_TABLES;

    // get current project
    const project = await ctx.projectService.getCurrentProject(ctx.projectId);
    try {
      // delete existing models and columns
      const { models, columns } = await this.overwriteModelsAndColumns(
        arg.data.tables,
        ctx,
        project,
      );
      // telemetry
      ctx.telemetry.sendEvent(eventName, {
        dataSourceType: project.type,
        tablesCount: models.length,
        columnsCount: columns.length,
      });

      // async deploy to wren-engine and ai service
      this.deploy(ctx);
      return { models: models, columns };
    } catch (err: any) {
      ctx.telemetry.sendEvent(
        eventName,
        { dataSourceType: project.type, error: err.message },
        err.extensions?.service,
        false,
      );
      throw err;
    }
  }

  public async autoGenerateRelation(_root: any, _arg: any, ctx: IContext) {
    await requireProjectRead(ctx);
    const project = await ctx.projectService.getCurrentProject(ctx.projectId);

    // get models and columns
    const models = await ctx.modelRepository.findAllBy({
      projectId: project.id,
    });
    const modelIds = models.map((m) => m.id);
    const columns =
      await ctx.modelColumnRepository.findColumnsByModelIds(modelIds);
    const constraints =
      await ctx.projectService.getProjectSuggestedConstraint(project);

    // generate relation
    const relations = [];
    for (const constraint of constraints) {
      const {
        constraintTable,
        constraintColumn,
        constraintedTable,
        constraintedColumn,
      } = constraint;
      // validate tables and columns exists in our models and model columns
      const fromModel = models.find(
        (m) => m.sourceTableName === constraintTable,
      );
      const toModel = models.find(
        (m) => m.sourceTableName === constraintedTable,
      );
      if (!fromModel || !toModel) {
        continue;
      }
      const fromColumn = columns.find(
        (c) =>
          c.modelId === fromModel.id && c.sourceColumnName === constraintColumn,
      );
      const toColumn = columns.find(
        (c) =>
          c.modelId === toModel.id && c.sourceColumnName === constraintedColumn,
      );
      if (!fromColumn || !toColumn) {
        continue;
      }
      // create relation
      const relation: AnalysisRelationInfo = {
        // upper case the first letter of the sourceTableName
        name: constraint.constraintName,
        fromModelId: fromModel.id,
        fromModelReferenceName: fromModel.referenceName,
        fromColumnId: fromColumn.id,
        fromColumnReferenceName: fromColumn.referenceName,
        toModelId: toModel.id,
        toModelReferenceName: toModel.referenceName,
        toColumnId: toColumn.id,
        toColumnReferenceName: toColumn.referenceName,
        // TODO: add join type
        type: RelationType.ONE_TO_MANY,
      };
      relations.push(relation);
    }
    // group by model
    return models.map(({ id, displayName, referenceName }) => ({
      id,
      displayName,
      referenceName,
      relations: relations.filter(
        (relation) =>
          relation.fromModelId === id &&
          // exclude self-referential relationship
          relation.toModelId !== relation.fromModelId,
      ),
    }));
  }

  public async saveRelations(
    _root: any,
    arg: { data: { relations: RelationData[] } },
    ctx: IContext,
  ) {
    await requireProjectWrite(ctx);
    const eventName = TelemetryEvent.CONNECTION_SAVE_RELATION;
    try {
      const savedRelations = await ctx.modelService.saveRelations(
        arg.data.relations,
        ctx.projectId,
      );
      // async deploy
      this.deploy(ctx);
      ctx.telemetry.sendEvent(eventName, {
        relationCount: savedRelations.length,
      });
      return savedRelations;
    } catch (err: any) {
      ctx.telemetry.sendEvent(
        eventName,
        { error: err.message },
        err.extensions?.service,
        false,
      );
      throw err;
    }
  }

  public async getSchemaChange(_root: any, _arg: any, ctx: IContext) {
    await requireProjectRead(ctx);
    const project = await ctx.projectService.getCurrentProject(ctx.projectId);
    const lastSchemaChange =
      await ctx.schemaChangeRepository.findLastSchemaChange(project.id);

    if (!lastSchemaChange) {
      return {
        deletedTables: null,
        deletedColumns: null,
        modifiedColumns: null,
        lastSchemaChangeTime: null,
      };
    }

    const models = await ctx.modelRepository.findAllBy({
      projectId: project.id,
    });
    const modelIds = models.map((model) => model.id);
    const modelColumns =
      await ctx.modelColumnRepository.findColumnsByModelIds(modelIds);

    const modelRelationships = await ctx.relationRepository.findRelationInfoBy({
      modelIds,
    });

    const schemaDetector = new DataSourceSchemaDetector({
      ctx,
      projectId: project.id,
    });

    const resolves = lastSchemaChange.resolve;
    const unresolvedChanges = Object.keys(resolves).reduce((result, key) => {
      const isResolved = resolves[key];
      const changes = lastSchemaChange.change[key];
      // return if resolved or no changes
      if (isResolved || !changes) return result;

      // Mapping with affected models and columns and affected calculated fields and relationships data into schema change
      const affecteds = schemaDetector.getAffectedResources(changes, {
        models,
        modelColumns,
        modelRelationships,
      });

      const affectedChanges = affecteds.length ? affecteds : null;
      return { ...result, [key]: affectedChanges };
    }, {});

    return {
      ...unresolvedChanges,
      lastSchemaChangeTime: lastSchemaChange.createdAt,
    };
  }

  public async triggerDataSourceDetection(
    _root: any,
    _arg: any,
    ctx: IContext,
  ) {
    await requireProjectWrite(ctx);
    const project = await ctx.projectService.getCurrentProject(ctx.projectId);
    const schemaDetector = new DataSourceSchemaDetector({
      ctx,
      projectId: project.id,
    });
    const eventName = TelemetryEvent.MODELING_DETECT_SCHEMA_CHANGE;
    try {
      const hasSchemaChange = await schemaDetector.detectSchemaChange();
      ctx.telemetry.sendEvent(eventName, { hasSchemaChange });
      return hasSchemaChange;
    } catch (error: any) {
      ctx.telemetry.sendEvent(
        eventName,
        { error },
        error.extensions?.service,
        false,
      );
      throw error;
    }
  }

  public async resolveSchemaChange(
    _root: any,
    arg: { where: { type: SchemaChangeType } },
    ctx: IContext,
  ) {
    await requireProjectWrite(ctx);
    const { type } = arg.where;
    const project = await ctx.projectService.getCurrentProject(ctx.projectId);
    const schemaDetector = new DataSourceSchemaDetector({
      ctx,
      projectId: project.id,
    });
    const eventName = TelemetryEvent.MODELING_RESOLVE_SCHEMA_CHANGE;
    try {
      await schemaDetector.resolveSchemaChange(type);
      ctx.telemetry.sendEvent(eventName, { type });
    } catch (error) {
      ctx.telemetry.sendEvent(
        eventName,
        { type, error },
        error.extensions?.service,
        false,
      );
      throw error;
    }
    return true;
  }

  private async deploy(ctx: IContext) {
    const project = await ctx.projectService.getCurrentProject(ctx.projectId);
    const { manifest } = await ctx.mdlService.makeCurrentModelMDL(
      ctx.projectId,
    );
    const deployRes = await ctx.deployService.deploy(manifest, project.id);

    // only generating for user's data source
    if (project.sampleDataset === null) {
      await ctx.projectService.generateProjectRecommendationQuestions(
        ctx.projectId,
      );
    }
    return deployRes;
  }

  private buildRelationInput(
    relations: SampleDatasetRelationship[],
    models: Model[],
    columns: ModelColumn[],
  ) {
    const relationInput = relations.map((relation) => {
      const { fromModelName, fromColumnName, toModelName, toColumnName, type } =
        relation;
      const fromModelId = models.find(
        (model) => model.sourceTableName === fromModelName,
      )?.id;
      const toModelId = models.find(
        (model) => model.sourceTableName === toModelName,
      )?.id;
      if (!fromModelId || !toModelId) {
        throw new Error(
          `Model not found, fromModelName "${fromModelName}" to toModelName: "${toModelName}"`,
        );
      }

      const fromColumnId = columns.find(
        (column) =>
          column.referenceName === fromColumnName &&
          column.modelId === fromModelId,
      )?.id;
      const toColumnId = columns.find(
        (column) =>
          column.referenceName === toColumnName && column.modelId === toModelId,
      )?.id;
      if (!fromColumnId || !toColumnId) {
        throw new Error(
          `Column not found fromColumnName: ${fromColumnName} toColumnName: ${toColumnName}`,
        );
      }
      return {
        fromModelId,
        fromColumnId,
        toModelId,
        toColumnId,
        type,
        description: relation.description,
      } as RelationData;
    });
    return relationInput;
  }

  private async overwriteModelsAndColumns(
    tables: string[],
    ctx: IContext,
    project: Project,
  ) {
    // delete existing models and columns
    await ctx.modelService.deleteAllModelsByProjectId(project.id);

    const compactTables: CompactTable[] =
      await ctx.projectService.getProjectDataSourceTables(project);

    const selectedTables = compactTables.filter((table) =>
      tables.includes(table.name),
    );

    // create models
    const modelValues = selectedTables.map((table) => {
      const properties = table?.properties;
      // compactTable contain schema and catalog, these information are for building tableReference in mdl
      const model = {
        projectId: project.id,
        displayName: table.name, // use table name as displayName, referenceName and tableName
        referenceName: replaceInvalidReferenceName(table.name),
        sourceTableName: table.name,
        cached: false,
        refreshTime: null,
        properties: properties ? JSON.stringify(properties) : null,
      } as Partial<Model>;
      return model;
    });
    const models = await ctx.modelRepository.createMany(modelValues);

    // create columns
    const columnValues = selectedTables.flatMap((table) => {
      const compactColumns = table.columns;
      const primaryKey = table.primaryKey;
      const model = models.find((m) => m.sourceTableName === table.name);
      return compactColumns.map(
        (column) =>
          ({
            modelId: model.id,
            isCalculated: false,
            displayName: column.name,
            referenceName: transformInvalidColumnName(column.name),
            sourceColumnName: column.name,
            type: column.type || 'string',
            notNull: column.notNull || false,
            isPk: primaryKey === column.name,
            properties: column.properties
              ? JSON.stringify(column.properties)
              : null,
          }) as Partial<ModelColumn>,
      );
    });
    const columns = await ctx.modelColumnRepository.createMany(columnValues);

    // create nested columns
    const compactColumns = selectedTables.flatMap((table) => table.columns);
    const nestedColumnValues = compactColumns.flatMap((compactColumn) => {
      const column = columns.find(
        (c) => c.sourceColumnName === compactColumn.name,
      );
      return handleNestedColumns(compactColumn, {
        modelId: column.modelId,
        columnId: column.id,
        sourceColumnName: column.sourceColumnName,
      });
    });
    await ctx.modelNestedColumnRepository.createMany(nestedColumnValues);

    return { models, columns };
  }

  private concatInitSql(initSql: string, extensions: string[]) {
    const installExtensions = extensions
      .map((ext) => `INSTALL ${ext};`)
      .join('\n');
    return trim(`${installExtensions}\n${initSql}`);
  }

  private async buildDuckDbEnvironment(
    ctx: IContext,
    options: {
      initSql: string;
      extensions: string[];
      configurations: Record<string, any>;
    },
  ): Promise<void> {
    const { initSql, extensions, configurations } = options;
    const initSqlWithExtensions = this.concatInitSql(initSql, extensions);
    await ctx.wrenEngineAdaptor.prepareDuckDB({
      sessionProps: configurations,
      initSql: initSqlWithExtensions,
    } as DuckDBPrepareOptions);

    // check can list dataset table
    await ctx.wrenEngineAdaptor.listTables();

    // patch wren-engine config
    const config = {
      'wren.datasource.type': 'duckdb',
    };
    await ctx.wrenEngineAdaptor.patchConfig(config);
  }
}
