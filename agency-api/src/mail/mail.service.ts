import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BrevoClient } from '@getbrevo/brevo';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private client: BrevoClient;

  constructor(private readonly configService: ConfigService) {
    this.client = new BrevoClient({
      apiKey: this.configService.getOrThrow<string>('BREVO_API_KEY'),
    });
  }

  async sendPasswordResetEmail(email: string, token: string) {
    const resetUrl = `${this.configService.getOrThrow<string>('FRONTEND_URL')}/reset-password?token=${token}`;
    const senderName = this.configService.get<string>('MAIL_SENDER_NAME', 'Zamunda AI');
    const senderEmail = this.configService.get<string>('MAIL_SENDER_EMAIL', 'noreply@zamunda-ai.com');

    try {
      await this.client.transactionalEmails.sendTransacEmail({
        subject: 'Reset your password',
        htmlContent: `<html><body><h1>Password Reset</h1><p>Please use the link below to reset your password:</p><a href="${resetUrl}">${resetUrl}</a></body></html>`,
        sender: { name: senderName, email: senderEmail },
        to: [{ email: email }],
      });
      this.logger.log(`Password reset email sent to ${email}`);
    } catch (error: any) {
      this.logger.error(`Failed to send email to ${email}: ${error.message}`);
      throw error;
    }
  }
}
