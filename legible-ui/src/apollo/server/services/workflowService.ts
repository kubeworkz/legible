import {
  Workflow,
  WorkflowVersion,
  IWorkflowRepository,
  IWorkflowVersionRepository,
} from '@server/repositories/workflowRepository';
import { getLogger } from '@server/utils';

const logger = getLogger('WorkflowService');

export interface CreateWorkflowInput {
  name: string;
  description?: string;
  graph?: { nodes: any[]; edges: any[] };
  variables?: Array<{ name: string; type: string; default?: string; description?: string }>;
}

export interface UpdateWorkflowInput {
  description?: string;
  graph?: { nodes: any[]; edges: any[] };
  variables?: Array<{ name: string; type: string; default?: string; description?: string }>;
  status?: string;
}

export interface IWorkflowService {
  listWorkflows(projectId: number): Promise<Workflow[]>;
  getWorkflow(id: number): Promise<Workflow>;
  getWorkflowByName(projectId: number, name: string): Promise<Workflow>;
  createWorkflow(projectId: number, input: CreateWorkflowInput, userId?: number): Promise<Workflow>;
  updateWorkflow(id: number, input: UpdateWorkflowInput, userId?: number): Promise<Workflow>;
  deleteWorkflow(id: number): Promise<void>;
  publishWorkflow(id: number, userId?: number): Promise<Workflow>;
  archiveWorkflow(id: number): Promise<Workflow>;
  listVersions(workflowId: number): Promise<WorkflowVersion[]>;
  getVersion(id: number): Promise<WorkflowVersion>;
}

export class WorkflowService implements IWorkflowService {
  private readonly workflowRepo: IWorkflowRepository;
  private readonly versionRepo: IWorkflowVersionRepository;

  constructor({
    workflowRepository,
    workflowVersionRepository,
  }: {
    workflowRepository: IWorkflowRepository;
    workflowVersionRepository: IWorkflowVersionRepository;
  }) {
    this.workflowRepo = workflowRepository;
    this.versionRepo = workflowVersionRepository;
  }

  public async listWorkflows(projectId: number): Promise<Workflow[]> {
    return this.workflowRepo.findByProjectId(projectId);
  }

  public async getWorkflow(id: number): Promise<Workflow> {
    const workflow = await this.workflowRepo.findOneBy({ id } as Partial<Workflow>);
    if (!workflow) throw new Error(`Workflow not found: ${id}`);
    return workflow;
  }

  public async getWorkflowByName(
    projectId: number,
    name: string,
  ): Promise<Workflow> {
    const workflow = await this.workflowRepo.findByName(projectId, name);
    if (!workflow) throw new Error(`Workflow not found: ${name}`);
    return workflow;
  }

  public async createWorkflow(
    projectId: number,
    input: CreateWorkflowInput,
    userId?: number,
  ): Promise<Workflow> {
    const existing = await this.workflowRepo.findByName(projectId, input.name);
    if (existing) throw new Error(`Workflow "${input.name}" already exists`);

    const now = new Date().toISOString();
    const defaultGraph = input.graph || { nodes: [], edges: [] };

    const workflow = await this.workflowRepo.createOne({
      projectId,
      name: input.name,
      description: input.description || null,
      graph: defaultGraph,
      variables: input.variables || null,
      status: 'draft',
      currentVersion: 1,
      createdBy: userId || null,
      createdAt: now,
      updatedAt: now,
    });

    // Create initial version snapshot
    await this.versionRepo.createOne({
      workflowId: workflow.id,
      version: 1,
      graph: defaultGraph,
      variables: workflow.variables,
      changeNote: 'Initial version',
      createdBy: userId || null,
      createdAt: now,
    });

    logger.info(`Workflow created: ${workflow.id} (${workflow.name})`);
    return workflow;
  }

  public async updateWorkflow(
    id: number,
    input: UpdateWorkflowInput,
    userId?: number,
  ): Promise<Workflow> {
    const existing = await this.getWorkflow(id);
    const now = new Date().toISOString();

    const graphChanged =
      input.graph && JSON.stringify(input.graph) !== JSON.stringify(existing.graph);
    const nextVersion = graphChanged
      ? existing.currentVersion + 1
      : existing.currentVersion;

    const updated = await this.workflowRepo.updateOne(id, {
      ...input,
      currentVersion: nextVersion,
      updatedAt: now,
    });

    // Snapshot only when graph changes
    if (graphChanged) {
      await this.versionRepo.createOne({
        workflowId: id,
        version: nextVersion,
        graph: input.graph!,
        variables: input.variables ?? existing.variables,
        changeNote: `Version ${nextVersion}`,
        createdBy: userId || null,
        createdAt: now,
      });
      logger.info(`Workflow updated: ${id} → v${nextVersion}`);
    }

    return updated;
  }

  public async deleteWorkflow(id: number): Promise<void> {
    await this.getWorkflow(id);
    await this.workflowRepo.deleteOne(id);
    logger.info(`Workflow deleted: ${id}`);
  }

  public async publishWorkflow(
    id: number,
    userId?: number,
  ): Promise<Workflow> {
    const workflow = await this.getWorkflow(id);
    if (workflow.graph.nodes.length === 0) {
      throw new Error('Cannot publish a workflow with no nodes');
    }
    const now = new Date().toISOString();
    return this.workflowRepo.updateOne(id, {
      status: 'published',
      updatedAt: now,
    });
  }

  public async archiveWorkflow(id: number): Promise<Workflow> {
    await this.getWorkflow(id);
    const now = new Date().toISOString();
    return this.workflowRepo.updateOne(id, {
      status: 'archived',
      updatedAt: now,
    });
  }

  public async listVersions(workflowId: number): Promise<WorkflowVersion[]> {
    return this.versionRepo.findByWorkflowId(workflowId);
  }

  public async getVersion(id: number): Promise<WorkflowVersion> {
    const version = await this.versionRepo.findOneBy({ id } as Partial<WorkflowVersion>);
    if (!version) throw new Error(`Workflow version not found: ${id}`);
    return version;
  }
}
