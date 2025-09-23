import { Injectable, Logger } from '@nestjs/common';
import { spawn, ChildProcess } from 'node:child_process';
import * as fs from 'node:fs/promises';
import * as fsSync from 'node:fs';
import * as path from 'node:path';
import { FacebookConfigService } from './services/facebook-config.service';
import { FacebookProductData, SeleniumResult } from './interfaces';

@Injectable()
export class SeleniumWorkerService {
  private readonly logger = new Logger(SeleniumWorkerService.name);

  constructor(private readonly facebookConfigService: FacebookConfigService) {}

  /**
   * Creates a temporary JSON file with product data for Selenium script
   */
  async createTempProductFile(
    productData: FacebookProductData,
  ): Promise<string> {
    const config = this.facebookConfigService.config;
    const tempFilePath = this.facebookConfigService.getTempProductFilePath(
      Date.now(), // Using timestamp as unique identifier
    );

    try {
      // Ensure temp directory exists
      await fs.mkdir(config.tempFilesDir, { recursive: true });

      // Write product data to temp file
      await fs.writeFile(
        tempFilePath,
        JSON.stringify(productData, null, 2),
        'utf8',
      );

      this.logger.debug(`Created temp product file: ${tempFilePath}`);
      return tempFilePath;
    } catch (error) {
      this.logger.error(`Failed to create temp product file: ${error.message}`);
      throw new Error(
        `Failed to create temporary product file: ${error.message}`,
      );
    }
  }

  /**
   * Executes the Selenium Python script with product data
   */
  async executeSeleniumScript(
    productData: FacebookProductData,
    tempFilePath?: string,
  ): Promise<SeleniumResult> {
    const config = this.facebookConfigService.config;
    const startTime = Date.now();

    // Create temp file if not provided
    const productFilePath =
      tempFilePath || (await this.createTempProductFile(productData));

    try {
      // Validate environment before execution
      const envValidation = await this.validateSeleniumEnvironment();
      if (!envValidation) {
        throw new Error('Selenium environment validation failed');
      }

      const result = await this.spawnPythonProcess(productFilePath);
      const executionTime = Date.now() - startTime;

      this.logger.log(`Selenium script completed in ${executionTime}ms`);

      return {
        ...result,
        executionTime,
      };
    } catch (error) {
      this.logger.error(`Selenium script execution failed: ${error.message}`);

      // Try to capture screenshot on error
      const screenshot = await this.captureErrorScreenshot();

      return {
        success: false,
        error: error.message,
        screenshot,
        executionTime: Date.now() - startTime,
      };
    } finally {
      // Cleanup temp file if we created it
      if (!tempFilePath && config.cleanupTempFiles) {
        await this.cleanupTempFile(productFilePath);
      }
    }
  }

  /**
   * Spawns the Python process and handles its execution
   */
  private async spawnPythonProcess(
    productFilePath: string,
  ): Promise<SeleniumResult> {
    const config = this.facebookConfigService.config;

    return new Promise((resolve, reject) => {
      const pythonProcess: ChildProcess = spawn(
        config.pythonExecutable,
        [config.pythonScriptPath, productFilePath],
        {
          stdio: ['pipe', 'pipe', 'pipe'],
          timeout: config.seleniumTimeout * 1000, // Convert to milliseconds
        },
      );

      let stdout = '';
      let stderr = '';

      pythonProcess.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      pythonProcess.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code === 0) {
          // Try to parse output for listing URL
          const listingUrl = this.extractListingUrlFromOutput(stdout);

          resolve({
            success: true,
            listingUrl,
          });
        } else {
          reject(
            new Error(
              `Python script failed with code ${code}: ${stderr || stdout}`,
            ),
          );
        }
      });

      pythonProcess.on('error', (error) => {
        reject(new Error(`Failed to spawn Python process: ${error.message}`));
      });

      // Handle timeout
      pythonProcess.on('timeout', () => {
        pythonProcess.kill('SIGKILL');
        reject(
          new Error(
            `Selenium script timed out after ${config.seleniumTimeout} seconds`,
          ),
        );
      });
    });
  }

  /**
   * Extracts Facebook listing URL from Python script output
   */
  private extractListingUrlFromOutput(output: string): string | undefined {
    // Look for Facebook Marketplace URL patterns in the output
    const urlPattern = /https:\/\/www\.facebook\.com\/marketplace\/item\/\d+/;
    const match = output.match(urlPattern);
    return match ? match[0] : undefined;
  }

  /**
   * Captures a screenshot on error for debugging
   */
  private captureErrorScreenshot(): string | undefined {
    try {
      const config = this.facebookConfigService.config;
      const screenshotPath = path.join(
        config.tempFilesDir,
        `error-screenshot-${Date.now()}.png`,
      );

      // This would be implemented in the Python script to save screenshots
      // For now, we just return the expected path
      return screenshotPath;
    } catch (error) {
      this.logger.warn(`Failed to capture error screenshot: ${error.message}`);
      return undefined;
    }
  }

  /**
   * Validates the Selenium environment
   */
  async validateSeleniumEnvironment(): Promise<boolean> {
    try {
      // Validate configuration
      const configErrors =
        await this.facebookConfigService.validateConfiguration();
      if (configErrors.length > 0) {
        this.logger.error('Configuration validation failed:', configErrors);
        return false;
      }

      // Validate Python environment
      const pythonValidation =
        await this.facebookConfigService.validatePythonEnvironment();
      if (!pythonValidation.valid) {
        this.logger.error(
          'Python environment validation failed:',
          pythonValidation.error,
        );
        return false;
      }

      // Validate Selenium installation
      const seleniumValidation = await this.validateSeleniumInstallation();
      if (!seleniumValidation.valid) {
        this.logger.error(
          'Selenium validation failed:',
          seleniumValidation.error,
        );
        return false;
      }

      // Validate Chrome installation
      const chromeValidation = await this.validateChromeInstallation();
      if (!chromeValidation.valid) {
        this.logger.error('Chrome validation failed:', chromeValidation.error);
        return false;
      }

      this.logger.log('All environment validations passed successfully');
      return true;
    } catch (error) {
      this.logger.error(`Environment validation failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Validates Selenium installation by checking if selenium package is available
   */
  private async validateSeleniumInstallation(): Promise<{
    valid: boolean;
    error?: string;
  }> {
    const config = this.facebookConfigService.config;

    return new Promise((resolve) => {
      const pythonProcess = spawn(config.pythonExecutable, [
        '-c',
        'import selenium; print(selenium.__version__)',
      ]);

      let stdout = '';
      let stderr = '';

      pythonProcess.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      pythonProcess.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code === 0) {
          const version = stdout.trim();
          this.logger.log(`Selenium version: ${version}`);
          resolve({ valid: true });
        } else {
          resolve({
            valid: false,
            error: `Selenium not installed or not accessible: ${stderr || stdout}`,
          });
        }
      });

      pythonProcess.on('error', (error) => {
        resolve({
          valid: false,
          error: `Failed to check Selenium installation: ${error.message}`,
        });
      });
    });
  }

  /**
   * Validates Chrome installation and accessibility
   */
  private async validateChromeInstallation(): Promise<{
    valid: boolean;
    error?: string;
  }> {
    return new Promise((resolve) => {
      const chromePaths = [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      ];

      let chromeFound = false;
      for (const chromePath of chromePaths) {
        try {
          if (fsSync.existsSync(chromePath)) {
            this.logger.log(`Chrome found at: ${chromePath}`);
            chromeFound = true;
            break;
          }
        } catch (error) {
          // Continue checking other paths
        }
      }

      if (chromeFound) {
        resolve({ valid: true });
      } else {
        resolve({
          valid: false,
          error: 'Google Chrome not found in standard installation paths',
        });
      }
    });
  }

  /**
   * Runs a comprehensive environment test
   */
  async runEnvironmentTest(): Promise<{
    success: boolean;
    results: Record<string, any>;
  }> {
    const results: Record<string, any> = {};

    try {
      // Test Python
      const pythonTest =
        await this.facebookConfigService.validatePythonEnvironment();
      results.python = pythonTest;

      // Test Selenium
      const seleniumTest = await this.validateSeleniumInstallation();
      results.selenium = seleniumTest;

      // Test Chrome
      const chromeTest = await this.validateChromeInstallation();
      results.chrome = chromeTest;

      // Test configuration
      const configErrors =
        await this.facebookConfigService.validateConfiguration();
      results.configuration = {
        valid: configErrors.length === 0,
        errors: configErrors,
      };

      // Test script existence
      const config = this.facebookConfigService.config;
      results.script = {
        valid: fsSync.existsSync(config.pythonScriptPath),
        path: config.pythonScriptPath,
      };

      // Test temp directory
      results.tempDirectory = {
        valid: fsSync.existsSync(config.tempFilesDir),
        path: config.tempFilesDir,
      };

      const allValid = Object.values(results).every(
        (result: any) => result.valid,
      );

      return {
        success: allValid,
        results,
      };
    } catch (error) {
      this.logger.error(`Environment test failed: ${error.message}`);
      return {
        success: false,
        results: {
          error: error.message,
        },
      };
    }
  }

  /**
   * Cleans up temporary files
   */
  async cleanupTempFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
      this.logger.debug(`Cleaned up temp file: ${filePath}`);
    } catch (error) {
      this.logger.warn(
        `Failed to cleanup temp file ${filePath}: ${error.message}`,
      );
    }
  }

  /**
   * Cleans up old temporary files
   */
  async cleanupOldTempFiles(maxAgeHours: number = 24): Promise<void> {
    try {
      const config = this.facebookConfigService.config;
      const tempDir = config.tempFilesDir;
      const maxAge = maxAgeHours * 60 * 60 * 1000; // Convert to milliseconds

      const files = await fs.readdir(tempDir);
      const now = Date.now();

      for (const file of files) {
        const filePath = path.join(tempDir, file);
        const stats = await fs.stat(filePath);

        if (now - stats.mtime.getTime() > maxAge) {
          await fs.unlink(filePath);
          this.logger.debug(`Cleaned up old temp file: ${filePath}`);
        }
      }
    } catch (error) {
      this.logger.warn(`Failed to cleanup old temp files: ${error.message}`);
    }
  }
}
