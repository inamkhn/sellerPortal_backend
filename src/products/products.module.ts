import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { UploadModule } from '../upload/upload.module';
import { ProfileModule } from '../profile/profile.module';

@Module({
  imports: [UploadModule, ProfileModule],
  controllers: [ProductsController],
  providers: [ProductsService],
})
export class ProductsModule {}
