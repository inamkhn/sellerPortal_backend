import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/database.service';
import { EmailService } from '../common/services/email.service';
import { PAYOUT_REMINDER_JOB, PAYOUT_REMINDER_QUEUE } from './settlement.constants';

interface PayoutReminderJobData {
  userId: number;
  email: string;
  fullName?: string | null;
  campaignKey: string;
  subject?: string;
  message?: string;
  forceResend?: boolean;
}

@Injectable()
@Processor(PAYOUT_REMINDER_QUEUE)
export class SettlementReminderProcessor {
  private readonly logger = new Logger(SettlementReminderProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  @Process(PAYOUT_REMINDER_JOB)
  async processReminder(job: Job<PayoutReminderJobData>) {
    const {
      userId,
      email,
      fullName,
      campaignKey,
      subject,
      message,
      forceResend = false,
    } = job.data;

    if (!forceResend) {
      const existing = await this.prisma.notification.findFirst({
        where: {
          userId,
          type: 'SYSTEM',
          AND: [
            {
              metadata: {
                path: ['kind'],
                equals: 'PAYOUT_REMINDER_EMAIL',
              },
            },
            {
              metadata: {
                path: ['campaignKey'],
                equals: campaignKey,
              },
            },
          ],
        },
      });

      if (existing) {
        return { skipped: true, reason: 'already-sent' };
      }
    }

    await this.emailService.sendPayoutReminderEmail(
      email,
      fullName || email,
      subject,
      message,
    );

    await this.prisma.notification.create({
      data: {
        userId,
        type: 'SYSTEM',
        title: 'Payout Request Reminder',
        message:
          'If you have pending payouts, please submit your payout request during active payout windows.',
        actionUrl: '/settlements',
        metadata: {
          kind: 'PAYOUT_REMINDER_EMAIL',
          campaignKey,
          emailedAt: new Date().toISOString(),
          via: 'bull',
        },
      },
    });

    this.logger.log(
      `Payout reminder email sent to user=${userId}, campaign=${campaignKey}`,
    );
    return { sent: true };
  }
}
