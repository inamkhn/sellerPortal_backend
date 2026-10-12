import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class SendPayoutReminderDto {
  @ApiProperty({
    description: 'Unique campaign key for idempotency (example: payout-reminder-2026-03)',
    example: 'payout-reminder-2026-03',
  })
  @IsString()
  @MinLength(3)
  @MaxLength(80)
  campaignKey: string;

  @ApiProperty({
    description: 'Custom subject line for reminder email',
    required: false,
    example: 'Reminder: Submit your payout request',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  subject?: string;

  @ApiProperty({
    description: 'Custom message body intro for reminder email',
    required: false,
    example: 'If you have pending payouts, please submit your request during active payout window.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1500)
  message?: string;

  @ApiProperty({
    description: 'Force resend even if this campaign key was already sent',
    required: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  forceResend?: boolean;
}
