import { Role } from '@prisma/client';

export class UserListItemDto {
  id: number;
  email: string;
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  avatar: string | null;
  role: Role;
  isVerified: boolean;
  whatsappNumber: string | null;
  lastLogin: Date | null;
  createdAt: Date;
  totalOrders: number;
  totalRevenue: number;
}

export class RoleCounts {
  all: number;
  users: number;
  referralManagers: number;
  admins: number;
  pending: number;
}

export class UserListResponseDto {
  users: UserListItemDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  roleCounts: RoleCounts;
}
