/*
 * HTTP Status Codes Constants
 * -------------------------------------------------------------
 * This file defines commonly used HTTP status codes.
 * Using named constants improves code readability and maintainability.
 *
 * Usage:
 *   import { HTTP_STATUS } from '../constants/httpStatus.js';
 *   res.status(HTTP_STATUS.OK).json({ ... });
 *
 * Last reviewed: 2025-11-04
 * Maintainer: Backend Team <backend@example.com>
 */

export const HTTP_STATUS = Object.freeze({
  // Success
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  
  // Redirection
  MOVED_PERMANENTLY: 301,
  FOUND: 302,
  NOT_MODIFIED: 304,
  
  // Client Errors
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  
  // Server Errors
  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504
});
