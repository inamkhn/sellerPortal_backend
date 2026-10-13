import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { SettlementController } from './settlement.controller';
import { SettlementService } from './settlement.service';
import { DatabaseModule } from '../database/database.module';
import { UploadModule } from '../upload/upload.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { EmailModule } from '../common/services/email.module';
import { SettlementReminderProcessor } from './settlement-reminder.processor';
import { PAYOUT_REMINDER_QUEUE } from './settlement.constants';

@Module({
  imports: [
    DatabaseModule,
    UploadModule,
    NotificationsModule,
    EmailModule,
    BullModule.registerQueue({
      name: PAYOUT_REMINDER_QUEUE,
    }),
  ],
  controllers: [SettlementController],
  providers: [SettlementService, SettlementReminderProcessor],
  exports: [SettlementService],
})
export class SettlementModule {}
