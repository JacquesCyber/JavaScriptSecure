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
 * Maintainer: Security Team <security@securebank.com>
 */

import bcrypt from 'bcrypt';
import { SECURITY_CONSTANTS } from '../constants/security.js';

// Hash a plaintext password
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

// Verify a plaintext password against a hash
export async function verifyPassword(password, hash) {
  if (!password || typeof password !== 'string') {
    throw new Error('Password must be a non-empty string');
  }

  if (!hash || typeof hash !== 'string') {
    throw new Error('Hash must be a non-empty string');
  }

  // Compare the plaintext password with the hash
  try {
    return await bcrypt.compare(password, hash);
  } catch (error) {
    throw new Error(`Password verification failed: ${error.message}`);
  }
}

// Validate password strength
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

// --------------------------------End of File---------------------------------------------