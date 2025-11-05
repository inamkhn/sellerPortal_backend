import { IsOptional, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class GetMessagesDto {
  @ApiProperty({
    description: 'Cursor for pagination (last message ID)',
    required: false,
    example: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  cursor?: number;

  @ApiProperty({
    description: 'Number of messages to fetch',
    required: false,
    default: 50,
    example: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 50;
}
