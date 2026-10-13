import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddReactionDto {
    @ApiProperty({
        description: 'Emoji to add as reaction',
        example: '👍',
    })
    @IsString()
    emoji: string;
}
