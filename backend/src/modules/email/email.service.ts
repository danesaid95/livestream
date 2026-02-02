import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resend: Resend;
  private fromEmail: string;
  private frontendUrl: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    this.resend = new Resend(apiKey);
    this.fromEmail = this.configService.get<string>('EMAIL_FROM', 'noreply@livestream.com');
    this.frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000');
  }

  async sendVerificationEmail(
    email: string,
    username: string,
    verificationToken: string,
  ): Promise<boolean> {
    const verificationUrl = `${this.frontendUrl}/auth/verify-email?token=${verificationToken}`;

    try {
      const { error } = await this.resend.emails.send({
        from: this.fromEmail,
        to: email,
        subject: 'Verify your email - Livestream Platform',
        html: this.getVerificationEmailHtml(username, verificationUrl),
      });

      if (error) {
        this.logger.error(`Failed to send verification email: ${error.message}`);
        return false;
      }

      this.logger.log(`Verification email sent to ${email}`);
      return true;
    } catch (error) {
      this.logger.error(`Email send error: ${error.message}`);
      return false;
    }
  }

  async sendPasswordResetEmail(
    email: string,
    username: string,
    resetToken: string,
  ): Promise<boolean> {
    const resetUrl = `${this.frontendUrl}/auth/reset-password?token=${resetToken}`;

    try {
      const { error } = await this.resend.emails.send({
        from: this.fromEmail,
        to: email,
        subject: 'Reset your password - Livestream Platform',
        html: this.getPasswordResetEmailHtml(username, resetUrl),
      });

      if (error) {
        this.logger.error(`Failed to send password reset email: ${error.message}`);
        return false;
      }

      this.logger.log(`Password reset email sent to ${email}`);
      return true;
    } catch (error) {
      this.logger.error(`Email send error: ${error.message}`);
      return false;
    }
  }

  async sendWelcomeEmail(email: string, username: string): Promise<boolean> {
    try {
      const { error } = await this.resend.emails.send({
        from: this.fromEmail,
        to: email,
        subject: 'Welcome to Livestream Platform!',
        html: this.getWelcomeEmailHtml(username),
      });

      if (error) {
        this.logger.error(`Failed to send welcome email: ${error.message}`);
        return false;
      }

      this.logger.log(`Welcome email sent to ${email}`);
      return true;
    } catch (error) {
      this.logger.error(`Email send error: ${error.message}`);
      return false;
    }
  }

  private getVerificationEmailHtml(username: string, verificationUrl: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0f0f0f;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0f0f0f; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #1a1a1a; border-radius: 12px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #7c3aed 0%, #ec4899 100%); padding: 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">Livestream</h1>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="margin: 0 0 20px; color: #ffffff; font-size: 24px;">Verify Your Email</h2>
              <p style="margin: 0 0 20px; color: #a0a0a0; font-size: 16px; line-height: 1.6;">
                Hey ${username},
              </p>
              <p style="margin: 0 0 30px; color: #a0a0a0; font-size: 16px; line-height: 1.6;">
                Thanks for signing up! Please verify your email address to get full access to your account.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${verificationUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #7c3aed 0%, #ec4899 100%); color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; border-radius: 8px;">
                      Verify Email Address
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 30px 0 0; color: #666666; font-size: 14px; line-height: 1.6;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="margin: 10px 0 0; color: #7c3aed; font-size: 14px; word-break: break-all;">
                ${verificationUrl}
              </p>
              <p style="margin: 30px 0 0; color: #666666; font-size: 14px;">
                This link will expire in 24 hours.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 30px; background-color: #111111; text-align: center;">
              <p style="margin: 0; color: #666666; font-size: 12px;">
                If you didn't create an account, you can safely ignore this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }

  private getPasswordResetEmailHtml(username: string, resetUrl: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0f0f0f;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0f0f0f; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #1a1a1a; border-radius: 12px; overflow: hidden;">
          <tr>
            <td style="background: linear-gradient(135deg, #7c3aed 0%, #ec4899 100%); padding: 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">Livestream</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="margin: 0 0 20px; color: #ffffff; font-size: 24px;">Reset Your Password</h2>
              <p style="margin: 0 0 20px; color: #a0a0a0; font-size: 16px; line-height: 1.6;">
                Hey ${username},
              </p>
              <p style="margin: 0 0 30px; color: #a0a0a0; font-size: 16px; line-height: 1.6;">
                We received a request to reset your password. Click the button below to create a new password.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${resetUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #7c3aed 0%, #ec4899 100%); color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; border-radius: 8px;">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 30px 0 0; color: #666666; font-size: 14px;">
                This link will expire in 1 hour.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 30px; background-color: #111111; text-align: center;">
              <p style="margin: 0; color: #666666; font-size: 12px;">
                If you didn't request a password reset, you can safely ignore this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }

  private getWelcomeEmailHtml(username: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Livestream</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0f0f0f;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0f0f0f; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #1a1a1a; border-radius: 12px; overflow: hidden;">
          <tr>
            <td style="background: linear-gradient(135deg, #7c3aed 0%, #ec4899 100%); padding: 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">Livestream</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="margin: 0 0 20px; color: #ffffff; font-size: 24px;">Welcome, ${username}!</h2>
              <p style="margin: 0 0 20px; color: #a0a0a0; font-size: 16px; line-height: 1.6;">
                Your email has been verified successfully. You're all set to explore the platform!
              </p>
              <p style="margin: 0 0 30px; color: #a0a0a0; font-size: 16px; line-height: 1.6;">
                Here's what you can do:
              </p>
              <ul style="margin: 0 0 30px; padding-left: 20px; color: #a0a0a0; font-size: 16px; line-height: 1.8;">
                <li>Watch live streams from amazing creators</li>
                <li>Support your favorite streamers with gifts</li>
                <li>Go live and build your own audience</li>
                <li>Chat and connect with the community</li>
              </ul>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${this.frontendUrl}/browse" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #7c3aed 0%, #ec4899 100%); color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; border-radius: 8px;">
                      Start Exploring
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 30px; background-color: #111111; text-align: center;">
              <p style="margin: 0; color: #666666; font-size: 12px;">
                Happy streaming!
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }
}
