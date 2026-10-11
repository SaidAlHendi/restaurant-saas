export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number,
    public readonly details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Not found', details: Record<string, unknown> = {}) {
    super('NOT_FOUND', message, 404, details);
  }
}

export class GoneError extends AppError {
  constructor(message = 'Gone', details: Record<string, unknown> = {}) {
    super('GONE', message, 410, details);
  }
}

export class ForbiddenError extends AppError {
  constructor(
    message = 'Forbidden',
    details: Record<string, unknown> = {},
    code = 'FORBIDDEN',
  ) {
    super(code, message, 403, details);
  }
}

export class ConflictError extends AppError {
  constructor(
    message = 'Conflict',
    details: Record<string, unknown> = {},
    code = 'CONFLICT',
  ) {
    super(code, message, 409, details);
  }
}

export class BusinessRuleError extends AppError {
  constructor(code: string, message: string, details: Record<string, unknown> = {}) {
    super(code, message, 422, details);
  }
}

export class ValidationError extends AppError {
  constructor(
    message = 'Validation failed',
    details: Record<string, unknown> = {},
    code = 'VALIDATION_ERROR',
  ) {
    super(code, message, 400, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(
    code = 'UNAUTHORIZED',
    message = 'Unauthorized',
    details: Record<string, unknown> = {},
  ) {
    super(code, message, 401, details);
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message = 'Too many requests', details: Record<string, unknown> = {}) {
    super('RATE_LIMITED', message, 429, details);
  }
}
