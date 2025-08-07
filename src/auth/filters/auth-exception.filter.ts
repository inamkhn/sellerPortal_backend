import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch(HttpException)
export class AuthExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      message: exception.message,
      error: this.getErrorType(status),
    };

    // Add additional context for specific error types
    if (status === (HttpStatus.UNAUTHORIZED as number)) {
      errorResponse.message =
        'Authentication failed. Please check your credentials.';
    } else if (status === (HttpStatus.FORBIDDEN as number)) {
      errorResponse.message = 'Access denied. Insufficient permissions.';
    } else if (status === (HttpStatus.CONFLICT as number)) {
      errorResponse.message = 'Resource conflict. User may already exist.';
    }

    response.status(status).json(errorResponse);
  }

  private getErrorType(status: number): string {
    switch (status as HttpStatus) {
      case HttpStatus.UNAUTHORIZED:
        return 'Unauthorized';
      case HttpStatus.FORBIDDEN:
        return 'Forbidden';
      case HttpStatus.BAD_REQUEST:
        return 'Bad Request';
      case HttpStatus.CONFLICT:
        return 'Conflict';
      case HttpStatus.TOO_MANY_REQUESTS:
        return 'Too Many Requests';
      default:
        return 'Internal Server Error';
    }
  }
}
