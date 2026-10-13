import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../database/database.service';
import { PAYOUT_REMINDER_QUEUE } from '../settlement/settlement.constants';

@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(PAYOUT_REMINDER_QUEUE) private readonly queue: Queue,
  ) {}

  @Get()
  live() { return { status: 'ok' }; }

  @Get('ready')
  async ready() {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        Promise.all([this.prisma.$queryRaw`SELECT 1`, this.queue.client.ping()]),
        new Promise((_, reject) => {
          timer = setTimeout(() => reject(new Error('Readiness timeout')), 3000);
        }),
      ]);
      return { status: 'ok' };
    } catch {
      throw new ServiceUnavailableException('Dependencies unavailable');
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
}
