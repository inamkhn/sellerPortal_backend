import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import * as path from 'node:path';
import * as https from 'node:https';
import * as http from 'node:http';
import { FacebookConfigService } from './services/facebook-config.service';

@Injectable()
export class ImageHandlerService {
  private readonly logger = new Logger(ImageHandlerService.name);

  constructor(private readonly facebookConfigService: FacebookConfigService) {}

  /**
   * Downloads Cloudinary images to local file system for Selenium
   */
  async downloadCloudinaryImages(cloudinaryUrls: string[]): Promise<string[]> {
    const localPaths: string[] = [];
    const tempImagesDir = this.facebookConfigService.getTempImagesDir();

    try {
      // Ensure temp images directory exists
      await fs.mkdir(tempImagesDir, { recursive: true });

      // Download images in parallel
      const downloadPromises = cloudinaryUrls.map((url, index) =>
        this.downloadSingleImage(url, tempImagesDir, index),
      );

      const results = await Promise.allSettled(downloadPromises);

      // Process results and collect successful downloads
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          localPaths.push(result.value);
        } else {
          const error =
            result.reason instanceof Error
              ? result.reason.message
              : String(result.reason);
          this.logger.warn(`Failed to download image ${index + 1}: ${error}`);
        }
      });

      this.logger.log(
        `Downloaded ${localPaths.length}/${cloudinaryUrls.length} images`,
      );
      return localPaths;
    } catch (error) {
      this.logger.error(`Failed to download images: ${error.message}`);
      throw new Error(`Image download failed: ${error.message}`);
    }
  }

  /**
   * Downloads a single image from Cloudinary URL
   */
  private async downloadSingleImage(
    url: string,
    tempDir: string,
    index: number,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const timestamp = Date.now();
      const extension = this.getImageExtensionFromUrl(url) || 'jpg';
      const filename = `image-${timestamp}-${index}.${extension}`;
      const localPath = path.join(tempDir, filename);

      const client = url.startsWith('https:') ? https : http;

      const request = client.get(url, (response) => {
        if (response.statusCode !== 200) {
          reject(
            new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`),
          );
          return;
        }

        const fileStream = createWriteStream(localPath);

        response.pipe(fileStream);

        fileStream.on('finish', () => {
          fileStream.close();
          resolve(localPath);
        });

        fileStream.on('error', (error: Error) => {
          reject(error);
        });
      });

      request.on('error', (error: Error) => {
        reject(error);
      });

      request.setTimeout(30000, () => {
        request.destroy();
        reject(new Error('Download timeout'));
      });
    });
  }

  /**
   * Extracts file extension from Cloudinary URL
   */
  private getImageExtensionFromUrl(url: string): string | null {
    try {
      const urlPath = new URL(url).pathname;
      const match = urlPath.match(/\.([a-zA-Z0-9]+)$/);
      return match ? match[1].toLowerCase() : null;
    } catch {
      return null;
    }
  }

  /**
   * Gets local file paths for Cloudinary URLs, downloading if necessary
   */
  async getLocalImagePaths(cloudinaryUrls: string[]): Promise<string[]> {
    if (!cloudinaryUrls || cloudinaryUrls.length === 0) {
      return [];
    }

    // Filter out invalid URLs
    const validUrls = cloudinaryUrls.filter((url) => this.isValidImageUrl(url));

    if (validUrls.length === 0) {
      this.logger.warn('No valid image URLs provided');
      return [];
    }

    return this.downloadCloudinaryImages(validUrls);
  }

  /**
   * Validates if a URL is a valid image URL
   */
  private isValidImageUrl(url: string): boolean {
    try {
      const parsedUrl = new URL(url);

      // Check if it's a Cloudinary URL
      if (parsedUrl.hostname.includes('cloudinary.com')) {
        return true;
      }

      // Check if it has a valid image extension
      const validExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
      return validExtensions.some((ext) =>
        parsedUrl.pathname.toLowerCase().includes(ext),
      );
    } catch {
      return false;
    }
  }

  /**
   * Cleans up downloaded images
   */
  async cleanupDownloadedImages(imagePaths: string[]): Promise<void> {
    const cleanupPromises = imagePaths.map(async (imagePath) => {
      try {
        await fs.unlink(imagePath);
        this.logger.debug(`Cleaned up image: ${imagePath}`);
      } catch (error) {
        this.logger.warn(
          `Failed to cleanup image ${imagePath}: ${error.message}`,
        );
      }
    });

    await Promise.allSettled(cleanupPromises);
  }

  /**
   * Cleans up old downloaded images
   */
  async cleanupOldImages(maxAgeHours: number = 24): Promise<void> {
    try {
      const tempImagesDir = this.facebookConfigService.getTempImagesDir();
      const maxAge = maxAgeHours * 60 * 60 * 1000; // Convert to milliseconds

      // Check if directory exists
      try {
        await fs.access(tempImagesDir);
      } catch {
        // Directory doesn't exist, nothing to clean
        return;
      }

      const files = await fs.readdir(tempImagesDir);
      const now = Date.now();

      for (const file of files) {
        const filePath = path.join(tempImagesDir, file);

        try {
          const stats = await fs.stat(filePath);

          if (now - stats.mtime.getTime() > maxAge) {
            await fs.unlink(filePath);
            this.logger.debug(`Cleaned up old image: ${filePath}`);
          }
        } catch (error) {
          this.logger.warn(
            `Failed to process file ${filePath}: ${error.message}`,
          );
        }
      }
    } catch (error) {
      this.logger.warn(`Failed to cleanup old images: ${error.message}`);
    }
  }

  /**
   * Validates image files for Selenium processing
   */
  async validateImageFiles(
    imagePaths: string[],
  ): Promise<{ valid: string[]; invalid: string[] }> {
    const valid: string[] = [];
    const invalid: string[] = [];

    for (const imagePath of imagePaths) {
      try {
        const stats = await fs.stat(imagePath);

        // Check if file exists and is not empty
        if (stats.isFile() && stats.size > 0) {
          // Check file extension
          const ext = path.extname(imagePath).toLowerCase();
          const validExtensions = ['.jpg', '.jpeg', '.png', '.webp'];

          if (validExtensions.includes(ext)) {
            valid.push(imagePath);
          } else {
            invalid.push(imagePath);
            this.logger.warn(`Invalid image extension: ${imagePath}`);
          }
        } else {
          invalid.push(imagePath);
          this.logger.warn(`Invalid image file: ${imagePath}`);
        }
      } catch (error) {
        invalid.push(imagePath);
        this.logger.warn(
          `Cannot access image file ${imagePath}: ${error.message}`,
        );
      }
    }

    return { valid, invalid };
  }

  /**
   * Processes images in parallel for better performance
   */
  async processImagesInParallel<T>(
    imagePaths: string[],
    processor: (imagePath: string, index: number) => Promise<T>,
    concurrency: number = 3,
  ): Promise<T[]> {
    const results: T[] = [];

    for (let i = 0; i < imagePaths.length; i += concurrency) {
      const batch = imagePaths.slice(i, i + concurrency);
      const batchPromises = batch.map((imagePath, batchIndex) =>
        processor(imagePath, i + batchIndex),
      );

      const batchResults = await Promise.allSettled(batchPromises);

      batchResults.forEach((result, batchIndex) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          const error =
            result.reason instanceof Error
              ? result.reason.message
              : String(result.reason);
          this.logger.warn(
            `Failed to process image ${batch[batchIndex]}: ${error}`,
          );
        }
      });
    }

    return results;
  }
}
