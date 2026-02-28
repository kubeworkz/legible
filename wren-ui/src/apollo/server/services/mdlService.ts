import { MDLBuilder, RlsPolicyWithJoins } from '../mdl/mdlBuilder';
import {
  IModelNestedColumnRepository,
  IModelColumnRepository,
  IModelRepository,
  IProjectRepository,
  IRelationRepository,
  IViewRepository,
} from '../repositories';
import { IRlsPolicyRepository } from '../repositories/rlsPolicyRepository';
import { ISessionPropertyRepository } from '../repositories/sessionPropertyRepository';
import { Manifest } from '../mdl/type';

export interface MakeCurrentModelMDLResult {
  manifest: Manifest;
  mdlBuilder: MDLBuilder;
}
export interface IMDLService {
  makeCurrentModelMDL(projectId?: number): Promise<MakeCurrentModelMDLResult>;
}

export class MDLService implements IMDLService {
  private projectRepository: IProjectRepository;
  private modelRepository: IModelRepository;
  private modelColumnRepository: IModelColumnRepository;
  private modelNestedColumnRepository: IModelNestedColumnRepository;
  private relationRepository: IRelationRepository;
  private viewRepository: IViewRepository;
  private rlsPolicyRepository: IRlsPolicyRepository;
  private sessionPropertyRepository: ISessionPropertyRepository;

  constructor({
    projectRepository,
    modelRepository,
    modelColumnRepository,
    modelNestedColumnRepository,
    relationRepository,
    viewRepository,
    rlsPolicyRepository,
    sessionPropertyRepository,
  }: {
    projectRepository: IProjectRepository;
    modelRepository: IModelRepository;
    modelColumnRepository: IModelColumnRepository;
    modelNestedColumnRepository: IModelNestedColumnRepository;
    relationRepository: IRelationRepository;
    viewRepository: IViewRepository;
    rlsPolicyRepository: IRlsPolicyRepository;
    sessionPropertyRepository: ISessionPropertyRepository;
  }) {
    this.projectRepository = projectRepository;
    this.modelRepository = modelRepository;
    this.modelColumnRepository = modelColumnRepository;
    this.modelNestedColumnRepository = modelNestedColumnRepository;
    this.relationRepository = relationRepository;
    this.viewRepository = viewRepository;
    this.rlsPolicyRepository = rlsPolicyRepository;
    this.sessionPropertyRepository = sessionPropertyRepository;
  }

  public async makeCurrentModelMDL(projectId?: number) {
    const project = await this.projectRepository.getCurrentProject(projectId);
    const projId = project.id;
    const models = await this.modelRepository.findAllBy({ projectId: projId });
    const modelIds = models.map((m) => m.id);
    const columns =
      await this.modelColumnRepository.findColumnsByModelIds(modelIds);
    const modelNestedColumns =
      await this.modelNestedColumnRepository.findNestedColumnsByModelIds(
        modelIds,
      );
    const relations = await this.relationRepository.findRelationInfoBy({
      projectId: projId,
    });
    const views = await this.viewRepository.findAllBy({ projectId: projId });
    const relatedModels = models;
    const relatedColumns = columns;
    const relatedRelations = relations;

    // Fetch RLS policies and session properties for the project
    const [rawPolicies, sessionProperties] = await Promise.all([
      this.rlsPolicyRepository.findAllByProjectId(projId),
      this.sessionPropertyRepository.findAllByProjectId(projId),
    ]);

    // Enrich each policy with its model IDs and session property IDs
    const rlsPolicies: RlsPolicyWithJoins[] = await Promise.all(
      rawPolicies.map(async (policy) => {
        const [policyModelIds, policySessionPropertyIds] = await Promise.all([
          this.rlsPolicyRepository.findModelIdsByPolicyId(policy.id),
          this.rlsPolicyRepository.findSessionPropertyIdsByPolicyId(policy.id),
        ]);
        return {
          ...policy,
          modelIds: policyModelIds,
          sessionPropertyIds: policySessionPropertyIds,
        };
      }),
    );

    const mdlBuilder = new MDLBuilder({
      project,
      models,
      columns,
      nestedColumns: modelNestedColumns,
      relations,
      views,
      relatedModels,
      relatedColumns,
      relatedRelations,
      rlsPolicies,
      sessionProperties,
    });
    return { manifest: mdlBuilder.build(), mdlBuilder };
  }
}
