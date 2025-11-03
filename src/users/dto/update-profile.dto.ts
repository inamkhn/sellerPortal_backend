import { IsOptional, IsString, IsEnum, IsBoolean } from 'class-validator';
import { BankAccount } from '@prisma/client';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  whatsappNumber?: string;

  @IsOptional()
  @IsEnum(BankAccount)
  bankAccount?: BankAccount;

  @IsOptional()
  @IsString()
  accountNumber?: string;

  @IsOptional()
  @IsString()
  facebookLink?: string;

  @IsOptional()
  @IsString()
  dubizzleLink?: string;

  @IsOptional()
  @IsBoolean()
  verified?: boolean;
}
