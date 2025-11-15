import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import {
  AnalyticsController,
  UserAnalyticsController,
} from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [
    DatabaseModule,
    CacheModule.register({
      ttl: 300, // Default 5 minutes
      max: 100, // Max items in cache
    }),
  ],
  controllers: [AnalyticsController, UserAnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
