import { ApiProperty } from '@nestjs/swagger';
import { ChatRoomType } from '@prisma/client';

export class ChatParticipantResponse {
  @ApiProperty()
  id: number;

  @ApiProperty()
  email: string;

  @ApiProperty()
  firstName: string | null;

  @ApiProperty()
  lastName: string | null;

  @ApiProperty()
  avatar: string | null;

  @ApiProperty()
  role: string;
}

export class LastMessageResponse {
  @ApiProperty()
  id: number;

  @ApiProperty()
  content: string | null;

  @ApiProperty()
  messageType: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  sender: {
    id: number;
    firstName: string | null;
    lastName: string | null;
  };
}

export class ChatRoomResponse {
  @ApiProperty()
  id: number;

  @ApiProperty({ enum: ChatRoomType })
  type: ChatRoomType;

  @ApiProperty()
  lastMessageAt: Date | null;

  @ApiProperty()
  unreadCount: number;

  @ApiProperty({ type: [ChatParticipantResponse] })
  participants: ChatParticipantResponse[];

  @ApiProperty({ type: LastMessageResponse, nullable: true })
  lastMessage: LastMessageResponse | null;

  @ApiProperty()
  createdAt: Date;
}

export class ChatRoomListResponse {
  @ApiProperty({ type: [ChatRoomResponse] })
  data: ChatRoomResponse[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;
}
