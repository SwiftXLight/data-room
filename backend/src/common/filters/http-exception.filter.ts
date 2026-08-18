import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = 'An unexpected error occurred.';
    let details: any = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const resBody: any = exception.getResponse();

      if (typeof resBody === 'object' && resBody !== null) {
        if (resBody.code) {
          code = resBody.code;
        } else {
          code = this.getErrorCodeFromStatus(status);
        }

        if (resBody.message) {
          if (Array.isArray(resBody.message)) {
            message = 'Request validation failed.';
            code = 'VALIDATION_ERROR';
            details = {};
            resBody.message.forEach((msg: string) => {
              const field = msg.split(' ')[0] || 'field';
              details[field] = msg;
            });
          } else {
            message = resBody.message;
          }
        }
        
        if (resBody.details) {
          details = resBody.details;
        }
      } else if (typeof resBody === 'string') {
        message = resBody;
        code = this.getErrorCodeFromStatus(status);
      }
    } else {
      console.error('Unhandled Exception:', exception);
    }

    response.status(status).json({
      code,
      message,
      ...(details ? { details } : {}),
    });
  }

  private getErrorCodeFromStatus(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'BAD_REQUEST';
      case HttpStatus.UNAUTHORIZED:
        return 'AUTH_TOKEN_INVALID';
      case HttpStatus.FORBIDDEN:
        return 'ACCESS_DENIED';
      case HttpStatus.NOT_FOUND:
        return 'RESOURCE_NOT_FOUND';
      case HttpStatus.CONFLICT:
        return 'CONFLICT';
      case HttpStatus.PAYLOAD_TOO_LARGE:
        return 'FILE_TOO_LARGE';
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return 'UNPROCESSABLE_ENTITY';
      default:
        return 'INTERNAL_ERROR';
    }
  }
}
