import { Module } from '@nestjs/common';
import { FactoryPaymentsController } from './factory-payments.controller';
import { FactoryPaymentsService } from './factory-payments.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [FactoryPaymentsController],
  providers: [FactoryPaymentsService],
  exports: [FactoryPaymentsService],
})
export class FactoryPaymentsModule {}
