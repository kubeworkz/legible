import {
  IOrganizationRepository,
  Organization,
} from '@server/repositories/organizationRepository';
import {
  IMemberRepository,
  Member,
  MemberRole,
} from '@server/repositories/memberRepository';
import { IUserRepository, User } from '@server/repositories/userRepository';

export interface CreateOrganizationInput {
  displayName: string;
  slug: string;
  logoUrl?: string;
}

export interface UpdateOrganizationInput {
  displayName?: string;
  slug?: string;
  logoUrl?: string;
}

export interface OrganizationWithRole extends Organization {
  currentUserRole: string;  // Uppercased for GraphQL MemberRole enum
}

export interface MemberWithUser extends Member {
  user: User;
}

export interface IOrganizationService {
  createOrganization(
    input: CreateOrganizationInput,
    ownerId: number,
  ): Promise<Organization>;
  updateOrganization(
    organizationId: number,
    input: UpdateOrganizationInput,
  ): Promise<Organization>;
  deleteOrganization(organizationId: number): Promise<boolean>;
  getOrganization(organizationId: number): Promise<Organization | null>;
  getOrganizationBySlug(slug: string): Promise<Organization | null>;
  listUserOrganizations(userId: number): Promise<OrganizationWithRole[]>;
  getMembers(organizationId: number): Promise<MemberWithUser[]>;
}

export class OrganizationService implements IOrganizationService {
  private readonly organizationRepository: IOrganizationRepository;
  private readonly memberRepository: IMemberRepository;
  private readonly userRepository: IUserRepository;

  constructor({
    organizationRepository,
    memberRepository,
    userRepository,
  }: {
    organizationRepository: IOrganizationRepository;
    memberRepository: IMemberRepository;
    userRepository: IUserRepository;
  }) {
    this.organizationRepository = organizationRepository;
    this.memberRepository = memberRepository;
    this.userRepository = userRepository;
  }

  public async createOrganization(
    input: CreateOrganizationInput,
    ownerId: number,
  ): Promise<Organization> {
    // Check slug uniqueness
    const existing = await this.organizationRepository.findBySlug(input.slug);
    if (existing) {
      throw new Error('An organization with this slug already exists');
    }

    const org = await this.organizationRepository.createOne({
      displayName: input.displayName,
      slug: input.slug,
      logoUrl: input.logoUrl || null,
    });

    // Add creator as owner
    await this.memberRepository.createOne({
      organizationId: org.id,
      userId: ownerId,
      role: MemberRole.OWNER,
    });

    return org;
  }

  public async updateOrganization(
    organizationId: number,
    input: UpdateOrganizationInput,
  ): Promise<Organization> {
    if (input.slug) {
      const existing = await this.organizationRepository.findBySlug(input.slug);
      if (existing && existing.id !== organizationId) {
        throw new Error('An organization with this slug already exists');
      }
    }

    return this.organizationRepository.updateOne(organizationId, input);
  }

  public async deleteOrganization(organizationId: number): Promise<boolean> {
    await this.organizationRepository.deleteOne(organizationId);
    return true;
  }

  public async getOrganization(
    organizationId: number,
  ): Promise<Organization | null> {
    return this.organizationRepository.findOneBy({
      id: organizationId,
    } as Partial<Organization>);
  }

  public async getOrganizationBySlug(
    slug: string,
  ): Promise<Organization | null> {
    return this.organizationRepository.findBySlug(slug);
  }

  public async listUserOrganizations(
    userId: number,
  ): Promise<OrganizationWithRole[]> {
    const memberships = await this.memberRepository.findAllBy({
      userId,
    } as Partial<Member>);

    const orgs: OrganizationWithRole[] = [];
    for (const membership of memberships) {
      const org = await this.organizationRepository.findOneBy({
        id: membership.organizationId,
      } as Partial<Organization>);
      if (org) {
        orgs.push({
          ...org,
          currentUserRole: membership.role.toUpperCase() as string,
        });
      }
    }

    return orgs;
  }

  public async getMembers(
    organizationId: number,
  ): Promise<MemberWithUser[]> {
    const members =
      await this.memberRepository.findAllByOrganization(organizationId);
    const result: MemberWithUser[] = [];

    for (const member of members) {
      const user = await this.userRepository.findOneBy({
        id: member.userId,
      } as Partial<User>);
      if (user) {
        result.push({
          ...member,
          role: member.role.toUpperCase() as unknown as MemberRole,
          user,
        });
      }
    }

    return result;
  }
}
