import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { ServeStaticModule } from '@nestjs/serve-static';
import { BullModule } from '@nestjs/bull';
import { LoggerModule } from 'nestjs-pino';
import { join } from 'path';

import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { ProfileModule } from './profile/profile.module';
import { ProductsModule } from './products/products.module';
import { UploadModule } from './upload/upload.module';
import { CategoryModule } from './category/category.module';
import { OrderRequestModule } from './order-request/order-request.module';
import { CustomProductModule } from './custom-product/custom-product.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { OrderSettlementModule } from './order-settlement/order-settlement.module';
import { SettlementModule } from './settlement/settlement.module';
import { ReferralsModule } from './referrals/referrals.module';
import { UsersModule } from './users/users.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { ChatModule } from './chat/chat.module';
import { AnnouncementsModule } from './announcements/announcements.module';
import { NotificationsModule } from './notifications/notifications.module';
import { FactoryPaymentModule } from './factory-payment/factory-payment.module';
import { HealthModule } from './health/health.module';
import { validateEnvironment } from './config/validate-environment';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate: validateEnvironment,
    }),
    LoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const isProduction = configService.get('NODE_ENV') === 'production';

        return {
          pinoHttp: {
            level: isProduction ? 'info' : 'debug',
            transport: isProduction
              ? undefined
              : {
                  target: 'pino-pretty',
                  options: {
                    colorize: true,
                    translateTime: 'SYS:standard',
                    ignore: 'pid,hostname',
                    singleLine: true,
                  },
                },
            serializers: {
              req: (req: {
                id?: string;
                method?: string;
                url?: string;
                remoteAddress?: string;
                remotePort?: number;
              }) => ({
                id: req.id || '',
                method: req.method || '',
                url: req.url || '',
                remoteAddress: req.remoteAddress || '',
                remotePort: req.remotePort || 0,
              }),
              res: (res: { statusCode?: number }) => ({
                statusCode: res.statusCode || 0,
              }),
            },
          },
        };
      },
    }),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000, // 60 seconds in milliseconds
        limit: 10,
      },
    ]),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisUrlRaw = configService.get<string>('REDIS_URL');
        const redisHostRaw = configService.get<string>('REDIS_HOST');
        const redisPortRaw = configService.get<string>('REDIS_PORT');
        const redisPasswordRaw = configService.get<string>('REDIS_PASSWORD');
        const useTls = configService.get<string>('REDIS_TLS', 'true') === 'true';

        let host = redisHostRaw;
        let port = Number(redisPortRaw || 6379);
        let password = redisPasswordRaw;

        const extractUrlFromRaw = (value?: string): string | null => {
          if (!value) return null;
          const trimmed = value.trim();
          if (trimmed.startsWith('redis://') || trimmed.startsWith('rediss://')) {
            return trimmed;
          }
          const match = trimmed.match(/(rediss?:\/\/\S+)/);
          return match ? match[1] : null;
        };

        const redisUrl = extractUrlFromRaw(redisUrlRaw) || extractUrlFromRaw(redisHostRaw);
        if (redisUrl) {
          const parsed = new URL(redisUrl);
          host = parsed.hostname || host;
          port = parsed.port ? Number(parsed.port) : port;
          password = decodeURIComponent(parsed.password || password || '');
        }

        return {
          redis: {
            host,
            port,
            password,
            tls: useTls ? {} : undefined,
          },
          defaultJobOptions: {
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 2000,
            },
            removeOnComplete: 1000,
            removeOnFail: 5000,
          },
        };
      },
    }),
    ScheduleModule.forRoot(),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
    }),
    DatabaseModule,
    HealthModule,
    AuthModule,
    ProfileModule,
    ProductsModule,
    UploadModule,
    CategoryModule,
    OrderRequestModule,
    CustomProductModule,
    DashboardModule,
    OrderSettlementModule,
    SettlementModule,
    ReferralsModule,
    UsersModule,
    AnalyticsModule,
    ChatModule,
    AnnouncementsModule,
    NotificationsModule,
    FactoryPaymentModule,
  ],
})
export class AppModule {}
