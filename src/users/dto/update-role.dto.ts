import { IsEnum, IsNotEmpty } from 'class-validator';
import { Role } from '@prisma/client';

export class UpdateRoleDto {
  @IsNotEmpty()
  @IsEnum(Role)
  role: Role;
}
