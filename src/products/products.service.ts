import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../database/database.service';
import { Product, Prisma, ProductCategory, ProductCondition } from '@prisma/client';
import { CreateProductDto, UpdateProductDto, ProductQueryDto } from './dto';
import { UploadService } from '../upload/upload.service';
import { ProfileService } from '../profile/profile.service';

export interface ProductWithOwner extends Product {
  owner: {
    id: number;
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
}

export interface PaginatedProducts {
  products: ProductWithOwner[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class ProductsService {
  constructor(
    private prisma: PrismaService,
    private uploadService: UploadService,
    private profileService: ProfileService,
  ) { }

  async create(
    userId: number,
    createProductDto: CreateProductDto,
    photos: string[] = [],
  ): Promise<ProductWithOwner> {
    // Check if SKU is provided and already exists
    if (createProductDto.sku) {
      const existingSku = await this.prisma.product.findUnique({
        where: { sku: createProductDto.sku },
      });

      if (existingSku) {
        throw new ConflictException('Product with this SKU already exists');
      }
    }

    const product = await this.prisma.product.create({
      data: {
        ownerId: userId,
        title: createProductDto.title,
        description: createProductDto.description,
        price: createProductDto.price,
        category: createProductDto.category,
        condition: createProductDto.condition,
        photos: photos,
        brand: createProductDto.brand,
        colors: createProductDto.colors || [],
        location: createProductDto.location,
        material: createProductDto.material,
        productTags: createProductDto.productTags || [],
        quantity: createProductDto.quantity || 1,
        sku: createProductDto.sku,
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

    // Automatically add product to user's profile
    await this.profileService.syncProductToProfile(userId, product.id);

    return product;
  }

  async findAll(query: ProductQueryDto): Promise<PaginatedProducts> {
    const {
      page = 1,
      limit = 10,
      search,
      category,
      condition,
      minPrice,
      maxPrice,
      location,
      brand,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.ProductWhereInput = {};

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (category) {
      where.category = category;
    }

    if (condition) {
      where.condition = condition;
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
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

    // Build order by clause
    const orderBy: Prisma.ProductOrderByWithRelationInput = {};
    orderBy[sortBy] = sortOrder;

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy,
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
      }),
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

  async findOne(id: number): Promise<ProductWithOwner> {
    const product = await this.prisma.product.findUnique({
      where: { id },
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
  ): Promise<ProductWithOwner> {
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

    if (newPhotoUrls.length > 0) {
      // Check if we should replace all photos or add to existing ones
      const replacePhotos = updateProductDto.replacePhotos === true;

      if (replacePhotos) {
        // Delete old photos from Cloudinary
        if (existingProduct.photos.length > 0) {
          try {
            const publicIds: string[] = this.uploadService.extractPublicIds(
              existingProduct.photos,
            );

            if (publicIds.length > 0) {
              await this.uploadService.deleteMultipleImages(publicIds);
            }
          } catch (error) {
            // Log error but don't fail the update
            console.error('Failed to delete old images:', error);
          }
        }

        finalPhotoUrls = newPhotoUrls;
      } else {
        // Add new photos to existing ones, but limit total to 10
        const combinedPhotos = [...existingProduct.photos, ...newPhotoUrls];
        finalPhotoUrls = combinedPhotos.slice(0, 10);
      }
    }

    const updatedProduct = await this.prisma.product.update({
      where: { id },
      data: {
        title: updateProductDto.title,
        description: updateProductDto.description,
        price: updateProductDto.price,
        category: updateProductDto.category,
        condition: updateProductDto.condition,
        photos: finalPhotoUrls,
        brand: updateProductDto.brand,
        colors: updateProductDto.colors,
        location: updateProductDto.location,
        material: updateProductDto.material,
        productTags: updateProductDto.productTags,
        quantity: updateProductDto.quantity,
        sku: updateProductDto.sku,
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

    return updatedProduct;
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

    // Delete associated images from Cloudinary before deleting the product
    if (product.photos.length > 0) {
      const publicIds = this.uploadService.extractPublicIds(product.photos);

      if (publicIds.length > 0) {
        try {
          await this.uploadService.deleteMultipleImages(publicIds);
        } catch (error) {
          // Log error but don't fail the deletion
          console.error('Failed to delete product images:', error);
        }
      }
    }

    // Automatically remove product from user's profile
    await this.profileService.unsyncProductFromProfile(product.ownerId, id);

    await this.prisma.product.delete({
      where: { id },
    });
  }

  getCategories(): { value: string; label: string }[] {
    // Create a mapping of enum values to display labels
    const categoryLabels: Record<ProductCategory, string> = {
      [ProductCategory.BEDS]: 'Beds',
      [ProductCategory.CHAIRS]: 'Chairs',
      [ProductCategory.TABLES]: 'Tables',
      [ProductCategory.SOFAS]: 'Sofas',
      [ProductCategory.DRESSER]: 'Dresser',
      [ProductCategory.WARDROBES]: 'Wardrobes',
      [ProductCategory.DINING_SETS]: 'Dining Sets',
      [ProductCategory.OFFICE_FURNITURE]: 'Office Furniture',
      [ProductCategory.DECORATIVE_ITEMS]: 'Decorative Items',
      [ProductCategory.LIGHTING]: 'Lighting',
      [ProductCategory.STORAGE]: 'Storage',
      [ProductCategory.OTHER]: 'Other',
    };

    // Get all enum values and map them to the desired format
    const categories = Object.values(ProductCategory).map((category) => ({
      value: category,
      label: categoryLabels[category],
    }));

    return categories;
  }

  getConditions(): Array<{ value: string; label: string }> {
    // Create a mapping of enum values to display labels
    const conditionLabels: Record<ProductCondition, string> = {
      [ProductCondition.NEW]: 'New',
      [ProductCondition.LIKE_NEW]: 'Like New',
      [ProductCondition.GOOD]: 'Good',
      [ProductCondition.FAIR]: 'Fair',
      [ProductCondition.SECOND_HAND]: 'Second Hand',
    };

    // Get all enum values and map them to the desired format
    const conditions = Object.values(ProductCondition).map((condition) => ({
      value: condition,
      label: conditionLabels[condition],
    }));

    return conditions;
  }

  async getProductStats(): Promise<{
    totalProducts: number;
    productsByCategory: Record<string, number>;
    productsByCondition: Record<string, number>;
    averagePrice: number;
  }> {
    const [
      totalProducts,
      productsByCategory,
      productsByCondition,
      averagePrice,
    ] = await Promise.all([
      this.prisma.product.count(),
      this.prisma.product.groupBy({
        by: ['category'],
        _count: { category: true },
      }),
      this.prisma.product.groupBy({
        by: ['condition'],
        _count: { condition: true },
      }),
      this.prisma.product.aggregate({
        _avg: { price: true },
      }),
    ]);

    const categoryStats = productsByCategory.reduce(
      (acc, item) => {
        acc[item.category] = item._count.category;
        return acc;
      },
      {} as Record<string, number>,
    );

    const conditionStats = productsByCondition.reduce(
      (acc, item) => {
        acc[item.condition] = item._count.condition;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      totalProducts,
      productsByCategory: categoryStats,
      productsByCondition: conditionStats,
      averagePrice: Number(averagePrice._avg.price) || 0,
    };
  }
}
