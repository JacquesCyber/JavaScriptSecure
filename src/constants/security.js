/**
 * Security Constants
 * -------------------------------------------------------------
 * Centralized security configuration values for authentication,
 * password hashing, and session management.
 *
 * Usage:
 *   import { SECURITY_CONSTANTS } from '../constants/security.js';
 *   const hash = await bcrypt.hash(password, SECURITY_CONSTANTS.BCRYPT_SALT_ROUNDS);
 *
 * Last reviewed: 2025-11-04
 * Maintainer: Security Team <security@securebank.com>
 */

export const SECURITY_CONSTANTS = {
  /**
   * Number of salt rounds for bcrypt password hashing
   * Higher values = more secure but slower
   * Recommended: 10-12 for production
   */
  BCRYPT_SALT_ROUNDS: 12,

  /**
   * Minimum password length requirement
   */
  PASSWORD_MIN_LENGTH: 8,

  /**
   * Session timeout in milliseconds (15 minutes)
   */
  SESSION_TIMEOUT_MS: 900000,

  /**
   * Maximum login attempts before account lockout
   */
  MAX_LOGIN_ATTEMPTS: 5,

  /**
   * CSRF token length in bytes
   */
  CSRF_TOKEN_LENGTH: 32,

  /**
   * Password validation regex
   * Must contain at least one uppercase, one lowercase, one number
   */
  PASSWORD_REGEX: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/,
};

/**
 * Security error messages
 */
export const SECURITY_ERRORS = {
  INVALID_CREDENTIALS: 'Invalid username or password',
  WEAK_PASSWORD: 'Password must be at least 8 characters and contain uppercase, lowercase, and numbers',
  SESSION_EXPIRED: 'Your session has expired. Please login again.',
  UNAUTHORIZED: 'You are not authorized to access this resource',
  ACCOUNT_LOCKED: 'Account locked due to too many failed login attempts',
};
