import { ApiProperty } from '@nestjs/swagger';
import { MessageType, MessageStatus } from '@prisma/client';

export class MessageSenderResponse {
  @ApiProperty()
  id: number;

  @ApiProperty()
  firstName: string | null;

  @ApiProperty()
  lastName: string | null;

  @ApiProperty()
  avatar: string | null;
}

export class MessageResponse {
  @ApiProperty()
  id: number;

  @ApiProperty()
  content: string | null;

  @ApiProperty({ enum: MessageType })
  messageType: MessageType;

  @ApiProperty()
  fileUrl: string | null;

  @ApiProperty()
  fileName: string | null;

  @ApiProperty()
  fileSize: number | null;

  @ApiProperty()
  mimeType: string | null;

  @ApiProperty()
  duration: number | null;

  @ApiProperty({ enum: MessageStatus })
  status: MessageStatus;

  @ApiProperty()
  isEdited: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({ type: MessageSenderResponse })
  sender: MessageSenderResponse;
}

export class MessageListResponse {
  @ApiProperty({ type: [MessageResponse] })
  data: MessageResponse[];

  @ApiProperty()
  hasMore: boolean;

  @ApiProperty()
  nextCursor: number | null;
}
