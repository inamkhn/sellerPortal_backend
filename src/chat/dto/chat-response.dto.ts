import { ApiProperty } from '@nestjs/swagger';

export class MarkAsReadResponseDto {
    @ApiProperty({ description: 'Operation success status', example: true })
    success: boolean;
}

export class DeleteMessageResponseDto {
    @ApiProperty({ description: 'Operation success status', example: true })
    success: boolean;

    @ApiProperty({ description: 'Success message', example: 'Message deleted' })
    message: string;
}

export class ReactionResponseDto {
    @ApiProperty({ description: 'Operation success status', example: true })
    success: boolean;

    @ApiProperty({
        description: 'Updated reactions object',
        example: { '👍': [1, 2, 3], '❤️': [4, 5] },
    })
    reactions: Record<string, number[]>;
}
