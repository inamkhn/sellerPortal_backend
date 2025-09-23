import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FacebookIntegrationController } from './facebook-integration.controller';
import { FacebookIntegrationService } from './facebook-integration.service';
import { SeleniumWorkerService } from './selenium-worker.service';
import { ImageHandlerService } from './image-handler.service';
import { FacebookConfigService } from './services/facebook-config.service';
import { ProductsModule } from '../products/products.module';
import facebookConfig from './config/facebook.config';

@Module({
  imports: [ConfigModule.forFeature(facebookConfig), ProductsModule],
  controllers: [FacebookIntegrationController],
  providers: [
    FacebookIntegrationService,
    SeleniumWorkerService,
    ImageHandlerService,
    FacebookConfigService,
  ],
  exports: [FacebookIntegrationService, FacebookConfigService],
})
export class FacebookIntegrationModule {}
