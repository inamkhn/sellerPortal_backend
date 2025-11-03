import { IsInt, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SettlementType } from '@prisma/client';

export class CreateSettlementDto {
  @ApiProperty()
  @IsInt()
  @Type(() => Number)
  orderSettlementId!: number;

  @ApiProperty()
  @IsInt()
  @Type(() => Number)
  userId!: number;

  @ApiProperty({ enum: SettlementType })
  @IsEnum(SettlementType)
  settlementType!: SettlementType;

  @ApiProperty()
  @IsNumber()
  @Type(() => Number)
  amount!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
