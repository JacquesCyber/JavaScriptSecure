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
 */

export const SECURITY_CONSTANTS = {
  
  BCRYPT_SALT_ROUNDS: 12,   // Recommended number of salt rounds for bcrypt
  PASSWORD_MIN_LENGTH: 8,   // Minimum password length requirement 8
  SESSION_TIMEOUT_MS: 900000, // 15 minutes session timeout in milliseconds
  MAX_LOGIN_ATTEMPTS: 5,   // Maximum login attempts before account lockout
  CSRF_TOKEN_LENGTH: 32,  // Length of CSRF tokens in bytes
  PASSWORD_REGEX: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/, // Password must contain at least one uppercase letter, one lowercase letter, and one number
};

// Common security-related error messages
export const SECURITY_ERRORS = {
  INVALID_CREDENTIALS: 'Invalid username or password',
  WEAK_PASSWORD: 'Password must be at least 8 characters and contain uppercase, lowercase, and numbers',
  SESSION_EXPIRED: 'Your session has expired. Please login again.',
  UNAUTHORIZED: 'You are not authorized to access this resource',
  ACCOUNT_LOCKED: 'Account locked due to too many failed login attempts',
};

//----------------------------- END OF FILE -----------------------------