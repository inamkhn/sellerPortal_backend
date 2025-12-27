import { IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { Role } from '@prisma/client';

export class UpdateRoleDto {
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @IsOptional()
  @IsBoolean()
  verified?: boolean; // Optional: Set profile.verified status
}
