import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

export interface CloudinaryResponse {
  public_id: string;
  version: number;
  signature: string;
  width: number;
  height: number;
  format: string;
  resource_type: string;
  created_at: string;
  tags: string[];
  bytes: number;
  type: string;
  etag: string;
  placeholder: boolean;
  url: string;
  secure_url: string;
  access_mode: string;
  original_filename: string;
}

@Injectable()
export class UploadService {
  constructor(private configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
    });
  }

  async uploadImage(
    file: Express.Multer.File,
    folder: string = 'products',
  ): Promise<CloudinaryResponse> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
          transformation: [
            { width: 1000, height: 1000, crop: 'limit' },
            { quality: 'auto' },
            { fetch_format: 'auto' },
          ],
        },
        (error, result) => {
          if (error) {
            reject(
              new BadRequestException(`Image upload failed: ${error.message}`),
            );
          } else {
            resolve(result as CloudinaryResponse);
          }
        },
      );

      const stream = Readable.from(file.buffer);
      stream.pipe(uploadStream);
    });
  }

  async uploadMultipleImages(
    files: Express.Multer.File[],
    folder: string = 'products',
  ): Promise<CloudinaryResponse[]> {
    const uploadPromises = files.map((file) => this.uploadImage(file, folder));
    return Promise.all(uploadPromises);
  }

  async deleteImage(publicId: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException(`Failed to delete image: ${errorMessage}`);
    }
  }

  validateImageFile(file: Express.Multer.File): void {
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/jpg',
    ];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file type. Only JPEG, PNG, and WebP images are allowed.',
      );
    }

    if (file.size > maxSize) {
      throw new BadRequestException(
        'File size too large. Maximum size is 5MB.',
      );
    }
  }

  validateImageFiles(files: Express.Multer.File[]): void {
    if (files.length > 10) {
      throw new BadRequestException('Maximum 10 images allowed per product.');
    }

    files.forEach((file) => this.validateImageFile(file));
  }

  extractPublicId(cloudinaryUrl: string): string | null {
    // Extract public_id from Cloudinary URL
    // Example: https://res.cloudinary.com/demo/image/upload/v1234567890/products/sample.jpg
    if (!cloudinaryUrl || typeof cloudinaryUrl !== 'string') {
      return null;
    }

    const matches = cloudinaryUrl.match(/\/v\d+\/(.+)\./);
    return matches && matches[1] ? matches[1] : null;
  }

  extractPublicIds(cloudinaryUrls: string[]): string[] {
    return cloudinaryUrls
      .map((url) => this.extractPublicId(url))
      .filter((id): id is string => id !== null && id.length > 0);
  }

  async deleteMultipleImages(publicIds: string[]): Promise<void> {
    try {
      const deletePromises = publicIds.map((publicId) =>
        this.deleteImage(publicId),
      );
      await Promise.all(deletePromises);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException(`Failed to delete images: ${errorMessage}`);
    }
  }

  async uploadBase64Image(
    base64String: string,
    folder: string = 'products',
  ): Promise<CloudinaryResponse> {
    // Validate base64 format
    if (!base64String || typeof base64String !== 'string') {
      throw new BadRequestException('Invalid base64 string');
    }

    if (!base64String.startsWith('data:image/')) {
      throw new BadRequestException(
        'Invalid image format. Must be a base64 encoded image.',
      );
    }

    try {
      const result = await cloudinary.uploader.upload(base64String, {
        folder,
        resource_type: 'image',
        transformation: [
          { width: 1000, height: 1000, crop: 'limit' },
          { quality: 'auto' },
          { fetch_format: 'auto' },
        ],
      });

      return result as CloudinaryResponse;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException(
        `Failed to upload base64 image: ${errorMessage}`,
      );
    }
  }

  async uploadBase64Images(
    base64Images: string[],
    folder: string = 'products',
  ): Promise<CloudinaryResponse[]> {
    // Validate image count
    if (base64Images.length > 10) {
      throw new BadRequestException('Maximum 10 images allowed per product.');
    }

    // Validate each image
    base64Images.forEach((img, index) => {
      if (!img || typeof img !== 'string') {
        throw new BadRequestException(`Invalid image at index ${index}`);
      }
      if (!img.startsWith('data:image/')) {
        throw new BadRequestException(
          `Invalid image format at index ${index}. Must be a base64 encoded image.`,
        );
      }
    });

    // Upload all images
    const uploadPromises = base64Images.map((base64) =>
      this.uploadBase64Image(base64, folder),
    );

    return Promise.all(uploadPromises);
  }
}
