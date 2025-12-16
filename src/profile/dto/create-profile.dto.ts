import {
  IsString,
  IsOptional,
  IsEnum,
  IsNotEmpty,
  Length,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { BankAccount } from '@prisma/client';

export class CreateProfileDto {
  @ApiProperty({
    description: 'Full name of the user',
    example: 'John Doe',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Length(2, 100, { message: 'Full name must be between 2 and 100 characters' })
  fullName?: string;

  @ApiProperty({
    description: 'User address',
    example: '123 Main Street, Karachi, Pakistan',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Length(5, 500, { message: 'Address must be between 5 and 500 characters' })
  address?: string;

  @ApiProperty({
    description: 'WhatsApp number with country code',
    example: '+923001234567',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Matches(/^\+[1-9]\d{1,14}$/, {
    message:
      'WhatsApp number must be in international format (e.g., +923001234567)',
  })
  whatsappNumber?: string;

  @ApiProperty({
    description: 'Bank account type',
    enum: BankAccount,
    example: BankAccount.EASYPAISA,
    required: false,
  })
  @IsOptional()
  @IsEnum(BankAccount, { message: 'Invalid bank account type' })
  bankAccount?: BankAccount;

  @ApiProperty({
    description: 'Bank account number',
    example: '03001234567',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Length(5, 50, {
    message: 'Account number must be between 5 and 50 characters',
  })
  accountNumber?: string;

  @ApiProperty({
    description: 'Bank name',
    example: 'Meezan Bank',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Length(2, 100, {
    message: 'Bank name must be between 2 and 100 characters',
  })
  bankName?: string;

  @ApiProperty({
    description: 'Account holder name',
    example: 'John Doe',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Length(2, 100, {
    message: 'Account title must be between 2 and 100 characters',
  })
  accountTitle?: string;

  @ApiProperty({
    description: 'Facebook profile link (optional, can be empty)',
    example: 'https://facebook.com/johndoe',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Matches(/^(https?:\/\/(www\.)?facebook\.com\/[a-zA-Z0-9.]+)?$/, {
    message: 'Please provide a valid Facebook profile URL or leave empty',
  })
  facebookLink?: string;

  @ApiProperty({
    description: 'Dubizzle profile link (optional, can be empty)',
    example: 'https://dubizzle.com/users/johndoe',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Matches(/^(https?:\/\/(www\.)?dubizzle\.com\/users\/[a-zA-Z0-9.]+)?$/, {
    message: 'Please provide a valid Dubizzle profile URL or leave empty',
  })
  dubizzleLink?: string;

  @ApiProperty({
    description: 'Referral code (8 characters, alphanumeric)',
    example: 'ABC12345',
    minLength: 8,
    maxLength: 8,
  })
  @IsNotEmpty({ message: 'Referral code is required' })
  @IsString()
  @Length(8, 8, { message: 'Referral code must be exactly 8 characters' })
  @Matches(/^[A-Z0-9]{8}$/, {
    message: 'Referral code must contain only uppercase letters and numbers',
  })
  referralCode: string;
}
