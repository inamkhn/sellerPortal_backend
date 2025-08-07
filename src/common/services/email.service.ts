import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend | null;

  constructor(private configService: ConfigService) {
    const resendApiKey = this.configService.get<string>('RESEND_API_KEY');

    if (!resendApiKey) {
      this.logger.warn(
        '⚠️ RESEND_API_KEY not found in environment variables. Email sending will be disabled.',
      );
      this.resend = null;
    } else {
      this.resend = new Resend(resendApiKey);
      this.logger.log('✅ Resend email service initialized');
    }
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    try {
      if (!this.resend) {
        this.logger.warn(
          `📧 Email sending disabled - would send to: ${options.to}`,
        );
        this.logger.warn(`📧 Subject: ${options.subject}`);
        return;
      }

      const fromEmail = this.configService.get<string>(
        'EMAIL_FROM',
        'Furniture Marketplace <onboarding@resend.dev>',
      );

      const { data, error } = await this.resend.emails.send({
        from: fromEmail,
        to: [options.to],
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      if (error) {
        this.logger.error(`❌ Failed to send email to ${options.to}:`, error);
        throw new Error(`Email sending failed: ${error.message}`);
      }

      this.logger.log(
        `✅ Email sent successfully to ${options.to} (ID: ${data?.id})`,
      );
    } catch (error) {
      this.logger.error(`❌ Failed to send email to ${options.to}:`, error);
      throw error;
    }
  }

  async sendVerificationEmail(
    email: string,
    token: string,
    userName?: string,
  ): Promise<void> {
    const verificationUrl = `${this.configService.get('FRONTEND_URL', 'http://localhost:3000')}/auth/verify-email?token=${token}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Verify Your Email</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #007bff; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .button { 
              display: inline-block; 
              padding: 12px 24px; 
              background-color: #007bff; 
              color: white; 
              text-decoration: none; 
              border-radius: 5px; 
              margin: 20px 0; 
            }
            .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Verify Your Email Address</h1>
            </div>
            <div class="content">
              <p>Hello${userName ? ` ${userName}` : ''},</p>
              <p>Thank you for registering with our furniture marketplace! To complete your registration, please verify your email address by clicking the button below:</p>
              <div style="text-align: center;">
                <a href="${verificationUrl}" class="button">Verify Email Address</a>
              </div>
              <p>If the button doesn't work, you can also copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #007bff;">${verificationUrl}</p>
              <p><strong>This verification link will expire in 24 hours.</strong></p>
              <p>If you didn't create an account with us, please ignore this email.</p>
            </div>
            <div class="footer">
              <p>© 2024 Furniture Marketplace. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
      Hello${userName ? ` ${userName}` : ''},
      
      Thank you for registering with our furniture marketplace! To complete your registration, please verify your email address by visiting this link:
      
      ${verificationUrl}
      
      This verification link will expire in 24 hours.
      
      If you didn't create an account with us, please ignore this email.
      
      © 2024 Furniture Marketplace. All rights reserved.
    `;

    await this.sendEmail({
      to: email,
      subject: 'Verify Your Email Address - Furniture Marketplace',
      html,
      text,
    });
  }

  async sendPasswordResetEmail(
    email: string,
    token: string,
    userName?: string,
  ): Promise<void> {
    const resetUrl = `${this.configService.get('FRONTEND_URL', 'http://localhost:3000')}/reset-password?token=${token}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Reset Your Password</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #dc3545; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .button { 
              display: inline-block; 
              padding: 12px 24px; 
              background-color: #dc3545; 
              color: white; 
              text-decoration: none; 
              border-radius: 5px; 
              margin: 20px 0; 
            }
            .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
            .warning { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Reset Your Password</h1>
            </div>
            <div class="content">
              <p>Hello${userName ? ` ${userName}` : ''},</p>
              <p>We received a request to reset your password for your Furniture Marketplace account. Click the button below to reset your password:</p>
              <div style="text-align: center;">
                <a href="${resetUrl}" class="button">Reset Password</a>
              </div>
              <p>If the button doesn't work, you can also copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #dc3545;">${resetUrl}</p>
              <div class="warning">
                <p><strong>⚠️ Security Notice:</strong></p>
                <ul>
                  <li>This password reset link will expire in 1 hour</li>
                  <li>If you didn't request this password reset, please ignore this email</li>
                  <li>Your password will remain unchanged until you create a new one</li>
                </ul>
              </div>
            </div>
            <div class="footer">
              <p>© 2024 Furniture Marketplace. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
      Hello${userName ? ` ${userName}` : ''},
      
      We received a request to reset your password for your Furniture Marketplace account. Visit this link to reset your password:
      
      ${resetUrl}
      
      This password reset link will expire in 1 hour.
      
      If you didn't request this password reset, please ignore this email. Your password will remain unchanged.
      
      © 2024 Furniture Marketplace. All rights reserved.
    `;

    await this.sendEmail({
      to: email,
      subject: 'Reset Your Password - Furniture Marketplace',
      html,
      text,
    });
  }

  async sendPasswordResetConfirmation(
    email: string,
    userName?: string,
  ): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Password Reset Successful</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #28a745; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
            .success { background-color: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 5px; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ Password Reset Successful</h1>
            </div>
            <div class="content">
              <p>Hello${userName ? ` ${userName}` : ''},</p>
              <div class="success">
                <p><strong>Your password has been successfully reset!</strong></p>
              </div>
              <p>Your Furniture Marketplace account password has been changed. You can now log in with your new password.</p>
              <p>If you didn't make this change, please contact our support team immediately.</p>
              <p>For security reasons, all active sessions have been logged out. You'll need to log in again with your new password.</p>
            </div>
            <div class="footer">
              <p>© 2024 Furniture Marketplace. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
      Hello${userName ? ` ${userName}` : ''},
      
      Your password has been successfully reset!
      
      Your Furniture Marketplace account password has been changed. You can now log in with your new password.
      
      If you didn't make this change, please contact our support team immediately.
      
      For security reasons, all active sessions have been logged out. You'll need to log in again with your new password.
      
      © 2024 Furniture Marketplace. All rights reserved.
    `;

    await this.sendEmail({
      to: email,
      subject: 'Password Reset Successful - Furniture Marketplace',
      html,
      text,
    });
  }
}
