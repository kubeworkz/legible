import {
  Agent,
  AgentAuditLog,
  IAgentRepository,
  IAgentAuditLogRepository,
} from '@server/repositories/agentRepository';
import { getLogger } from '@server/utils';

const logger = getLogger('AgentService');

export interface CreateAgentInput {
  projectId: number;
  name: string;
  sandboxName: string;
  providerName?: string;
  policyYaml?: string;
  image?: string;
  metadata?: Record<string, any>;
  blueprintId?: number;
  inferenceProfile?: string;
}

export interface UpdateAgentInput {
  status?: string;
  policyYaml?: string;
  metadata?: Record<string, any>;
}

export interface IAgentService {
  listAgents(projectId: number): Promise<Agent[]>;
  getAgent(id: number): Promise<Agent>;
  createAgent(input: CreateAgentInput): Promise<Agent>;
  updateAgent(id: number, input: UpdateAgentInput): Promise<Agent>;
  deleteAgent(id: number): Promise<void>;
  getAgentLogs(agentId: number, limit?: number): Promise<AgentAuditLog[]>;
  logAction(agentId: number, action: string, detail?: string): Promise<void>;
}

export class AgentService implements IAgentService {
  private readonly agentRepository: IAgentRepository;
  private readonly agentAuditLogRepository: IAgentAuditLogRepository;

  constructor({
    agentRepository,
    agentAuditLogRepository,
  }: {
    agentRepository: IAgentRepository;
    agentAuditLogRepository: IAgentAuditLogRepository;
  }) {
    this.agentRepository = agentRepository;
    this.agentAuditLogRepository = agentAuditLogRepository;
  }

  public async listAgents(projectId: number): Promise<Agent[]> {
    return this.agentRepository.findAllByProjectId(projectId);
  }

  public async getAgent(id: number): Promise<Agent> {
    const agent = await this.agentRepository.findOneBy({ id });
    if (!agent) {
      throw new Error(`Agent not found: ${id}`);
    }
    return agent;
  }

  public async createAgent(input: CreateAgentInput): Promise<Agent> {
    const now = new Date().toISOString();
    const agent = await this.agentRepository.createOne({
      ...input,
      status: 'creating',
      createdAt: now,
      updatedAt: now,
    });
    await this.logAction(agent.id, 'created', `Agent "${input.name}" created`);
    logger.info(`Agent created: ${agent.id} (${agent.sandboxName})`);
    return agent;
  }

  public async updateAgent(
    id: number,
    input: UpdateAgentInput,
  ): Promise<Agent> {
    const agent = await this.agentRepository.updateOne(id, {
      ...input,
      updatedAt: new Date().toISOString(),
    });
    if (input.status) {
      await this.logAction(id, input.status, `Status changed to ${input.status}`);
    }
    if (input.policyYaml) {
      await this.logAction(id, 'policy_updated', 'Policy updated');
    }
    return agent;
  }

  public async deleteAgent(id: number): Promise<void> {
    const agent = await this.getAgent(id);
    await this.logAction(id, 'deleted', `Agent "${agent.name}" deleted`);
    await this.agentRepository.deleteOne(id);
    logger.info(`Agent deleted: ${id} (${agent.sandboxName})`);
  }

  public async getAgentLogs(
    agentId: number,
    limit = 50,
  ): Promise<AgentAuditLog[]> {
    return this.agentAuditLogRepository.findByAgentId(agentId, limit);
  }

  public async logAction(
    agentId: number,
    action: string,
    detail?: string,
  ): Promise<void> {
    await this.agentAuditLogRepository.createOne({
      agentId,
      action,
      detail: detail || null,
      createdAt: new Date().toISOString(),
    });
  }
}
