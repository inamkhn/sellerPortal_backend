import { Module } from '@nestjs/common';
import { FactoryPaymentService } from './factory-payment.service';
import { FactoryPaymentController } from './factory-payment.controller';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [FactoryPaymentController],
  providers: [FactoryPaymentService],
  exports: [FactoryPaymentService],
})
export class FactoryPaymentModule {}
