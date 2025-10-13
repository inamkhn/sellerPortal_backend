import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { ServeStaticModule } from '@nestjs/serve-static';
import { LoggerModule } from 'nestjs-pino';
import { join } from 'path';

import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProfileModule } from './profile/profile.module';
import { ProductsModule } from './products/products.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';
import { ReferralsModule } from './referrals/referrals.module';
import { UploadModule } from './upload/upload.module';
import { UserAnalyticsModule } from './user-analytics/user-analytics.module';
import { AdminAnalyticsModule } from './admin-analytics/admin-analytics.module';
import { FacebookIntegrationModule } from './facebook-integration/facebook-integration.module';
import facebookConfig from './facebook-integration/config/facebook.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [facebookConfig],
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
    UsersModule,
    ProfileModule,
    ProductsModule,
    OrdersModule,
    PaymentsModule,
    ReferralsModule,
    UploadModule,
    UserAnalyticsModule,
    AdminAnalyticsModule,
    FacebookIntegrationModule,
  ],
})
export class AppModule {}
