import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsArray,
  IsInt,
  Length,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { BankAccount } from '@prisma/client';

export class UpdateProfileDto {
  @ApiProperty({
    description: 'Full name of the user',
    example: 'John Doe Updated',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Length(2, 100, { message: 'Full name must be between 2 and 100 characters' })
  fullName?: string;

  @ApiProperty({
    description: 'User address',
    example: '456 Updated Street, Karachi, Pakistan',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Length(5, 500, { message: 'Address must be between 5 and 500 characters' })
  address?: string;

  @ApiProperty({
    description: 'WhatsApp number',
    example: '03009876543',
    required: false,
  })
  @IsOptional()
  @IsString()
  whatsappNumber?: string;

  @ApiProperty({
    description: 'Bank account type',
    enum: BankAccount,
    example: BankAccount.JAZZCASH,
    required: false,
  })
  @IsOptional()
  @IsEnum(BankAccount, { message: 'Invalid bank account type' })
  bankAccount?: BankAccount;

  @ApiProperty({
    description: 'Bank account number',
    example: '03009876543',
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
  // @Length(2, 100, {
  //   message: 'Bank name must be between 2 and 100 characters',
  // })
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
    example: 'https://facebook.com/johndoe.updated',
    required: false,
  })
  @IsOptional()
  @IsString()
  facebookLink?: string;

  @ApiProperty({
    description: 'Dubizzle profile link (optional, can be empty)',
    example: 'https://dubizzle.com/users/johndoe.updated',
    required: false,
  })
  @IsOptional()
  @IsString()
  dubizzleLink?: string;

  @ApiProperty({
    description: 'Profile verification status (admin only)',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  verified?: boolean;

  @ApiProperty({
    description: 'Referral code (8 characters, alphanumeric)',
    example: 'XYZ98765',
    minLength: 8,
    maxLength: 8,
    required: false,
  })
  @IsOptional()
  @IsString()
  @Length(8, 8, { message: 'Referral code must be exactly 8 characters' })
  @Matches(/^[A-Z0-9]{8}$/, {
    message: 'Referral code must contain only uppercase letters and numbers',
  })
  referralCode?: string;

  @ApiProperty({
    description: 'ID of the user who referred this user',
    example: 2,
    required: false,
  })
  @IsOptional()
  @IsInt({ message: 'Referred by must be a valid user ID' })
  referredBy?: number;

  @ApiProperty({
    description: 'List of product IDs that this user has listed',
    example: ['product-1', 'product-2', 'product-3'],
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true, message: 'Each listed product must be a string' })
  listedProducts?: string[];
}
