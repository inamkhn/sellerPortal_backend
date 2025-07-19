import { IsString } from 'class-validator';

export class VerifyEmailDto {
  @IsString({ message: 'Verification token is required' })
  token: string;
}
