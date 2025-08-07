import { ApiProperty } from '@nestjs/swagger';

export class ErrorDetailsDto {
  @ApiProperty({
    description: 'Error code identifier',
    example: 'ADMIN_ANALYTICS_FAILED',
  })
  code: string;

  @ApiProperty({
    description: 'Human-readable error message',
    example: 'Failed to calculate admin analytics',
  })
  message: string;

  @ApiProperty({
    description: 'Timestamp when the error occurred',
    example: '2024-01-15T10:30:00.000Z',
  })
  timestamp: string;
}

export class ErrorResponseDto {
  @ApiProperty({
    description: 'Indicates the request failed',
    example: false,
  })
  success: boolean;

  @ApiProperty({
    description: 'Error details',
    type: ErrorDetailsDto,
  })
  error: ErrorDetailsDto;
}
