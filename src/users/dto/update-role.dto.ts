import { IsEnum, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';
import { Role } from '@prisma/client';

export class UpdateRoleDto {
  @IsNotEmpty()
  @IsEnum(Role)
  role: Role;

  @IsOptional()
  @IsBoolean()
  verified?: boolean; // Optional: Set profile.verified status
}
