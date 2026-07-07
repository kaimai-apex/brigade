export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 400,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', details?: Record<string, unknown>) {
    super('NOT_FOUND', message, 404, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super('UNAUTHORIZED', message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super('FORBIDDEN', message, 403);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflict', details?: Record<string, unknown>) {
    super('CONFLICT', message, 409, details);
  }
}

export interface ErrorEnvelope {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  traceId: string;
}

export function toErrorEnvelope(
  error: unknown,
  traceId: string,
): { status: number; body: ErrorEnvelope } {
  if (error instanceof AppError) {
    return {
      status: error.statusCode,
      body: {
        code: error.code,
        message: error.message,
        details: error.details,
        traceId,
      },
    };
  }
  return {
    status: 500,
    body: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      traceId,
    },
  };
}
