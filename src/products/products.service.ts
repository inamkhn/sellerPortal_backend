import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../database/database.service';
import { Product } from '@prisma/client';
import { CreateProductDto, UpdateProductDto, ProductQueryDto } from './dto';

export type ProductWithOwner = Product & {
  category: {
    id: number;
    name: string;
    createdAt: Date;
    updatedAt: Date;
  };
  owner: {
    id: number;
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
};

export interface PaginatedProducts {
  products: any[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    userId: number,
    createProductDto: CreateProductDto,
    photos: string[] = [],
  ) {
    // Validate category exists
    const category = await this.prisma.category.findUnique({
      where: { id: createProductDto.categoryId },
    });

    if (!category) {
      throw new NotFoundException(
        `Category with ID ${createProductDto.categoryId} not found`,
      );
    }

    // Check if SKU already exists
    if (createProductDto.sku) {
      const existingSku = await this.prisma.product.findUnique({
        where: { sku: createProductDto.sku },
      });

      if (existingSku) {
        throw new ConflictException('Product with this SKU already exists');
      }
    }

    const productData: Record<string, any> = {
      ownerId: userId,
      title: createProductDto.title,
      description: createProductDto.description,
      price: createProductDto.price,
      categoryId: createProductDto.categoryId,
      condition: createProductDto.condition,
      photos: photos,
      brand: createProductDto.brand,
      colors: createProductDto.colors || [],
      location: createProductDto.location,
      material: createProductDto.material,
      productTags: createProductDto.productTags || [],
      quantity: createProductDto.quantity || 1,
      sku: createProductDto.sku,
    };

    return this.prisma.product.create({
      data: productData,
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    } as any);
  }

  async findAll(query: ProductQueryDto) {
    const {
      page = 1,
      limit = 10,
      search,
      categoryId,
      condition,
      minPrice,
      maxPrice,
      location,
      brand,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;
    const where: Record<string, any> = {};

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (condition) {
      where.condition = condition;
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {} as Record<string, any>;
      if (minPrice !== undefined) {
        where.price.gte = minPrice;
      }
      if (maxPrice !== undefined) {
        where.price.lte = maxPrice;
      }
    }

    if (location) {
      where.location = { contains: location, mode: 'insensitive' };
    }

    if (brand) {
      where.brand = { contains: brand, mode: 'insensitive' };
    }

    const orderBy: Record<string, any> = {};
    orderBy[sortBy] = sortOrder;

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          category: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      } as any),
      this.prisma.product.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      products,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async findOne(id: number) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    } as any);

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async update(
    id: number,
    userId: number,
    updateProductDto: UpdateProductDto,
    newPhotoUrls: string[] = [],
  ) {
    // Check if product exists and user owns it
    const existingProduct = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!existingProduct) {
      throw new NotFoundException('Product not found');
    }

    if (existingProduct.ownerId !== userId) {
      throw new ForbiddenException('You can only update your own products');
    }

    // Check if SKU is being updated and already exists
    if (updateProductDto.sku && updateProductDto.sku !== existingProduct.sku) {
      const existingSku = await this.prisma.product.findUnique({
        where: { sku: updateProductDto.sku },
      });

      if (existingSku) {
        throw new ConflictException('Product with this SKU already exists');
      }
    }

    // Handle photo updates
    let finalPhotoUrls = existingProduct.photos;

    // First, remove specified photos if any
    if (
      updateProductDto.photosToRemove &&
      updateProductDto.photosToRemove.length > 0
    ) {
      finalPhotoUrls = finalPhotoUrls.filter(
        (photo) => !updateProductDto.photosToRemove!.includes(photo),
      );
    }

    // Then, handle new photos
    if (newPhotoUrls.length > 0) {
      const replacePhotos = updateProductDto.replacePhotos === true;

      if (replacePhotos) {
        finalPhotoUrls = newPhotoUrls;
      } else {
        // Add new photos to existing ones, but limit total to 10
        const combinedPhotos = [...finalPhotoUrls, ...newPhotoUrls];
        finalPhotoUrls = combinedPhotos.slice(0, 10);
      }
    }

    // Exclude replacePhotos and photosToRemove from updateData since they're not database fields
    const { replacePhotos, photosToRemove, ...updateFields } = updateProductDto;

    const updateData: Record<string, any> = {
      ...updateFields,
      photos: finalPhotoUrls,
    };

    return this.prisma.product.update({
      where: { id },
      data: updateData,
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    } as any);
  }

  async remove(id: number, userId: number, userRole: string): Promise<void> {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Only product owner or admin can delete
    if (product.ownerId !== userId && userRole !== 'ADMIN') {
      throw new ForbiddenException(
        'You can only delete your own products or be an admin',
      );
    }

    await this.prisma.product.delete({
      where: { id },
    });
  }
}
