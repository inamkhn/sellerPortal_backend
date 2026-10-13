import { ServiceUnavailableException } from '@nestjs/common';
import { Queue } from 'bull';
import { PrismaService } from '../database/database.service';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  function setup() {
    const query = jest.fn().mockResolvedValue([{ '?column?': 1 }]);
    const ping = jest.fn().mockResolvedValue('PONG');
    const controller = new HealthController(
      { $queryRaw: query } as unknown as PrismaService,
      { client: { ping } } as unknown as Queue,
    );
    return { controller, query, ping };
  }
  it('checks both database and queue readiness', async () => {
    const { controller, query, ping } = setup();
    await expect(controller.ready()).resolves.toEqual({ status: 'ok' });
    expect(query).toHaveBeenCalled();
    expect(ping).toHaveBeenCalled();
  });
  it('keeps liveness independent of dependencies', () => {
    const { controller, query, ping } = setup();
    expect(controller.live()).toEqual({ status: 'ok' });
    expect(query).not.toHaveBeenCalled();
    expect(ping).not.toHaveBeenCalled();
  });
  it.each(['database', 'redis'])('returns 503 when %s fails without leaking details', async (dependency) => {
    const { controller, query, ping } = setup();
    (dependency === 'database' ? query : ping).mockRejectedValue(new Error('secret connection detail'));
    await expect(controller.ready()).rejects.toThrow(new ServiceUnavailableException('Dependencies unavailable'));
  });
  it('bounds a hanging dependency check', async () => {
    jest.useFakeTimers();
    try {
      const { controller, ping } = setup();
      ping.mockReturnValue(new Promise(() => {}));
      const result = expect(controller.ready()).rejects.toBeInstanceOf(ServiceUnavailableException);
      await jest.advanceTimersByTimeAsync(3000);
      await result;
    } finally {
      jest.useRealTimers();
    }
  });
});
