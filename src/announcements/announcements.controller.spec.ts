import { Test, TestingModule } from '@nestjs/testing';
import { AnnouncementsController } from './announcements.controller';
import { AnnouncementsService } from './announcements.service';
import { Role } from '@prisma/client';

describe('AnnouncementsController - Admin Settings Toggles', () => {
    let controller: AnnouncementsController;
    let service: AnnouncementsService;

    const mockAdminUser = {
        id: 1,
        email: 'admin@test.com',
        role: Role.ADMIN,
    } as any;

    beforeEach(async () => {
        const mockAnnouncementsService = {
            getAllAnnouncements: jest.fn(),
            createSystemAnnouncement: jest.fn(),
            updateAnnouncement: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [AnnouncementsController],
            providers: [
                {
                    provide: AnnouncementsService,
                    useValue: mockAnnouncementsService,
                },
            ],
        }).compile();

        controller = module.get<AnnouncementsController>(AnnouncementsController);
        service = module.get<AnnouncementsService>(AnnouncementsService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Payout Window Settings (DISABLE_PAYOUT_WINDOWS)', () => {
        it('getAllAnnouncements should return the DISABLE_PAYOUT_WINDOWS status', async () => {
            // Arrange
            const mockQuery = { title: 'DISABLE_PAYOUT_WINDOWS' };
            const expectedResponse = {
                data: [
                    {
                        id: 99,
                        adminId: mockAdminUser.id,
                        title: 'DISABLE_PAYOUT_WINDOWS',
                        message: 'System halt',
                        priority: 'URGENT' as any,
                        targetRole: null,
                        isActive: true,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        expiresAt: null,
                    },
                ],
                total: 1,
                page: 1,
                limit: 20,
                totalPages: 1,
            };

            jest.spyOn(service, 'getAllAnnouncements').mockResolvedValue(expectedResponse);

            // Act
            const result = await controller.getAllAnnouncements(mockQuery);

            // Assert
            expect(service.getAllAnnouncements).toHaveBeenCalledWith(mockQuery);
            expect(result).toEqual(expectedResponse);
            expect(result.data[0].isActive).toBe(true);
        });

        it('createSystemAnnouncement should create the DISABLE_PAYOUT_WINDOWS toggle', async () => {
            // Arrange
            const mockDto = {
                title: 'DISABLE_PAYOUT_WINDOWS',
                message: 'System halt',
                priority: 'URGENT' as any,
            };

            const expectedResponse = {
                id: 99,
                adminId: mockAdminUser.id,
                ...mockDto,
                notificationsSent: 0,
            } as any;

            jest.spyOn(service, 'createSystemAnnouncement').mockResolvedValue(expectedResponse);

            // Act
            const result = await controller.createSystemAnnouncement(mockAdminUser, mockDto);

            // Assert
            expect(service.createSystemAnnouncement).toHaveBeenCalledWith(mockAdminUser.id, mockDto);
            expect(result).toEqual(expectedResponse);
        });

        it('updateAnnouncement should toggle isActive for DISABLE_PAYOUT_WINDOWS', async () => {
            // Arrange
            const announcementId = 99;
            const mockDto = { isActive: false };

            const expectedResponse = {
                id: announcementId,
                adminId: mockAdminUser.id,
                title: 'DISABLE_PAYOUT_WINDOWS',
                message: 'System halt',
                priority: 'URGENT' as any,
                targetRole: null,
                isActive: false,
                createdAt: new Date(),
                updatedAt: new Date(),
                expiresAt: null,
            } as any;

            jest.spyOn(service, 'updateAnnouncement').mockResolvedValue(expectedResponse);

            // Act
            const result = await controller.updateAnnouncement(mockAdminUser, announcementId, mockDto);

            // Assert
            expect(service.updateAnnouncement).toHaveBeenCalledWith(
                announcementId,
                mockAdminUser.id,
                mockDto,
            );
            expect(result.isActive).toBe(false);
        });
    });
});
