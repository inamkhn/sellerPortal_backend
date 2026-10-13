import { IsOptional, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class UploadMessageDto {
    @ApiProperty({
        description: 'Optional message content to accompany the file',
        required: false,
        maxLength: 1000,
        example: 'Check out this image!',
    })
    @IsOptional()
    @IsString()
    @MaxLength(1000, { message: 'Content cannot exceed 1000 characters' })
    @Transform(({ value }) => value?.trim())
    content?: string;

    @ApiProperty({
        type: 'string',
        format: 'binary',
        description: 'File to upload (max 10MB)',
    })
    file: any;
}
