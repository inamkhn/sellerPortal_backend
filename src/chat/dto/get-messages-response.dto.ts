import { ApiProperty } from '@nestjs/swagger';

export class MessageSenderDto {
    @ApiProperty({ description: 'User ID', example: 1 })
    id: number;

    @ApiProperty({ description: 'First name', example: 'John', nullable: true })
    firstName: string | null;

    @ApiProperty({ description: 'Last name', example: 'Doe', nullable: true })
    lastName: string | null;

    @ApiProperty({ description: 'Email address', example: 'john@example.com' })
    email: string;

    @ApiProperty({ description: 'User role', example: 'USER', enum: ['USER', 'ADMIN', 'REFERRAL_MANAGER'] })
    role: string;

    @ApiProperty({ description: 'Avatar URL', example: 'https://...', nullable: true })
    avatar: string | null;
}

export class GroupMessageDto {
    @ApiProperty({ description: 'Message ID', example: 123 })
    id: number;

    @ApiProperty({ description: 'Group chat ID', example: 1 })
    groupChatId: number;

    @ApiProperty({ description: 'Sender user ID', example: 5 })
    senderId: number;

    @ApiProperty({ description: 'Message content', example: 'Hello everyone!', nullable: true })
    content: string | null;

    @ApiProperty({ description: 'Message type', example: 'TEXT', enum: ['TEXT', 'IMAGE', 'VIDEO', 'DOCUMENT', 'FILE'] })
    messageType: string;

    @ApiProperty({ description: 'File URL if message has attachment', nullable: true })
    fileUrl: string | null;

    @ApiProperty({ description: 'File name if message has attachment', nullable: true })
    fileName: string | null;

    @ApiProperty({ description: 'File size in bytes', nullable: true })
    fileSize: number | null;

    @ApiProperty({ description: 'File MIME type', nullable: true })
    mimeType: string | null;

    @ApiProperty({ description: 'Whether message is pinned', example: false })
    isPinned: boolean;

    @ApiProperty({ description: 'User ID who pinned the message', nullable: true })
    pinnedBy: number | null;

    @ApiProperty({ description: 'When message was pinned', nullable: true })
    pinnedAt: Date | null;

    @ApiProperty({ description: 'Emoji reactions', example: { '👍': [1, 2, 3] }, nullable: true })
    reactions: Record<string, number[]> | null;

    @ApiProperty({ description: 'ID of message being replied to', nullable: true })
    replyToId: number | null;

    @ApiProperty({ description: 'Whether message is deleted', example: false })
    isDeleted: boolean;

    @ApiProperty({ description: 'When message was deleted', nullable: true })
    deletedAt: Date | null;

    @ApiProperty({ description: 'When message was created' })
    createdAt: Date;

    @ApiProperty({ description: 'When message was last updated' })
    updatedAt: Date;

    @ApiProperty({ description: 'Message sender details', type: MessageSenderDto })
    sender: MessageSenderDto;
}

export class GetMessagesResponseDto {
    @ApiProperty({
        description: 'Array of messages',
        type: [GroupMessageDto],
    })
    data: GroupMessageDto[];

    @ApiProperty({
        description: 'Whether there are more messages to load',
        example: true,
    })
    hasMore: boolean;

    @ApiProperty({
        description: 'Cursor for next page (ID of last message)',
        example: 100,
        nullable: true,
    })
    nextCursor: number | null;
}
