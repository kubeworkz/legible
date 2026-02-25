import * as crypto from 'crypto';
import {
  IMemberRepository,
  Member,
  MemberRole,
} from '@server/repositories/memberRepository';
import {
  IInvitationRepository,
  Invitation,
} from '@server/repositories/invitationRepository';
import { IUserRepository, User } from '@server/repositories/userRepository';
import {
  IOrganizationRepository,
  Organization,
} from '@server/repositories/organizationRepository';

const INVITATION_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface InviteMemberInput {
  organizationId: number;
  email: string;
  role?: MemberRole;
}

export interface IMemberService {
  inviteMember(
    input: InviteMemberInput,
    invitedByUserId: number,
  ): Promise<Invitation>;
  acceptInvitation(token: string, userId: number): Promise<Member>;
  updateMemberRole(
    memberId: number,
    role: MemberRole,
  ): Promise<Member>;
  removeMember(memberId: number): Promise<boolean>;
  getMember(
    organizationId: number,
    userId: number,
  ): Promise<Member | null>;
  requireRole(
    organizationId: number,
    userId: number,
    requiredRoles: MemberRole[],
  ): Promise<Member>;
}

export class MemberService implements IMemberService {
  private readonly memberRepository: IMemberRepository;
  private readonly invitationRepository: IInvitationRepository;
  private readonly userRepository: IUserRepository;
  private readonly organizationRepository: IOrganizationRepository;

  constructor({
    memberRepository,
    invitationRepository,
    userRepository,
    organizationRepository,
  }: {
    memberRepository: IMemberRepository;
    invitationRepository: IInvitationRepository;
    userRepository: IUserRepository;
    organizationRepository: IOrganizationRepository;
  }) {
    this.memberRepository = memberRepository;
    this.invitationRepository = invitationRepository;
    this.userRepository = userRepository;
    this.organizationRepository = organizationRepository;
  }

  public async inviteMember(
    input: InviteMemberInput,
    invitedByUserId: number,
  ): Promise<Invitation> {
    const { organizationId, email, role = MemberRole.MEMBER } = input;

    // Check if the organization exists
    const org = await this.organizationRepository.findOneBy({
      id: organizationId,
    } as Partial<Organization>);
    if (!org) {
      throw new Error('Organization not found');
    }

    // Check if user is already a member
    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      const existingMember = await this.memberRepository.findByOrgAndUser(
        organizationId,
        existingUser.id,
      );
      if (existingMember) {
        throw new Error('User is already a member of this organization');
      }
    }

    // Create invitation
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(
      Date.now() + INVITATION_EXPIRY_MS,
    ).toISOString();

    return this.invitationRepository.createOne({
      organizationId,
      email,
      role,
      token,
      invitedBy: invitedByUserId,
      expiresAt,
    });
  }

  public async acceptInvitation(
    token: string,
    userId: number,
  ): Promise<Member> {
    const invitation = await this.invitationRepository.findByToken(token);
    if (!invitation) {
      throw new Error('Invalid invitation token');
    }

    if (invitation.acceptedAt) {
      throw new Error('Invitation has already been accepted');
    }

    if (new Date(invitation.expiresAt) < new Date()) {
      throw new Error('Invitation has expired');
    }

    // Verify the accepting user's email matches
    const user = await this.userRepository.findOneBy({
      id: userId,
    } as Partial<User>);
    if (!user || user.email !== invitation.email) {
      throw new Error(
        'This invitation was sent to a different email address',
      );
    }

    // Check if already a member
    const existingMember = await this.memberRepository.findByOrgAndUser(
      invitation.organizationId,
      userId,
    );
    if (existingMember) {
      throw new Error('You are already a member of this organization');
    }

    // Create member
    const member = await this.memberRepository.createOne({
      organizationId: invitation.organizationId,
      userId,
      role: invitation.role as MemberRole,
      invitedBy: invitation.invitedBy,
    });

    // Mark invitation as accepted
    await this.invitationRepository.updateOne(invitation.id, {
      acceptedAt: new Date().toISOString(),
    });

    return member;
  }

  public async updateMemberRole(
    memberId: number,
    role: MemberRole,
  ): Promise<Member> {
    return this.memberRepository.updateOne(memberId, { role });
  }

  public async removeMember(memberId: number): Promise<boolean> {
    await this.memberRepository.deleteOne(memberId);
    return true;
  }

  public async getMember(
    organizationId: number,
    userId: number,
  ): Promise<Member | null> {
    return this.memberRepository.findByOrgAndUser(organizationId, userId);
  }

  public async requireRole(
    organizationId: number,
    userId: number,
    requiredRoles: MemberRole[],
  ): Promise<Member> {
    const member = await this.memberRepository.findByOrgAndUser(
      organizationId,
      userId,
    );
    if (!member) {
      throw new Error('You are not a member of this organization');
    }
    if (!requiredRoles.includes(member.role)) {
      throw new Error('You do not have permission to perform this action');
    }
    return member;
  }
}
