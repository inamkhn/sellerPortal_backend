import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { DatabaseModule } from '../database/database.module';
import { PAYOUT_REMINDER_QUEUE } from '../settlement/settlement.constants';
import { HealthController } from './health.controller';

@Module({
  imports: [DatabaseModule, BullModule.registerQueue({ name: PAYOUT_REMINDER_QUEUE })],
  controllers: [HealthController],
})
export class HealthModule {}
