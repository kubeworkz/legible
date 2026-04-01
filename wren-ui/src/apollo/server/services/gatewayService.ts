import {
  Gateway,
  IGatewayRepository,
} from '@server/repositories/gatewayRepository';
import { getLogger } from '@server/utils';

const logger = getLogger('GatewayService');

export interface CreateGatewayInput {
  organizationId: number;
  cpus?: string;
  memory?: string;
  maxSandboxes?: number;
}

export interface UpdateGatewayInput {
  status?: string;
  endpoint?: string;
  port?: number;
  pid?: number;
  cpus?: string;
  memory?: string;
  maxSandboxes?: number;
  version?: string;
  errorMessage?: string;
  lastHealthCheck?: string;
}

export interface IGatewayService {
  getGateway(id: number): Promise<Gateway>;
  getGatewayForOrganization(organizationId: number): Promise<Gateway | null>;
  listRunningGateways(): Promise<Gateway[]>;
  createGateway(input: CreateGatewayInput): Promise<Gateway>;
  updateGateway(id: number, input: UpdateGatewayInput): Promise<Gateway>;
  deleteGateway(id: number): Promise<void>;
  incrementSandboxCount(id: number): Promise<Gateway>;
  decrementSandboxCount(id: number): Promise<Gateway>;
}

export class GatewayService implements IGatewayService {
  private readonly gatewayRepository: IGatewayRepository;

  constructor({
    gatewayRepository,
  }: {
    gatewayRepository: IGatewayRepository;
  }) {
    this.gatewayRepository = gatewayRepository;
  }

  public async getGateway(id: number): Promise<Gateway> {
    const gateway = await this.gatewayRepository.findOneBy({ id });
    if (!gateway) {
      throw new Error(`Gateway not found: ${id}`);
    }
    return gateway;
  }

  public async getGatewayForOrganization(
    organizationId: number,
  ): Promise<Gateway | null> {
    return this.gatewayRepository.findByOrganizationId(organizationId);
  }

  public async listRunningGateways(): Promise<Gateway[]> {
    return this.gatewayRepository.findRunning();
  }

  public async createGateway(input: CreateGatewayInput): Promise<Gateway> {
    const existing = await this.gatewayRepository.findByOrganizationId(
      input.organizationId,
    );
    if (existing) {
      throw new Error(
        `Gateway already exists for organization: ${input.organizationId}`,
      );
    }
    const now = new Date().toISOString();
    const gateway = await this.gatewayRepository.createOne({
      ...input,
      status: 'stopped',
      cpus: input.cpus || '4.0',
      memory: input.memory || '16g',
      maxSandboxes: input.maxSandboxes || 20,
      sandboxCount: 0,
      createdAt: now,
      updatedAt: now,
    });
    logger.info(
      `Gateway created: ${gateway.id} for org ${input.organizationId}`,
    );
    return gateway;
  }

  public async updateGateway(
    id: number,
    input: UpdateGatewayInput,
  ): Promise<Gateway> {
    return this.gatewayRepository.updateOne(id, {
      ...input,
      updatedAt: new Date().toISOString(),
    });
  }

  public async deleteGateway(id: number): Promise<void> {
    const gateway = await this.getGateway(id);
    if (gateway.status === 'running') {
      throw new Error('Cannot delete a running gateway. Stop it first.');
    }
    await this.gatewayRepository.deleteOne(id);
    logger.info(`Gateway deleted: ${id}`);
  }

  public async incrementSandboxCount(id: number): Promise<Gateway> {
    return this.gatewayRepository.incrementSandboxCount(id);
  }

  public async decrementSandboxCount(id: number): Promise<Gateway> {
    return this.gatewayRepository.decrementSandboxCount(id);
  }
}
