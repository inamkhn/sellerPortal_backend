import { Module } from '@nestjs/common';
import { UserAnalyticsController } from './user-analytics.controller';
import { UserAnalyticsService } from './user-analytics.service';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [UserAnalyticsController],
  providers: [UserAnalyticsService],
  exports: [UserAnalyticsService],
})
export class UserAnalyticsModule {}
