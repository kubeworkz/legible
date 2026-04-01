import * as postmark from 'postmark';
import { getLogger } from '@server/utils';

const logger = getLogger('EmailService');
logger.level = 'debug';

export interface SendEmailOptions {
  to: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
  tag?: string;
}

export interface IEmailService {
  /** Returns true when Postmark env vars are present and the service is functional */
  isEnabled(): boolean;

  /** Send an email via Postmark */
  sendEmail(options: SendEmailOptions): Promise<void>;

  /** Send an invitation email with an accept link */
  sendInvitationEmail(params: {
    to: string;
    inviterName: string;
    organizationName: string;
    token: string;
  }): Promise<void>;

  /** Send an email verification link */
  sendVerificationEmail(params: {
    to: string;
    displayName: string;
    token: string;
  }): Promise<void>;

  /** Send a magic-link login email */
  sendMagicLinkEmail(params: {
    to: string;
    displayName: string;
    token: string;
  }): Promise<void>;
}

export class EmailService implements IEmailService {
  private readonly client: postmark.ServerClient | null;
  private readonly fromAddress: string;
  private readonly appBaseUrl: string;
  private readonly enabled: boolean;

  constructor({
    postmarkServerToken,
    emailFrom,
    appBaseUrl,
  }: {
    postmarkServerToken?: string;
    emailFrom?: string;
    appBaseUrl?: string;
  }) {
    this.enabled = !!postmarkServerToken;
    this.fromAddress = emailFrom || 'noreply@example.com';
    this.appBaseUrl = (appBaseUrl || 'http://localhost:3000').replace(
      /\/$/,
      '',
    );

    if (this.enabled) {
      this.client = new postmark.ServerClient(postmarkServerToken);
      logger.info('EmailService enabled (Postmark)');
    } else {
      this.client = null;
      logger.info('EmailService disabled — POSTMARK_SERVER_TOKEN not set');
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public async sendEmail(options: SendEmailOptions): Promise<void> {
    if (!this.client) {
      logger.warn('sendEmail called but EmailService is disabled; skipping');
      return;
    }

    await this.client.sendEmail({
      From: this.fromAddress,
      To: options.to,
      Subject: options.subject,
      HtmlBody: options.htmlBody,
      TextBody: options.textBody || '',
      Tag: options.tag,
      MessageStream: 'outbound',
    });

    logger.debug(`Email sent to ${options.to} [${options.tag || 'no-tag'}]`);
  }

  public async sendInvitationEmail(params: {
    to: string;
    inviterName: string;
    organizationName: string;
    token: string;
  }): Promise<void> {
    const acceptUrl = `${this.appBaseUrl}/accept-invite?token=${encodeURIComponent(params.token)}`;

    const subject = `You've been invited to ${params.organizationName}`;
    const htmlBody = `
      <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
        <h2>You're invited!</h2>
        <p>
          <strong>${this.escapeHtml(params.inviterName)}</strong> has invited you to join
          <strong>${this.escapeHtml(params.organizationName)}</strong> on Legible.
        </p>
        <p>
          <a href="${this.escapeHtml(acceptUrl)}"
             style="display:inline-block;padding:12px 24px;background:#1890ff;color:#fff;
                    border-radius:6px;text-decoration:none;font-weight:600;">
            Accept Invitation
          </a>
        </p>
        <p style="color:#888;font-size:13px;">
          This invitation expires in 7 days. If you didn't expect this, you can ignore this email.
        </p>
      </div>
    `.trim();

    const textBody = [
      `${params.inviterName} has invited you to join ${params.organizationName} on Legible.`,
      '',
      `Accept the invitation: ${acceptUrl}`,
      '',
      'This invitation expires in 7 days.',
    ].join('\n');

    await this.sendEmail({
      to: params.to,
      subject,
      htmlBody,
      textBody,
      tag: 'invitation',
    });
  }

  public async sendVerificationEmail(params: {
    to: string;
    displayName: string;
    token: string;
  }): Promise<void> {
    const verifyUrl = `${this.appBaseUrl}/verify-email?token=${encodeURIComponent(params.token)}`;

    const subject = 'Verify your email address';
    const htmlBody = `
      <div style=\"font-family: sans-serif; max-width: 560px; margin: 0 auto;\">
        <h2>Welcome to Legible!</h2>
        <p>
          Hi <strong>${this.escapeHtml(params.displayName)}</strong>, please verify your
          email address to get started.
        </p>
        <p>
          <a href=\"${this.escapeHtml(verifyUrl)}\"
             style=\"display:inline-block;padding:12px 24px;background:#1890ff;color:#fff;
                    border-radius:6px;text-decoration:none;font-weight:600;\">
            Verify Email
          </a>
        </p>
        <p style=\"color:#888;font-size:13px;\">
          This link expires in 24 hours. If you didn't create an account, you can ignore this email.
        </p>
      </div>
    `.trim();

    const textBody = [
      `Hi ${params.displayName},`,
      '',
      'Please verify your email address to get started with Legible.',
      '',
      `Verify your email: ${verifyUrl}`,
      '',
      'This link expires in 24 hours.',
    ].join('\n');

    await this.sendEmail({
      to: params.to,
      subject,
      htmlBody,
      textBody,
      tag: 'email-verification',
    });
  }

  public async sendMagicLinkEmail(params: {
    to: string;
    displayName: string;
    token: string;
  }): Promise<void> {
    const loginUrl = `${this.appBaseUrl}/magic-link?token=${encodeURIComponent(params.token)}`;

    const subject = 'Your sign-in link for Legible';
    const htmlBody = `
      <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
        <h2>Sign in to Legible</h2>
        <p>
          Hi <strong>${this.escapeHtml(params.displayName)}</strong>, click the button
          below to sign in. No password needed.
        </p>
        <p>
          <a href="${this.escapeHtml(loginUrl)}"
             style="display:inline-block;padding:12px 24px;background:#1890ff;color:#fff;
                    border-radius:6px;text-decoration:none;font-weight:600;">
            Sign In
          </a>
        </p>
        <p style="color:#888;font-size:13px;">
          This link expires in 15 minutes and can only be used once.
          If you didn't request this, you can safely ignore this email.
        </p>
      </div>
    `.trim();

    const textBody = [
      `Hi ${params.displayName},`,
      '',
      'Click this link to sign in to Legible (no password needed):',
      '',
      loginUrl,
      '',
      'This link expires in 15 minutes and can only be used once.',
    ].join('\n');

    await this.sendEmail({
      to: params.to,
      subject,
      htmlBody,
      textBody,
      tag: 'magic-link',
    });
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
