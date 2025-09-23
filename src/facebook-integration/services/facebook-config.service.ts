import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FacebookConfig } from '../interfaces/facebook-config.interface';
import { spawn } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

@Injectable()
export class FacebookConfigService {
  constructor(private readonly configService: ConfigService) {}

  get config(): FacebookConfig {
    return this.configService.get<FacebookConfig>('facebook')!;
  }

  /**
   * Validates the Facebook automation configuration
   * @returns Array of validation errors, empty if valid
   */
  async validateConfiguration(): Promise<string[]> {
    const errors: string[] = [];
    const config = this.config;

    // Validate Chrome user data directory
    if (!fs.existsSync(config.chromeUserDataDir)) {
      errors.push(
        `Chrome user data directory does not exist: ${config.chromeUserDataDir}`,
      );
    } else {
      // Check if the profile directory exists
      const profilePath = path.join(
        config.chromeUserDataDir,
        config.chromeProfile,
      );
      if (!fs.existsSync(profilePath)) {
        errors.push(`Chrome profile directory does not exist: ${profilePath}`);
      }
    }

    // Validate Python script path
    if (!fs.existsSync(config.pythonScriptPath)) {
      errors.push(`Python script does not exist: ${config.pythonScriptPath}`);
    }

    // Validate temp files directory (create if doesn't exist)
    try {
      if (!fs.existsSync(config.tempFilesDir)) {
        fs.mkdirSync(config.tempFilesDir, { recursive: true });
      }
    } catch (error) {
      errors.push(`Cannot create temp files directory: ${config.tempFilesDir}`);
    }

    // Validate numeric values
    if (config.seleniumTimeout <= 0) {
      errors.push('Selenium timeout must be greater than 0');
    }

    if (config.maxRetryAttempts < 0) {
      errors.push('Max retry attempts must be 0 or greater');
    }

    return errors;
  }

  /**
   * Checks if the Python executable is available
   */
  async validatePythonEnvironment(): Promise<{
    valid: boolean;
    error?: string;
  }> {
    return new Promise((resolve) => {
      const python = spawn(this.config.pythonExecutable, ['--version']);

      python.on('close', (code: number) => {
        if (code === 0) {
          resolve({ valid: true });
        } else {
          resolve({
            valid: false,
            error: `Python executable not found or invalid: ${this.config.pythonExecutable}`,
          });
        }
      });

      python.on('error', (error: Error) => {
        resolve({
          valid: false,
          error: `Failed to execute Python: ${error.message}`,
        });
      });
    });
  }

  /**
   * Gets the full path to the Chrome profile directory
   */
  getChromeProfilePath(): string {
    return path.join(this.config.chromeUserDataDir, this.config.chromeProfile);
  }

  /**
   * Gets a temporary file path for product data
   */
  getTempProductFilePath(productId: number): string {
    return path.join(
      this.config.tempFilesDir,
      `product-${productId}-${Date.now()}.json`,
    );
  }

  /**
   * Gets the directory for temporary image downloads
   */
  getTempImagesDir(): string {
    return path.join(this.config.tempFilesDir, 'images');
  }
}
