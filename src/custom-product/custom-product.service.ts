import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/database.service';
import { Prisma } from '@prisma/client';
import { CreateCustomProductDto } from './dto/create-custom-product.dto';
import { UpdateCustomProductDto } from './dto/update-custom-product.dto';
import { UploadService } from '../upload/upload.service';

@Injectable()
export class CustomProductService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadService: UploadService,
  ) {}

  async create(
    orderRequestId: number,
    userId: number,
    userRole: string,
    createDto: CreateCustomProductDto,
    imageUrls: string[] = [],
  ) {
    // Check if order request exists and user has permission
    const orderRequest = await this.prisma.orderRequest.findUnique({
      where: { id: orderRequestId },
    });

    if (!orderRequest) {
      throw new NotFoundException('Order request not found');
    }

    // Check access permission
    await this.checkAccess(userId, userRole, orderRequest.userId);

    // Check if order request already has a custom product
    const existingCustomProduct = await this.prisma.customProduct.findUnique({
      where: { orderRequestId },
    });

    if (existingCustomProduct) {
      throw new BadRequestException(
        'This order request already has a custom product',
      );
    }

    // Check if order request is for custom product
    if (!orderRequest.isCustomProduct) {
      throw new BadRequestException(
        'This order request is not for a custom product',
      );
    }

    // Create custom product
    const customProduct = await this.prisma.customProduct.create({
      data: {
        orderRequestId,
        name: createDto.name,
        description: createDto.description || null,
        categoryId: createDto.categoryId,
        images: imageUrls,
      },
      include: {
        category: true,
      },
    });

    return customProduct;
  }

  async findByOrderRequestId(
    orderRequestId: number,
    userId: number,
    userRole: string,
  ) {
    // Check if order request exists
    const orderRequest = await this.prisma.orderRequest.findUnique({
      where: { id: orderRequestId },
    });

    if (!orderRequest) {
      throw new NotFoundException('Order request not found');
    }

    // Check access permission
    await this.checkAccess(userId, userRole, orderRequest.userId);

    // Find custom product
    const customProduct = await this.prisma.customProduct.findUnique({
      where: { orderRequestId },
      include: {
        category: true,
      },
    });

    if (!customProduct) {
      throw new NotFoundException(
        'Custom product not found for this order request',
      );
    }

    return customProduct;
  }

  async update(
    orderRequestId: number,
    userId: number,
    userRole: string,
    updateDto: UpdateCustomProductDto,
    newImageUrls: string[] = [],
    replaceImages: boolean = false,
  ) {
    // Check if order request exists
    const orderRequest = await this.prisma.orderRequest.findUnique({
      where: { id: orderRequestId },
    });

    if (!orderRequest) {
      throw new NotFoundException('Order request not found');
    }

    // Check access permission
    await this.checkAccess(userId, userRole, orderRequest.userId);

    // Check if custom product exists
    const existingCustomProduct = await this.prisma.customProduct.findUnique({
      where: { orderRequestId },
    });

    if (!existingCustomProduct) {
      throw new NotFoundException(
        'Custom product not found for this order request',
      );
    }

    // Prepare update data
    const dataToUpdate: Prisma.CustomProductUpdateInput = {};

    if (updateDto.name !== undefined) {
      dataToUpdate.name = updateDto.name;
    }
    if (updateDto.description !== undefined) {
      dataToUpdate.description = updateDto.description;
    }
    if (updateDto.categoryId !== undefined) {
      dataToUpdate.category = {
        connect: { id: updateDto.categoryId },
      };
    }

    // Handle images update
    if (newImageUrls.length > 0) {
      if (replaceImages) {
        // Replace mode: Delete old images from Cloudinary and use only new images
        if (existingCustomProduct.images.length > 0) {
          // Delete old images from Cloudinary
          await Promise.allSettled(
            existingCustomProduct.images.map((imageUrl) =>
              this.uploadService.deleteImage(imageUrl),
            ),
          );
        }
        dataToUpdate.images = newImageUrls;
      } else {
        // Append mode: Add new images to existing ones
        dataToUpdate.images = [
          ...existingCustomProduct.images,
          ...newImageUrls,
        ];
      }
    } else if (updateDto.images !== undefined) {
      // If images array is provided in DTO (for manual replacement/removal)
      // Delete removed images from Cloudinary
      const removedImages = existingCustomProduct.images.filter(
        (img) => !updateDto.images!.includes(img),
      );
      if (removedImages.length > 0) {
        await Promise.allSettled(
          removedImages.map((imageUrl) =>
            this.uploadService.deleteImage(imageUrl),
          ),
        );
      }
      dataToUpdate.images = updateDto.images;
    }

    // Update custom product
    const updatedCustomProduct = await this.prisma.customProduct.update({
      where: { orderRequestId },
      data: dataToUpdate,
      include: {
        category: true,
      },
    });

    return updatedCustomProduct;
  }

  async remove(orderRequestId: number, userId: number, userRole: string) {
    // Check if order request exists
    const orderRequest = await this.prisma.orderRequest.findUnique({
      where: { id: orderRequestId },
    });

    if (!orderRequest) {
      throw new NotFoundException('Order request not found');
    }

    // Check access permission
    await this.checkAccess(userId, userRole, orderRequest.userId);

    // Check if custom product exists
    const existingCustomProduct = await this.prisma.customProduct.findUnique({
      where: { orderRequestId },
    });

    if (!existingCustomProduct) {
      throw new NotFoundException(
        'Custom product not found for this order request',
      );
    }

    // Delete images from Cloudinary before deleting the record
    if (existingCustomProduct.images.length > 0) {
      await Promise.allSettled(
        existingCustomProduct.images.map((imageUrl) =>
          this.uploadService.deleteImage(imageUrl),
        ),
      );
    }

    // Delete custom product
    await this.prisma.customProduct.delete({
      where: { orderRequestId },
    });

    return;
  }

  // Helper method to check access permission
  private async checkAccess(
    userId: number,
    userRole: string,
    orderOwnerId: number,
  ) {
    if (userRole === 'ADMIN') {
      // Admin can access any custom product
      return;
    } else if (userRole === 'REFERRAL_MANAGER') {
      // Referral manager can access their own + referred users' custom products
      if (orderOwnerId !== userId) {
        const isReferredUser = await this.prisma.referral.findFirst({
          where: {
            referrerId: userId,
            refereeId: orderOwnerId,
          },
        });

        if (!isReferredUser) {
          throw new ForbiddenException(
            'You do not have permission to access this custom product',
          );
        }
      }
    } else {
      // Regular USER can only access their own custom products
      if (orderOwnerId !== userId) {
        throw new ForbiddenException(
          'You do not have permission to access this custom product',
        );
      }
    }
  }
}
