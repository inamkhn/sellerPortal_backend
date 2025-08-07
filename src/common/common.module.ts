import { Module } from '@nestjs/common';
import { EmailModule } from './services/email.module';

@Module({
  imports: [EmailModule],
  exports: [EmailModule],
})
export class CommonModule {}
