import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { ErrorResponseDto } from '../dto/error-response.dto';

@Catch()
export class UserAnalyticsExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(UserAnalyticsExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_SERVER_ERROR';
    let message = 'An unexpected error occurred';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null
      ) {
        message = (exceptionResponse as any).message || exception.message;
      }

      // Set appropriate error codes based on status
      switch (status) {
        case HttpStatus.UNAUTHORIZED:
          code = 'UNAUTHORIZED_ACCESS';
          message = 'Authentication required to access analytics';
          break;
        case HttpStatus.FORBIDDEN:
          code = 'FORBIDDEN_ACCESS';
          message = 'Insufficient permissions to access analytics';
          break;
        case HttpStatus.NOT_FOUND:
          code = 'USER_PROFILE_NOT_FOUND';
          message = 'User profile not found for analytics calculation';
          break;
        default:
          code = 'ANALYTICS_ERROR';
          break;
      }
    } else if (exception instanceof Error) {
      // Handle database and other errors
      this.logger.error(
        `Analytics calculation error: ${exception.message}`,
        exception.stack,
      );
      code = 'ANALYTICS_CALCULATION_FAILED';
      message = 'Failed to calculate user analytics';
    }

    const errorResponse: ErrorResponseDto = {
      success: false,
      error: {
        code,
        message,
        timestamp: new Date().toISOString(),
      },
    };

    response.status(status).json(errorResponse);
  }
}
