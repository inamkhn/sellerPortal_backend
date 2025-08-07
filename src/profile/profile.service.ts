import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../database/database.service';
import { Profile, Product } from '@prisma/client';
import { CreateProfileDto, UpdateProfileDto } from './dto';

export interface ProductWithOwner extends Product {
  owner: {
    id: number;
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
}

@Injectable()
export class ProfileService {
  constructor(private prisma: PrismaService) {}

  async createProfile(
    userId: number,
    createProfileDto: CreateProfileDto,
  ): Promise<Profile> {
    // Check if user already has a profile
    const existingProfile = await this.prisma.profile.findUnique({
      where: { userId },
    });

    if (existingProfile) {
      throw new ConflictException('User already has a profile');
    }

    // Check if referral code is already taken
    const existingReferralCode = await this.prisma.profile.findUnique({
      where: { referralCode: createProfileDto.referralCode },
    });

    if (existingReferralCode) {
      throw new ConflictException('Referral code is already taken');
    }

    // Validate referrer if referredBy is provided (optional for future use)
    let referredBy: number | undefined;

    // Create the profile
    const profile = await this.prisma.profile.create({
      data: {
        userId,
        fullName: createProfileDto.fullName,
        address: createProfileDto.address,
        whatsappNumber: createProfileDto.whatsappNumber,
        bankAccount: createProfileDto.bankAccount,
        accountNumber: createProfileDto.accountNumber,
        facebookLink: createProfileDto.facebookLink,
        dubizzleLink: createProfileDto.dubizzleLink,
        referralCode: createProfileDto.referralCode,
        referredBy,
        verified: false, // Admin will verify profiles
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
    });

    return profile;
  }

  async getProfile(userId: number): Promise<Profile | null> {
    return this.prisma.profile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            isVerified: true,
          },
        },
        referrer: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async updateProfile(
    userId: number,
    updateProfileDto: UpdateProfileDto,
  ): Promise<Profile> {
    // Check if profile exists
    const existingProfile = await this.prisma.profile.findUnique({
      where: { userId },
    });

    if (!existingProfile) {
      throw new NotFoundException('Profile not found');
    }

    // Check if referral code is being updated and if it's already taken
    if (
      updateProfileDto.referralCode &&
      updateProfileDto.referralCode !== existingProfile.referralCode
    ) {
      const existingReferralCode = await this.prisma.profile.findUnique({
        where: { referralCode: updateProfileDto.referralCode },
      });

      if (existingReferralCode) {
        throw new ConflictException('Referral code is already taken');
      }
    }

    // Validate referredBy user exists if provided
    if (updateProfileDto.referredBy !== undefined) {
      if (updateProfileDto.referredBy !== null) {
        const referrerUser = await this.prisma.user.findUnique({
          where: { id: updateProfileDto.referredBy },
        });

        if (!referrerUser) {
          throw new BadRequestException('Referrer user not found');
        }

        // Prevent self-referral
        if (updateProfileDto.referredBy === userId) {
          throw new BadRequestException('Cannot refer yourself');
        }
      }
    }

    // Prepare update data - only include fields that are provided
    const updateData: Partial<{
      fullName: string | null;
      address: string | null;
      whatsappNumber: string | null;
      bankAccount: any;
      accountNumber: string | null;
      facebookLink: string | null;
      dubizzleLink: string | null;
      verified: boolean;
      referralCode: string;
      referredBy: number | null;
      listedProducts: string[];
    }> = {};

    if (updateProfileDto.fullName !== undefined) {
      updateData.fullName = updateProfileDto.fullName;
    }
    if (updateProfileDto.address !== undefined) {
      updateData.address = updateProfileDto.address;
    }
    if (updateProfileDto.whatsappNumber !== undefined) {
      updateData.whatsappNumber = updateProfileDto.whatsappNumber;
    }
    if (updateProfileDto.bankAccount !== undefined) {
      updateData.bankAccount = updateProfileDto.bankAccount;
    }
    if (updateProfileDto.accountNumber !== undefined) {
      updateData.accountNumber = updateProfileDto.accountNumber;
    }
    if (updateProfileDto.facebookLink !== undefined) {
      updateData.facebookLink = updateProfileDto.facebookLink;
    }
    if (updateProfileDto.dubizzleLink !== undefined) {
      updateData.dubizzleLink = updateProfileDto.dubizzleLink;
    }
    if (updateProfileDto.verified !== undefined) {
      updateData.verified = updateProfileDto.verified;
    }
    if (updateProfileDto.referralCode !== undefined) {
      updateData.referralCode = updateProfileDto.referralCode;
    }
    if (updateProfileDto.referredBy !== undefined) {
      updateData.referredBy = updateProfileDto.referredBy;
    }
    if (updateProfileDto.listedProducts !== undefined) {
      updateData.listedProducts = updateProfileDto.listedProducts;
    }

    // Update the profile
    const updatedProfile = await this.prisma.profile.update({
      where: { userId },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
        referrer: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return updatedProfile;
  }

  async deleteProfile(userId: number): Promise<void> {
    const existingProfile = await this.prisma.profile.findUnique({
      where: { userId },
    });

    if (!existingProfile) {
      throw new NotFoundException('Profile not found');
    }

    await this.prisma.profile.delete({
      where: { userId },
    });
  }

  async findByReferralCode(referralCode: string): Promise<Profile | null> {
    return this.prisma.profile.findUnique({
      where: { referralCode },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
    });
  }

  async generateUniqueReferralCode(): Promise<string> {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let referralCode: string;
    let isUnique = false;

    do {
      referralCode = '';
      for (let i = 0; i < 8; i++) {
        referralCode += chars.charAt(Math.floor(Math.random() * chars.length));
      }

      const existing = await this.prisma.profile.findUnique({
        where: { referralCode },
      });

      isUnique = !existing;
    } while (!isUnique);

    return referralCode;
  }

  // Product Management Methods

  async addProductToProfile(
    userId: number,
    productId: number,
  ): Promise<Profile> {
    // Check if profile exists
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    // Check if product exists
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Check if user owns the product
    if (product.ownerId !== userId) {
      throw new ForbiddenException(
        'You can only add your own products to your profile',
      );
    }

    // Check if product is already in the list
    const productIdString = productId.toString();
    if (profile.listedProducts.includes(productIdString)) {
      throw new ConflictException('Product is already in your listed products');
    }

    // Add product to the list
    const updatedProfile = await this.prisma.profile.update({
      where: { userId },
      data: {
        listedProducts: {
          push: productIdString,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
        referrer: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return updatedProfile;
  }

  async removeProductFromProfile(
    userId: number,
    productId: number,
  ): Promise<Profile> {
    // Check if profile exists
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    // Check if product is in the list
    const productIdString = productId.toString();
    if (!profile.listedProducts.includes(productIdString)) {
      throw new NotFoundException('Product is not in your listed products');
    }

    // Remove product from the list
    const updatedListedProducts = profile.listedProducts.filter(
      (id) => id !== productIdString,
    );

    const updatedProfile = await this.prisma.profile.update({
      where: { userId },
      data: {
        listedProducts: updatedListedProducts,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
        referrer: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return updatedProfile;
  }

  async getListedProducts(userId: number): Promise<ProductWithOwner[]> {
    // Check if profile exists
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    // If no listed products, return empty array
    if (profile.listedProducts.length === 0) {
      return [];
    }

    // Convert string IDs to numbers and filter out invalid ones
    const productIds = profile.listedProducts
      .map((id) => parseInt(id, 10))
      .filter((id) => !isNaN(id));

    // Fetch products with owner details
    const products = await this.prisma.product.findMany({
      where: {
        id: { in: productIds },
      },
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Clean up orphaned references (products that no longer exist)
    const existingProductIds = products.map((p) => p.id.toString());
    const orphanedIds = profile.listedProducts.filter(
      (id) => !existingProductIds.includes(id),
    );

    if (orphanedIds.length > 0) {
      // Remove orphaned references
      const cleanedListedProducts = profile.listedProducts.filter((id) =>
        existingProductIds.includes(id),
      );

      await this.prisma.profile.update({
        where: { userId },
        data: {
          listedProducts: cleanedListedProducts,
        },
      });
    }

    return products;
  }

  async getListedProductsByAdmin(
    targetUserId: number,
  ): Promise<ProductWithOwner[]> {
    // Check if target user exists
    const user = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if profile exists
    const profile = await this.prisma.profile.findUnique({
      where: { userId: targetUserId },
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    // If no listed products, return empty array
    if (profile.listedProducts.length === 0) {
      return [];
    }

    // Convert string IDs to numbers and filter out invalid ones
    const productIds = profile.listedProducts
      .map((id) => parseInt(id, 10))
      .filter((id) => !isNaN(id));

    // Fetch products with owner details
    const products = await this.prisma.product.findMany({
      where: {
        id: { in: productIds },
      },
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return products;
  }

  // Helper methods for automatic synchronization
  async syncProductToProfile(userId: number, productId: number): Promise<void> {
    try {
      const profile = await this.prisma.profile.findUnique({
        where: { userId },
      });

      if (!profile) {
        // If no profile exists, skip sync
        return;
      }

      const productIdString = productId.toString();
      if (!profile.listedProducts.includes(productIdString)) {
        await this.prisma.profile.update({
          where: { userId },
          data: {
            listedProducts: {
              push: productIdString,
            },
          },
        });
      }
    } catch (error) {
      // Log error but don't throw to avoid breaking primary operations
      console.error('Failed to sync product to profile:', error);
    }
  }

  async unsyncProductFromProfile(
    userId: number,
    productId: number,
  ): Promise<void> {
    try {
      const profile = await this.prisma.profile.findUnique({
        where: { userId },
      });

      if (!profile) {
        // If no profile exists, skip sync
        return;
      }

      const productIdString = productId.toString();
      if (profile.listedProducts.includes(productIdString)) {
        const updatedListedProducts = profile.listedProducts.filter(
          (id) => id !== productIdString,
        );

        await this.prisma.profile.update({
          where: { userId },
          data: {
            listedProducts: updatedListedProducts,
          },
        });
      }
    } catch (error) {
      // Log error but don't throw to avoid breaking primary operations
      console.error('Failed to unsync product from profile:', error);
    }
  }
}
