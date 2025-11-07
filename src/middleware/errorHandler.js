/*
 * Centralized Error Handler Middleware
 * -------------------------------------------------------------
 * This middleware provides centralized error handling for the application.
 * It ensures consistent error responses and prevents information leakage.
 *
 * Security & Best Practices:
 *   - Never exposes stack traces in production
 *   - Logs errors securely (no sensitive data in logs)
 *   - Returns generic error messages to users in production
 *   - Detailed errors only in development
 *
 * Usage:
 *   // In app.js (after all routes)
 *   import { errorHandler } from './middleware/errorHandler.js';
 *   app.use(errorHandler);
 *
 */

import { HTTP_STATUS } from '../constants/httpStatus.js';

/**
 * Main error handler middleware
 */
export const errorHandler = (err, req, res, next) => {
  // Log error details for debugging (never log sensitive data)
  console.error('[Error Handler]', {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.originalUrl,
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });

  // Determine if we're in development mode
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Determine status code
  const statusCode = err.statusCode || err.status || HTTP_STATUS.INTERNAL_SERVER_ERROR;

  // Prepare error response
  const errorResponse = {
    error: true,
    message: isDevelopment ? err.message : getGenericErrorMessage(statusCode),
    code: err.code || 'INTERNAL_ERROR',
    timestamp: new Date().toISOString()
  };

  // Add stack trace only in development
  if (isDevelopment && err.stack) {
    errorResponse.stack = err.stack;
  }

  // Add validation errors if present
  if (err.validationErrors) {
    errorResponse.validationErrors = err.validationErrors;
  }

  // Send error response
  res.status(statusCode).json(errorResponse);
};

// Get generic error message based on status code
function getGenericErrorMessage(statusCode) {
  switch (statusCode) {
    case HTTP_STATUS.BAD_REQUEST:
      return 'Invalid request';
    case HTTP_STATUS.UNAUTHORIZED:
      return 'Authentication required';
    case HTTP_STATUS.FORBIDDEN:
      return 'Access denied';
    case HTTP_STATUS.NOT_FOUND:
      return 'Resource not found';
    case HTTP_STATUS.CONFLICT:
      return 'Resource conflict';
    case HTTP_STATUS.UNPROCESSABLE_ENTITY:
      return 'Invalid data provided';
    case HTTP_STATUS.TOO_MANY_REQUESTS:
      return 'Too many requests, please try again later';
    case HTTP_STATUS.INTERNAL_SERVER_ERROR:
    default:
      return 'An error occurred, please try again later';
  }
}

// 404 Not Found handler
export const notFoundHandler = (req, res, next) => {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  error.statusCode = HTTP_STATUS.NOT_FOUND;
  error.code = 'ROUTE_NOT_FOUND';
  next(error);
};

// Async wrapper to catch errors in async route handlers
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Custom Error Classes
export class AppError extends Error {
  constructor(message, statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR, code = 'APP_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Validation error class
export class ValidationError extends AppError {
  constructor(message, validationErrors = []) {
    super(message, HTTP_STATUS.UNPROCESSABLE_ENTITY, 'VALIDATION_ERROR');
    this.validationErrors = validationErrors;
  }
}

// Authentication error class
export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, HTTP_STATUS.UNAUTHORIZED, 'AUTHENTICATION_ERROR');
  }
}

// Authorization error class
export class AuthorizationError extends AppError {
  constructor(message = 'Access denied') {
    super(message, HTTP_STATUS.FORBIDDEN, 'AUTHORIZATION_ERROR');
  }
}

// Not Found error class
export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, HTTP_STATUS.NOT_FOUND, 'NOT_FOUND');
  }
}

// Conflict error class
export class ConflictError extends AppError {
  constructor(message = 'Resource conflict') {
    super(message, HTTP_STATUS.CONFLICT, 'CONFLICT');
  }
}

//----------------------------- END OF FILE -----------------------------