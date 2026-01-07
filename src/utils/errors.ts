/**
 * Custom error classes for Screeps World MCP
 *
 * These error classes provide a consistent error handling pattern across the codebase.
 * All errors are thrown (never returned) and include context for better debugging.
 */

/**
 * Base error class for Screeps API-related errors.
 * Includes error code, HTTP status code, and additional context.
 */
export class ScreepsApiError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode?: number,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ScreepsApiError';
    // Maintains proper stack trace for where error was thrown (V8-specific)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Error thrown when input validation fails.
 * Used for parameter validation, missing required fields, etc.
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly field: string,
    public readonly value: unknown
  ) {
    super(message);
    this.name = 'ValidationError';
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Error thrown when API rate limit is exceeded (HTTP 429).
 * Includes retry-after information when available.
 */
export class RateLimitError extends ScreepsApiError {
  constructor(
    message: string,
    public readonly retryAfter?: number
  ) {
    super(message, 'RATE_LIMITED', 429);
    this.name = 'RateLimitError';
  }
}

/**
 * Error thrown when authentication fails (HTTP 401).
 * Indicates invalid or expired credentials.
 */
export class AuthenticationError extends ScreepsApiError {
  constructor(message: string = 'Authentication failed') {
    super(message, 'AUTH_FAILED', 401);
    this.name = 'AuthenticationError';
  }
}

/**
 * Utility function to handle and transform unknown errors into typed ScreepsApiError.
 * This ensures all errors thrown from the API client are consistently typed.
 *
 * @param error - The error to handle (can be any type)
 * @returns Never returns - always throws a typed error
 * @throws {ScreepsApiError} - If error is already a ScreepsApiError, re-throws it
 * @throws {ScreepsApiError} - If error is a generic Error, wraps it in ScreepsApiError
 * @throws {ScreepsApiError} - For unknown error types, creates a new ScreepsApiError
 */
export function handleApiError(error: unknown): never {
  // If already a ScreepsApiError, re-throw as-is
  if (error instanceof ScreepsApiError) {
    throw error;
  }

  // ValidationError should be preserved and not wrapped
  // It's meant for application-level validation, not API errors
  if (error instanceof ValidationError) {
    throw error;
  }

  // If it's a standard Error, wrap it with context
  if (error instanceof Error) {
    throw new ScreepsApiError(
      error.message,
      'UNKNOWN_ERROR',
      undefined,
      { originalError: error.name }
    );
  }

  // For non-Error objects, create a generic error
  throw new ScreepsApiError(
    'An unknown error occurred',
    'UNKNOWN_ERROR',
    undefined,
    { originalValue: String(error) }
  );
}

/**
 * Type guard to check if an error is a ScreepsApiError
 */
export function isScreepsApiError(error: unknown): error is ScreepsApiError {
  return error instanceof ScreepsApiError;
}

/**
 * Type guard to check if an error is a ValidationError
 */
export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}

/**
 * Type guard to check if an error is a RateLimitError
 */
export function isRateLimitError(error: unknown): error is RateLimitError {
  return error instanceof RateLimitError;
}

/**
 * Type guard to check if an error is an AuthenticationError
 */
export function isAuthenticationError(error: unknown): error is AuthenticationError {
  return error instanceof AuthenticationError;
}
