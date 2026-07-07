import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AppError, toErrorEnvelope } from './errors';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const traceId = uuidv4();

    if (exception instanceof AppError) {
      const { status, body } = toErrorEnvelope(exception, traceId);
      return response.status(status).json(body);
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exResponse = exception.getResponse();
      const message =
        typeof exResponse === 'string'
          ? exResponse
          : (exResponse as { message?: string }).message ?? exception.message;
      return response.status(status).json({
        code: HttpStatus[status] ?? 'ERROR',
        message,
        traceId,
      });
    }

    const { status, body } = toErrorEnvelope(exception, traceId);
    response.status(status).json(body);
  }
}
