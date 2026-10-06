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

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden', details: Record<string, unknown> = {}) {
    super('FORBIDDEN', message, 403, details);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflict', details: Record<string, unknown> = {}) {
    super('CONFLICT', message, 409, details);
  }
}

export class BusinessRuleError extends AppError {
  constructor(code: string, message: string, details: Record<string, unknown> = {}) {
    super(code, message, 422, details);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed', details: Record<string, unknown> = {}) {
    super('VALIDATION_ERROR', message, 400, details);
  }
}
