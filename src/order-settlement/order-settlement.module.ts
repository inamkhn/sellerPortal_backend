import { Module } from '@nestjs/common';
import { OrderSettlementController } from './order-settlement.controller';
import { OrderSettlementService } from './order-settlement.service';
import { DatabaseModule } from '../database/database.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [DatabaseModule, NotificationsModule],
  controllers: [OrderSettlementController],
  providers: [OrderSettlementService],
  exports: [OrderSettlementService],
})
export class OrderSettlementModule {}
