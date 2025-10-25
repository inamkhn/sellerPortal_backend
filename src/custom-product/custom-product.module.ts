import { Module } from '@nestjs/common';
import { CustomProductController } from './custom-product.controller';
import { CustomProductService } from './custom-product.service';
import { DatabaseModule } from '../database/database.module';
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [DatabaseModule, UploadModule],
  controllers: [CustomProductController],
  providers: [CustomProductService],
  exports: [CustomProductService],
})
export class CustomProductModule { }
