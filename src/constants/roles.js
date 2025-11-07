/*
 * User Roles Constants
 * -------------------------------------------------------------
 * This file defines all user roles used throughout the application.
 * Centralizing roles prevents typos and makes role management easier.
 * We have three primary roles: CUSTOMER, STAFF, and ADMIN.
 *
 * Usage:
 *   import { USER_ROLES } from '../constants/roles.js';
 *   if (user.role === USER_ROLES.ADMIN) { ... }
 *
 * Last reviewed: 2025-11-04
 * Maintainer: Security Team <security@example.com>
 */

export const USER_ROLES = Object.freeze({
  CUSTOMER: 'customer',
  STAFF: 'staff',
  ADMIN: 'admin'
});

// Array of all valid roles for validation
export const ALL_ROLES = Object.freeze(
  Object.values(USER_ROLES)
);

// Check if a role is valid
export function isValidRole(role) {
  return ALL_ROLES.includes(role);
}

// Default role for new users
export const DEFAULT_USER_ROLE = USER_ROLES.CUSTOMER;

// Default role for new staff
export const DEFAULT_STAFF_ROLE = USER_ROLES.STAFF;
