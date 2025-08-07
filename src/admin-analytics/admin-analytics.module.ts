import { Module } from '@nestjs/common';
import { AdminAnalyticsController } from './admin-analytics.controller';
import { AdminAnalyticsService } from './admin-analytics.service';
import { AdminRoleGuard } from './guards/admin-role.guard';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [AdminAnalyticsController],
  providers: [AdminAnalyticsService, AdminRoleGuard],
  exports: [AdminAnalyticsService],
})
export class AdminAnalyticsModule {}
