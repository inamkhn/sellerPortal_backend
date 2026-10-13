import { ApiProperty } from '@nestjs/swagger';

export class GlobalChatInfoResponseDto {
    @ApiProperty({
        description: 'Global chat ID',
        example: 1,
    })
    id: number;

    @ApiProperty({
        description: 'Chat room name',
        example: 'Global Chat',
    })
    name: string;

    @ApiProperty({
        description: 'Chat room description',
        example: 'Community chat for all users',
        nullable: true,
    })
    description: string | null;

    @ApiProperty({
        description: 'Total number of participants',
        example: 95,
    })
    participantCount: number;

    @ApiProperty({
        description: 'Number of unread messages for current user',
        example: 5,
    })
    unreadCount: number;

    @ApiProperty({
        description: 'When user last read messages',
        example: '2026-02-06T16:00:00Z',
        nullable: true,
    })
    lastReadAt: Date | null;

    @ApiProperty({
        description: 'When chat was created',
        example: '2026-02-06T15:00:00Z',
    })
    createdAt: Date;

    @ApiProperty({
        description: 'When chat was last updated',
        example: '2026-02-06T16:30:00Z',
    })
    updatedAt: Date;

    @ApiProperty({
        description: 'When last message was sent',
        example: '2026-02-06T16:30:00Z',
        nullable: true,
    })
    lastMessageAt: Date | null;
}
