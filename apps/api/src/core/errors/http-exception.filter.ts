import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { ZodValidationException } from 'nestjs-zod';
import { ZodError } from 'zod';

import { AppError } from './app-errors';

type AppErrorShape = {
  code: string;
  message: string;
  statusCode: number;
  details: Record<string, unknown>;
};

function asAppError(exception: unknown): AppErrorShape | null {
  if (exception instanceof AppError) {
    return {
      code: exception.code,
      message: exception.message,
      statusCode: exception.statusCode,
      details: exception.details,
    };
  }
  if (typeof exception !== 'object' || exception === null) {
    return null;
  }
  if (!('statusCode' in exception && 'code' in exception && 'message' in exception)) {
    return null;
  }
  const row = exception as {
    statusCode: unknown;
    code: unknown;
    message: unknown;
    details?: unknown;
  };
  if (
    typeof row.statusCode !== 'number' ||
    typeof row.code !== 'string' ||
    typeof row.message !== 'string'
  ) {
    return null;
  }
  return {
    code: row.code,
    message: row.message,
    statusCode: row.statusCode,
    details:
      typeof row.details === 'object' && row.details !== null
        ? (row.details as Record<string, unknown>)
        : {},
  };
}

function messageFromHttpException(exception: HttpException): string {
  const body = exception.getResponse();
  if (typeof body === 'string') {
    return body;
  }
  if (typeof body !== 'string' && 'message' in body) {
    const raw = body.message;
    if (typeof raw === 'string') {
      return raw;
    }
    if (Array.isArray(raw)) {
      return raw.map(String).join(', ');
    }
  }
  return exception.message;
}

function detailsFromHttpBody(body: string | object): Record<string, unknown> {
  if (typeof body === 'string') {
    return {};
  }
  return { ...(body as Record<string, unknown>) };
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const appError = asAppError(exception);
    if (appError) {
      response.status(appError.statusCode).json({
        error: {
          code: appError.code,
          message: appError.message,
          details: appError.details,
        },
      });
      return;
    }

    if (exception instanceof ZodValidationException) {
      const zodError = exception.getZodError();
      const issues = zodError instanceof ZodError ? zodError.issues : [];
      response.status(HttpStatus.BAD_REQUEST).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: { issues },
        },
      });
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      response.status(status).json({
        error: {
          code: 'HTTP_ERROR',
          message: messageFromHttpException(exception),
          details: detailsFromHttpBody(body),
        },
      });
      return;
    }

    if (process.env['NODE_ENV'] === 'development') {
      // eslint-disable-next-line no-console -- surface root cause when pino only logs "status code 500"
      console.error(exception);
    }

    const devDetails =
      process.env['NODE_ENV'] === 'development' && exception instanceof Error
        ? { cause: exception.message, name: exception.name }
        : {};

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
        details: devDetails,
      },
    });
  }
}
