import { Test, TestingModule } from '@nestjs/testing';
import { SettlementService } from './settlement.service';
import { PrismaService } from '../database/database.service';
import { EmailService } from '../common/services/email.service';
import { BadRequestException } from '@nestjs/common';

describe('SettlementService - Payout Windows', () => {
    let service: SettlementService;
    let prismaService: PrismaService;

    beforeEach(async () => {
        // Mock PrismaService
        const mockPrismaService = {
            announcement: {
                findFirst: jest.fn(),
            },
        };

        // Mock EmailService
        const mockEmailService = {
            sendSettlementPaymentEmail: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SettlementService,
                { provide: PrismaService, useValue: mockPrismaService },
                { provide: EmailService, useValue: mockEmailService },
            ],
        }).compile();

        service = module.get<SettlementService>(SettlementService);
        prismaService = module.get<PrismaService>(PrismaService);
    });

    afterEach(() => {
        jest.clearAllMocks();
        jest.useRealTimers();
    });

    describe('isPayoutWindowActive', () => {
        it('should return false if DISABLE_PAYOUT_WINDOWS announcement is active', async () => {
            // Arrange
            jest.spyOn(prismaService.announcement, 'findFirst').mockResolvedValue({
                id: 1,
                adminId: 1,
                title: 'DISABLE_PAYOUT_WINDOWS',
                message: 'System test',
                priority: 'URGENT',
                targetRole: null,
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
                expiresAt: null,
            } as any);

            // Act
            const result = await service.isPayoutWindowActive();

            // Assert
            expect(result).toBe(false);
        });

        it('should return true on the 30th of the month', async () => {
            // Arrange
            jest.spyOn(prismaService.announcement, 'findFirst').mockResolvedValue(null);
            jest.useFakeTimers().setSystemTime(new Date('2026-04-30T12:00:00Z'));

            // Act
            const result = await service.isPayoutWindowActive();

            // Assert
            expect(result).toBe(true);
        });

        it('should return true on the 31st of the month', async () => {
            // Arrange
            jest.spyOn(prismaService.announcement, 'findFirst').mockResolvedValue(null);
            jest.useFakeTimers().setSystemTime(new Date('2026-05-31T12:00:00Z'));

            // Act
            const result = await service.isPayoutWindowActive();

            // Assert
            expect(result).toBe(true);
        });

        it('should return false on the 15th of the month (old window)', async () => {
            // Arrange
            jest.spyOn(prismaService.announcement, 'findFirst').mockResolvedValue(null);
            jest.useFakeTimers().setSystemTime(new Date('2026-05-15T12:00:00Z'));

            // Act
            const result = await service.isPayoutWindowActive();

            // Assert
            expect(result).toBe(false);
        });

        it('should return true on the 1st of the month ONLY if the previous month had < 31 days', async () => {
            // Arrange
            jest.spyOn(prismaService.announcement, 'findFirst').mockResolvedValue(null);

            // Test March 1st (February has < 31 days)
            jest.useFakeTimers().setSystemTime(new Date('2026-03-01T12:00:00Z'));
            let result = await service.isPayoutWindowActive();
            expect(result).toBe(true);

            // Test May 1st (April has 30 days, which is < 31)
            jest.useFakeTimers().setSystemTime(new Date('2026-05-01T12:00:00Z'));
            result = await service.isPayoutWindowActive();
            expect(result).toBe(true);

            // Test August 1st (July has 31 days, so 1st shouldn't be a payout day)
            jest.useFakeTimers().setSystemTime(new Date('2026-08-01T12:00:00Z'));
            result = await service.isPayoutWindowActive();
            expect(result).toBe(false);
        });
    });

    describe('getNextPayoutDate', () => {
        it('should return the 30th of the CURRENT month if we are before the 30th', async () => {
            jest.spyOn(prismaService.announcement, 'findFirst').mockResolvedValue(null);
            jest.useFakeTimers().setSystemTime(new Date('2026-03-15T12:00:00Z'));

            const result = await service.getNextPayoutDate();
            const date = new Date(result);

            // Should point to March 30th
            expect(date.getDate()).toBe(30);
            expect(date.getMonth()).toBe(2); // 0-indexed March
        });

        it('should return the 30th of the NEXT month if we are between windows (e.g. 2nd)', async () => {
            jest.spyOn(prismaService.announcement, 'findFirst').mockResolvedValue(null);
            jest.useFakeTimers().setSystemTime(new Date('2026-03-02T12:00:00Z'));

            const result = await service.getNextPayoutDate();
            const date = new Date(result);

            // Should point to March 30th (since 2 is before 30)
            expect(date.getDate()).toBe(30);
            expect(date.getMonth()).toBe(2);
        });
    });
});
