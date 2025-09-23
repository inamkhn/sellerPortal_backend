import { Controller, Get, Post, Body, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SeleniumWorkerService } from './selenium-worker.service';
import { FacebookProductData } from './interfaces';

@ApiTags('Facebook Integration')
@Controller('facebook-integration')
export class FacebookIntegrationController {
  private readonly logger = new Logger(FacebookIntegrationController.name);

  constructor(private readonly seleniumWorkerService: SeleniumWorkerService) {}

  @Get('validate-environment')
  @ApiOperation({ summary: 'Validate Facebook automation environment' })
  @ApiResponse({
    status: 200,
    description: 'Environment validation results',
  })
  async validateEnvironment() {
    this.logger.log('Running environment validation...');

    try {
      const testResults = await this.seleniumWorkerService.runEnvironmentTest();

      return {
        success: testResults.success,
        message: testResults.success
          ? 'Environment validation passed'
          : 'Environment validation failed',
        results: testResults.results,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Environment validation error: ${error.message}`);

      return {
        success: false,
        message: 'Environment validation failed with error',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Get('test-selenium')
  @ApiOperation({ summary: 'Test Selenium WebDriver initialization' })
  @ApiResponse({
    status: 200,
    description: 'Selenium test results',
  })
  async testSelenium() {
    this.logger.log('Testing Selenium WebDriver...');

    try {
      const isValid =
        await this.seleniumWorkerService.validateSeleniumEnvironment();

      return {
        success: isValid,
        message: isValid
          ? 'Selenium environment is ready'
          : 'Selenium environment validation failed',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Selenium test error: ${error.message}`);

      return {
        success: false,
        message: 'Selenium test failed with error',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Post('test-post')
  @ApiOperation({ summary: 'Test Facebook Marketplace posting (dry run)' })
  @ApiResponse({
    status: 200,
    description: 'Test posting results',
  })
  async testPost(@Body() productData: FacebookProductData) {
    this.logger.log('Testing Facebook Marketplace posting...');

    try {
      // This would be a dry run or test posting
      const result =
        await this.seleniumWorkerService.executeSeleniumScript(productData);

      return {
        success: result.success,
        message: result.success
          ? 'Test posting completed successfully'
          : 'Test posting failed',
        result,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Test posting error: ${error.message}`);

      return {
        success: false,
        message: 'Test posting failed with error',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }
}
