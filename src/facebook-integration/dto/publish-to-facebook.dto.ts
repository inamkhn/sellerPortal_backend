import { IsOptional, IsString, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PublishToFacebookDto {
  @ApiProperty({
    description: 'Meetup preference for the Facebook listing',
    example: 'Door drop-off',
    required: false,
    enum: ['Door drop-off', 'Pick up', 'Meet in public'],
  })
  @IsOptional()
  @IsString()
  meetupPreference?: string = 'Door drop-off';

  @ApiProperty({
    description: 'Whether to override existing Facebook posting',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  overrideExisting?: boolean = false;
}
