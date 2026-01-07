import { describe, it, expect } from '@jest/globals';
import {
  ScreepsApiError,
  ValidationError,
  RateLimitError,
  AuthenticationError,
  handleApiError,
  isScreepsApiError,
  isValidationError,
  isRateLimitError,
  isAuthenticationError,
} from '../../src/utils/errors.js';

describe('Error Classes', () => {
  describe('ScreepsApiError', () => {
    it('should create error with code and status', () => {
      const error = new ScreepsApiError('Test error', 'TEST_CODE', 500);

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ScreepsApiError);
      expect(error.message).toBe('Test error');
      expect(error.name).toBe('ScreepsApiError');
      expect(error.code).toBe('TEST_CODE');
      expect(error.statusCode).toBe(500);
      expect(error.context).toBeUndefined();
    });

    it('should create error with context', () => {
      const context = { endpoint: '/test', attempt: 1 };
      const error = new ScreepsApiError('Test error', 'TEST_CODE', 500, context);

      expect(error.context).toEqual(context);
    });

    it('should have proper stack trace', () => {
      const error = new ScreepsApiError('Test error', 'TEST_CODE');

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('ScreepsApiError');
    });
  });

  describe('ValidationError', () => {
    it('should create validation error with field and value', () => {
      const error = new ValidationError('Room name is required', 'room', null);

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.message).toBe('Room name is required');
      expect(error.name).toBe('ValidationError');
      expect(error.field).toBe('room');
      expect(error.value).toBeNull();
    });

    it('should handle different value types', () => {
      const error1 = new ValidationError('Invalid value', 'field1', 123);
      const error2 = new ValidationError('Invalid value', 'field2', { nested: 'object' });

      expect(error1.value).toBe(123);
      expect(error2.value).toEqual({ nested: 'object' });
    });
  });

  describe('RateLimitError', () => {
    it('should create rate limit error with retry after', () => {
      const error = new RateLimitError('Rate limit exceeded', 60);

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ScreepsApiError);
      expect(error).toBeInstanceOf(RateLimitError);
      expect(error.message).toBe('Rate limit exceeded');
      expect(error.name).toBe('RateLimitError');
      expect(error.code).toBe('RATE_LIMITED');
      expect(error.statusCode).toBe(429);
      expect(error.retryAfter).toBe(60);
    });

    it('should work without retry after', () => {
      const error = new RateLimitError('Rate limit exceeded');

      expect(error.retryAfter).toBeUndefined();
    });
  });

  describe('AuthenticationError', () => {
    it('should create authentication error with default message', () => {
      const error = new AuthenticationError();

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ScreepsApiError);
      expect(error).toBeInstanceOf(AuthenticationError);
      expect(error.message).toBe('Authentication failed');
      expect(error.name).toBe('AuthenticationError');
      expect(error.code).toBe('AUTH_FAILED');
      expect(error.statusCode).toBe(401);
    });

    it('should create authentication error with custom message', () => {
      const error = new AuthenticationError('Invalid token');

      expect(error.message).toBe('Invalid token');
    });
  });

  describe('handleApiError', () => {
    it('should re-throw ScreepsApiError as-is', () => {
      const originalError = new ScreepsApiError('Test error', 'TEST_CODE', 500);

      expect(() => handleApiError(originalError)).toThrow(originalError);
    });

    it('should wrap standard Error in ScreepsApiError', () => {
      const originalError = new Error('Network error');

      try {
        handleApiError(originalError);
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ScreepsApiError);
        expect((error as ScreepsApiError).message).toBe('Network error');
        expect((error as ScreepsApiError).code).toBe('UNKNOWN_ERROR');
        expect((error as ScreepsApiError).context).toEqual({ originalError: 'Error' });
      }
    });

    it('should wrap non-Error objects in ScreepsApiError', () => {
      const originalError = 'String error';

      try {
        handleApiError(originalError);
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ScreepsApiError);
        expect((error as ScreepsApiError).message).toBe('An unknown error occurred');
        expect((error as ScreepsApiError).code).toBe('UNKNOWN_ERROR');
        expect((error as ScreepsApiError).context).toEqual({ originalValue: 'String error' });
      }
    });

    it('should handle undefined and null', () => {
      expect(() => handleApiError(null)).toThrow(ScreepsApiError);
      expect(() => handleApiError(undefined)).toThrow(ScreepsApiError);
    });
  });

  describe('Type Guards', () => {
    const apiError = new ScreepsApiError('API error', 'TEST', 500);
    const validationError = new ValidationError('Validation failed', 'field', 'value');
    const rateLimitError = new RateLimitError('Rate limited', 60);
    const authError = new AuthenticationError('Auth failed');
    const genericError = new Error('Generic error');

    describe('isScreepsApiError', () => {
      it('should identify ScreepsApiError instances', () => {
        expect(isScreepsApiError(apiError)).toBe(true);
        expect(isScreepsApiError(rateLimitError)).toBe(true);
        expect(isScreepsApiError(authError)).toBe(true);
      });

      it('should reject non-ScreepsApiError instances', () => {
        expect(isScreepsApiError(validationError)).toBe(false);
        expect(isScreepsApiError(genericError)).toBe(false);
        expect(isScreepsApiError('string')).toBe(false);
        expect(isScreepsApiError(null)).toBe(false);
      });
    });

    describe('isValidationError', () => {
      it('should identify ValidationError instances', () => {
        expect(isValidationError(validationError)).toBe(true);
      });

      it('should reject non-ValidationError instances', () => {
        expect(isValidationError(apiError)).toBe(false);
        expect(isValidationError(genericError)).toBe(false);
        expect(isValidationError('string')).toBe(false);
      });
    });

    describe('isRateLimitError', () => {
      it('should identify RateLimitError instances', () => {
        expect(isRateLimitError(rateLimitError)).toBe(true);
      });

      it('should reject non-RateLimitError instances', () => {
        expect(isRateLimitError(apiError)).toBe(false);
        expect(isRateLimitError(authError)).toBe(false);
        expect(isRateLimitError(genericError)).toBe(false);
      });
    });

    describe('isAuthenticationError', () => {
      it('should identify AuthenticationError instances', () => {
        expect(isAuthenticationError(authError)).toBe(true);
      });

      it('should reject non-AuthenticationError instances', () => {
        expect(isAuthenticationError(apiError)).toBe(false);
        expect(isAuthenticationError(rateLimitError)).toBe(false);
        expect(isAuthenticationError(genericError)).toBe(false);
      });
    });
  });
});
