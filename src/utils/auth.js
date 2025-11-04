/**
 * Authentication Utilities
 * -------------------------------------------------------------
 * Centralized bcrypt operations for password hashing and verification.
 * Provides consistent security across the application.
 *
 * Usage:
 *   import { hashPassword, verifyPassword } from '../utils/auth.js';
 *   
 *   const hash = await hashPassword('myPassword123');
 *   const isValid = await verifyPassword('myPassword123', hash);
 *
 * Last reviewed: 2025-11-04
 * Maintainer: Security Team <security@securebank.com>
 */

import bcrypt from 'bcrypt';
import { SECURITY_CONSTANTS } from '../constants/security.js';

/**
 * Hash a plain-text password using bcrypt
 * 
 * @param {string} password - Plain-text password to hash
 * @returns {Promise<string>} - Bcrypt hashed password
 * @throws {Error} - If password is empty or hashing fails
 * 
 * @example
 * const hash = await hashPassword('SecurePassword123!');
 * // Returns: $2b$12$...
 */
export async function hashPassword(password) {
  if (!password || typeof password !== 'string') {
    throw new Error('Password must be a non-empty string');
  }

  try {
    return await bcrypt.hash(password, SECURITY_CONSTANTS.BCRYPT_SALT_ROUNDS);
  } catch (error) {
    throw new Error(`Password hashing failed: ${error.message}`);
  }
}

/**
 * Verify a plain-text password against its bcrypt hash
 * 
 * @param {string} password - Plain-text password to verify
 * @param {string} hash - Bcrypt hash to compare against
 * @returns {Promise<boolean>} - True if password matches hash, false otherwise
 * @throws {Error} - If parameters are invalid or comparison fails
 * 
 * @example
 * const isValid = await verifyPassword('SecurePassword123!', hashedPassword);
 * if (isValid) {
 *   // Password is correct
 * }
 */
export async function verifyPassword(password, hash) {
  if (!password || typeof password !== 'string') {
    throw new Error('Password must be a non-empty string');
  }

  if (!hash || typeof hash !== 'string') {
    throw new Error('Hash must be a non-empty string');
  }

  try {
    return await bcrypt.compare(password, hash);
  } catch (error) {
    throw new Error(`Password verification failed: ${error.message}`);
  }
}

/**
 * Validate password strength
 * 
 * @param {string} password - Password to validate
 * @returns {Object} - { isValid: boolean, errors: string[] }
 * 
 * @example
 * const result = validatePasswordStrength('weak');
 * // Returns: { isValid: false, errors: ['Password too short', ...] }
 */
export function validatePasswordStrength(password) {
  const errors = [];

  if (!password) {
    return { isValid: false, errors: ['Password is required'] };
  }

  if (password.length < SECURITY_CONSTANTS.PASSWORD_MIN_LENGTH) {
    errors.push(`Password must be at least ${SECURITY_CONSTANTS.PASSWORD_MIN_LENGTH} characters`);
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
