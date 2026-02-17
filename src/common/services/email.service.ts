import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { SettlementType } from '@prisma/client';

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
        'support@send.sellerspot.org',
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
            .token { 
              background-color: #e9ecef; 
              padding: 15px; 
              border-radius: 6px; 
              font-family: monospace; 
              word-break: break-all; 
              margin: 20px 0; 
              text-align: center;
              font-size: 18px;
              letter-spacing: 1px;
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
              <p>Thank you for registering with our furniture marketplace! To complete your registration, please enter the verification token below:</p>
              <div class="token">${token}</div>
              <p><strong>This token will expire in 24 hours.</strong></p>
              <p>If you didn't create an account with us, please ignore this email.</p>
            </div>
            <div class="footer">
              <p>© 2025 Furniture Marketplace. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
      Hello${userName ? ` ${userName}` : ''},
      
      Thank you for registering with our furniture marketplace! To complete your registration, please use the verification token below:
      
      ${token}
      
      This token will expire in 24 hours.
      
      If you didn't create an account with us, please ignore this email.
      
      © 2025 Furniture Marketplace. All rights reserved.
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
            .token { 
              background-color: #e9ecef; 
              padding: 15px; 
              border-radius: 6px; 
              font-family: monospace; 
              word-break: break-all; 
              margin: 20px 0; 
              text-align: center;
              font-size: 18px;
              letter-spacing: 1px;
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
              <p>We received a request to reset your password for your Furniture Marketplace account. Please use the OTP code below to reset your password:</p>
              <div class="token">${token}</div>
              <div class="warning">
                <p><strong>⚠️ Security Notice:</strong></p>
                <ul>
                  <li>This OTP code will expire in 1 hour</li>
                  <li>If you didn't request this password reset, please ignore this email</li>
                  <li>Your password will remain unchanged until you create a new one</li>
                </ul>
              </div>
            </div>
            <div class="footer">
              <p>© 2025 Furniture Marketplace. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
      Hello${userName ? ` ${userName}` : ''},
      
      We received a request to reset your password for your Furniture Marketplace account. Please use the OTP code below to reset your password:
      
      ${token}
      
      This OTP code will expire in 1 hour.
      
      If you didn't request this password reset, please ignore this email. Your password will remain unchanged.
      
      © 2025 Furniture Marketplace. All rights reserved.
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
              <p>© 2025 Furniture Marketplace. All rights reserved.</p>
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
      
      © 2025 Furniture Marketplace. All rights reserved.
    `;

    await this.sendEmail({
      to: email,
      subject: 'Password Reset Successful - Furniture Marketplace',
      html,
      text,
    });
  }

  async sendSettlementPaymentEmail(
    email: string,
    userName: string,
    amount: number,
    settlementType: SettlementType,
    settlementId: number,
  ): Promise<void> {
    // Settlement type-specific configuration
    const settlementConfig = {
      [SettlementType.SELLER_PAYMENT]: {
        subject: 'Seller Payment Received - Furniture Marketplace',
        title: 'Seller Payment Received',
        description:
          'Your seller payment has been processed and marked as paid.',
        icon: '💰',
      },
      [SettlementType.REFERRAL_PAYMENT]: {
        subject: 'Referral Commission Received - Furniture Marketplace',
        title: 'Referral Commission Received',
        description:
          'Your referral commission has been processed and marked as paid.',
        icon: '🎯',
      },
      [SettlementType.ADMIN_COMMISSION]: {
        subject: 'Commission Payment Received - Furniture Marketplace',
        title: 'Commission Payment Received',
        description:
          'Your commission payment has been processed and marked as paid.',
        icon: '💼',
      },
    };

    const config = settlementConfig[settlementType];
    const formattedAmount = `AED ${Number(amount).toFixed(2)}`;
    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${config.title}</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #28a745; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .payment-details { 
              background-color: #e9ecef; 
              padding: 20px; 
              border-radius: 8px; 
              margin: 20px 0; 
              border-left: 4px solid #28a745;
            }
            .amount { 
              font-size: 24px; 
              font-weight: bold; 
              color: #28a745; 
              text-align: center;
              margin: 10px 0;
            }
            .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
            .success { background-color: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 5px; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${config.icon} ${config.title}</h1>
            </div>
            <div class="content">
              <p>Hello ${userName},</p>
              <div class="success">
                <p><strong>Great news! Your payment has been processed successfully.</strong></p>
              </div>
              <p>${config.description}</p>
              
              <div class="payment-details">
                <h3>Payment Details:</h3>
                <p><strong>Amount:</strong></p>
                <div class="amount">${formattedAmount}</div>
                <p><strong>Payment Type:</strong> ${settlementType
        .replace('_', ' ')
        .toLowerCase()
        .replace(/\b\w/g, (l) => l.toUpperCase())}</p>
                <p><strong>Settlement ID:</strong> #${settlementId}</p>
                <p><strong>Payment Date:</strong> ${currentDate}</p>
              </div>
              
              <p>The payment has been processed and should reflect in your account according to your bank's processing times.</p>
              <p>If you have any questions about this payment, please contact our support team.</p>
            </div>
            <div class="footer">
              <p>© 2025 Furniture Marketplace. All rights reserved.</p>
              <p>This is an automated notification. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
      Hello ${userName},
      
      Great news! Your payment has been processed successfully.
      
      ${config.description}
      
      Payment Details:
      - Amount: ${formattedAmount}
      - Payment Type: ${settlementType
        .replace('_', ' ')
        .toLowerCase()
        .replace(/\b\w/g, (l) => l.toUpperCase())}
      - Settlement ID: #${settlementId}
      - Payment Date: ${currentDate}
      
      The payment has been processed and should reflect in your account according to your bank's processing times.
      
      If you have any questions about this payment, please contact our support team.
      
      © 2025 Furniture Marketplace. All rights reserved.
      This is an automated notification. Please do not reply to this email.
    `;

    await this.sendEmail({
      to: email,
      subject: config.subject,
      html,
      text,
    });
  }

  async sendOrderDeliveryEmail(
    email: string,
    userName: string,
    orderId: number,
    productName: string,
    orderAmount: number,
    customerName: string,
    isReferralManager: boolean = false,
  ): Promise<void> {
    const formattedAmount = `AED ${Number(orderAmount).toFixed(2)}`;
    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const config = isReferralManager
      ? {
        subject:
          'Order Delivered - Referral Customer - Furniture Marketplace',
        title: 'Order Delivered - Referral Customer',
        description: `Great news! An order from your referral customer has been successfully delivered.`,
        icon: '🎯',
        recipientType: 'Referral Manager',
      }
      : {
        subject: 'Order Delivered Successfully - Furniture Marketplace',
        title: 'Order Delivered Successfully',
        description: 'Your order has been delivered successfully!',
        icon: '📦',
        recipientType: 'Customer',
      };

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${config.title}</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #28a745; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .order-details { 
              background-color: #e9ecef; 
              padding: 20px; 
              border-radius: 8px; 
              margin: 20px 0; 
              border-left: 4px solid #28a745;
            }
            .amount { 
              font-size: 20px; 
              font-weight: bold; 
              color: #28a745; 
              margin: 5px 0;
            }
            .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
            .success { background-color: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 5px; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${config.icon} ${config.title}</h1>
            </div>
            <div class="content">
              <p>Hello ${userName},</p>
              <div class="success">
                <p><strong>Excellent news! ${config.description}</strong></p>
              </div>
              
              <div class="order-details">
                <h3>Order Details:</h3>
                <p><strong>Order ID:</strong> #${orderId}</p>
                <p><strong>Product:</strong> ${productName}</p>
                ${isReferralManager ? `<p><strong>Customer:</strong> ${customerName}</p>` : ''}
                <p><strong>Order Amount:</strong></p>
                <div class="amount">${formattedAmount}</div>
                <p><strong>Delivery Date:</strong> ${currentDate}</p>
                <p><strong>Status:</strong> <span style="color: #28a745; font-weight: bold;">DELIVERED ✅</span></p>
              </div>
              
              ${isReferralManager
        ? `<p>This order was placed by one of your referral customers. The delivery has been completed successfully, and any applicable referral commissions will be processed according to your agreement.</p>`
        : `<p>Thank you for choosing our furniture marketplace! We hope you're satisfied with your purchase. If you have any questions or concerns about your delivered order, please don't hesitate to contact our support team.</p>`
      }
              
              <p>If you have any questions about this ${isReferralManager ? 'referral order' : 'order'
      }, please contact our support team.</p>
            </div>
            <div class="footer">
              <p>© 2025 Furniture Marketplace. All rights reserved.</p>
              <p>This is an automated notification. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
      Hello ${userName},
      
      Excellent news! ${config.description}
      
      Order Details:
      - Order ID: #${orderId}
      - Product: ${productName}
      ${isReferralManager ? `- Customer: ${customerName}` : ''}
      - Order Amount: ${formattedAmount}
      - Delivery Date: ${currentDate}
      - Status: DELIVERED ✅
      
      ${isReferralManager
        ? `This order was placed by one of your referral customers. The delivery has been completed successfully, and any applicable referral commissions will be processed according to your agreement.`
        : `Thank you for choosing our furniture marketplace! We hope you're satisfied with your purchase. If you have any questions or concerns about your delivered order, please don't hesitate to contact our support team.`
      }
      
      If you have any questions about this ${isReferralManager ? 'referral order' : 'order'
      }, please contact our support team.
      
      © 2025 Furniture Marketplace. All rights reserved.
      This is an automated notification. Please do not reply to this email.
    `;

    await this.sendEmail({
      to: email,
      subject: config.subject,
      html,
      text,
    });
  }

  async sendNewOrderNotificationEmail(
    adminEmail: string,
    adminName: string,
    orderId: number,
    customerName: string,
    productInfo: string,
    orderAmount: number,
    sellerName: string,
    orderType: 'EXISTING_PRODUCT' | 'CUSTOM_PRODUCT',
    deliveryDate?: Date | null,
  ): Promise<void> {
    const formattedAmount = `AED ${Number(orderAmount).toFixed(2)}`;
    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const formattedDeliveryDate = deliveryDate
      ? new Date(deliveryDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
      : 'Not specified';

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>New Order Created</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #007bff; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .order-details { 
              background-color: #e9ecef; 
              padding: 20px; 
              border-radius: 8px; 
              margin: 20px 0; 
              border-left: 4px solid #007bff;
            }
            .amount { 
              font-size: 20px; 
              font-weight: bold; 
              color: #007bff; 
              margin: 5px 0;
            }
            .badge {
              display: inline-block;
              padding: 5px 10px;
              border-radius: 4px;
              font-size: 12px;
              font-weight: bold;
              margin: 5px 0;
            }
            .badge-custom { background-color: #ffc107; color: #000; }
            .badge-existing { background-color: #28a745; color: white; }
            .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
            .info { background-color: #d1ecf1; border: 1px solid #bee5eb; padding: 15px; border-radius: 5px; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🛒 New Order Created</h1>
            </div>
            <div class="content">
              <p>Hello ${adminName},</p>
              <div class="info">
                <p><strong>A new order has been created in the system!</strong></p>
              </div>
              
              <div class="order-details">
                <h3>Order Details:</h3>
                <p><strong>Order ID:</strong> #${orderId}</p>
                <p><strong>Order Type:</strong> <span class="badge ${orderType === 'CUSTOM_PRODUCT' ? 'badge-custom' : 'badge-existing'}">${orderType === 'CUSTOM_PRODUCT' ? 'CUSTOM PRODUCT' : 'EXISTING PRODUCT'}</span></p>
                <p><strong>Product:</strong> ${productInfo}</p>
                <p><strong>Customer:</strong> ${customerName}</p>
                <p><strong>Seller:</strong> ${sellerName}</p>
                <p><strong>Order Amount:</strong></p>
                <div class="amount">${formattedAmount}</div>
                <p><strong>Created:</strong> ${currentDate}</p>
                <p><strong>Delivery Date:</strong> ${formattedDeliveryDate}</p>
                <p><strong>Status:</strong> <span style="color: #ffc107; font-weight: bold;">PENDING ⏳</span></p>
              </div>
              
              <p>Please review this order in the admin dashboard and take necessary actions.</p>
              <p>You can view the full order details and manage it from your admin panel.</p>
            </div>
            <div class="footer">
              <p>© 2025 Furniture Marketplace. All rights reserved.</p>
              <p>This is an automated notification. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
      Hello ${adminName},
      
      A new order has been created in the system!
      
      Order Details:
      - Order ID: #${orderId}
      - Order Type: ${orderType === 'CUSTOM_PRODUCT' ? 'CUSTOM PRODUCT' : 'EXISTING PRODUCT'}
      - Product: ${productInfo}
      - Customer: ${customerName}
      - Seller: ${sellerName}
      - Order Amount: ${formattedAmount}
      - Created: ${currentDate}
      - Delivery Date: ${formattedDeliveryDate}
      - Status: PENDING ⏳
      
      Please review this order in the admin dashboard and take necessary actions.
      
      © 2025 Furniture Marketplace. All rights reserved.
      This is an automated notification. Please do not reply to this email.
    `;

    await this.sendEmail({
      to: adminEmail,
      subject: `New Order #${orderId} - ${orderType === 'CUSTOM_PRODUCT' ? 'Custom Product' : 'Existing Product'}`,
      html,
      text,
    });
  }

  async sendReferralManagerSettlementPendingEmail(
    email: string,
    managerName: string,
    orderRequestId: number,
    grossSellerAmount: number,
    sellerName: string,
    settlementId: number,
  ): Promise<void> {
    const formattedAmount = `AED ${Number(grossSellerAmount).toFixed(2)}`;
    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Action Required: Set Commission Rate</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #ff6b35; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .settlement-details { 
              background-color: #e9ecef; 
              padding: 20px; 
              border-radius: 8px; 
              margin: 20px 0; 
              border-left: 4px solid #ff6b35;
            }
            .amount { 
              font-size: 24px; 
              font-weight: bold; 
              color: #ff6b35; 
              text-align: center;
              margin: 15px 0;
              padding: 10px;
              background-color: #fff;
              border-radius: 5px;
            }
            .action-required {
              background-color: #fff3cd;
              border: 2px solid #ffc107;
              padding: 15px;
              border-radius: 5px;
              margin: 20px 0;
              text-align: center;
            }
            .cta-button {
              display: inline-block;
              padding: 12px 30px;
              background-color: #ff6b35;
              color: white;
              text-decoration: none;
              border-radius: 5px;
              font-weight: bold;
              margin: 10px 0;
            }
            .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
            .highlight { background-color: #fff3cd; padding: 2px 5px; border-radius: 3px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>⚠️ Action Required: Set Commission Rate</h1>
            </div>
            <div class="content">
              <p>Hello ${managerName},</p>
              
              <div class="action-required">
                <p><strong>🔔 A new settlement is awaiting your commission rate input!</strong></p>
              </div>
              
              <p>An order has been delivered and the admin has processed the settlement. As the referral manager, you need to set your commission rate to complete the settlement process.</p>
              
              <div class="settlement-details">
                <h3>Settlement Details:</h3>
                <p><strong>Settlement ID:</strong> #${settlementId}</p>
                <p><strong>Order ID:</strong> #${orderRequestId}</p>
                <p><strong>Seller:</strong> ${sellerName}</p>
                <p><strong>Date:</strong> ${currentDate}</p>
                
                <p><strong>Gross Seller Amount (Base for Commission):</strong></p>
                <div class="amount">${formattedAmount}</div>
                
                <p style="font-size: 12px; color: #666; margin-top: 10px;">
                  <em>This is the amount from which your commission percentage will be calculated.</em>
                </p>
              </div>
              
              <div class="action-required">
                <p><strong>What you need to do:</strong></p>
                <p>Please log in to your dashboard and set your commission rate for this settlement.</p>
                <p>The seller's final payment depends on your commission rate input.</p>
              </div>
              
              <p style="text-align: center; margin: 20px 0;">
                <strong>⏰ Please take action as soon as possible to avoid delays in payment processing.</strong>
              </p>
              
              <p>If you have any questions about this settlement, please contact the admin team.</p>
            </div>
            <div class="footer">
              <p>© 2025 Furniture Marketplace. All rights reserved.</p>
              <p>This is an automated notification. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
      Hello ${managerName},
      
      ⚠️ ACTION REQUIRED: Set Commission Rate
      
      A new settlement is awaiting your commission rate input!
      
      An order has been delivered and the admin has processed the settlement. As the referral manager, you need to set your commission rate to complete the settlement process.
      
      Settlement Details:
      - Settlement ID: #${settlementId}
      - Order ID: #${orderRequestId}
      - Seller: ${sellerName}
      - Date: ${currentDate}
      - Gross Seller Amount (Base for Commission): ${formattedAmount}
      
      This is the amount from which your commission percentage will be calculated.
      
      What you need to do:
      Please log in to your dashboard and set your commission rate for this settlement.
      The seller's final payment depends on your commission rate input.
      
      ⏰ Please take action as soon as possible to avoid delays in payment processing.
      
      If you have any questions about this settlement, please contact the admin team.
      
      © 2025 Furniture Marketplace. All rights reserved.
      This is an automated notification. Please do not reply to this email.
    `;

    await this.sendEmail({
      to: email,
      subject: `⚠️ Action Required: Set Commission Rate for Order #${orderRequestId}`,
      html,
      text,
    });
  }
}
