import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { ServeStaticModule } from '@nestjs/serve-static';
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
import { FactoryPaymentsModule } from './factory-payments/factory-payments.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
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
    ScheduleModule.forRoot(),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
    }),
    DatabaseModule,
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
    FactoryPaymentsModule,
  ],
})
export class AppModule {}
