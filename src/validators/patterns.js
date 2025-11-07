/*
 * Validation Patterns
 * -------------------------------------------------------------
 * This file contains reusable regex patterns for input validation.
 * These patterns are used across validators to ensure consistency.
 *
 * Security & Best Practices:
 *   - All patterns use bounded quantifiers (prevent ReDoS)
 *   - Strict whitelisting approach
 *   - No catastrophic backtracking
 *
 * Usage:
 *   import { VALIDATION_PATTERNS } from '../validators/patterns.js';
 *
 */

export const VALIDATION_PATTERNS = Object.freeze({
  // User identification
  name: /^[a-zA-Z\s\-.]{2,50}$/,
  email: /^[a-zA-Z0-9._%+-]{1,64}@[a-zA-Z0-9.-]{1,253}\.[a-zA-Z]{2,}$/u,
  phone: /^[+]?[1-9][\d]{0,15}$/u,
  username: /^[a-zA-Z0-9_]{3,20}$/u,
  
  // Banking
  accountNumber: /^[0-9]{10,12}$/u, // 10-12 digits
  bankCode: /^[0-9]{6}$/u, // 6 digits
  branchCode: /^[0-9]{6}$/u, // 6 digits
  idNumber: /^[0-9]{13}$/u, // 13 digits

  // Payment
  creditCard: /^[0-9]{13,19}$/u, // 13-19 digits
  amount: /^\d+(\.\d{1,2})?$/u, // Decimal with up to 2 places
  cvv: /^[0-9]{3,4}$/u, // 3 or 4 digits
  expiryDate: /^(0[1-9]|1[0-2])\/([0-9]{4})$/u,  // MM/YYYY
  expiryMonth: /^(0[1-9]|1[0-2])$/u,  // 01-12
  expiryYear: /^(20[2-9][0-9])$/u,  // 2020-2099
  currency: /^[A-Z]{3}$/u, // ISO 4217 currency code
  swiftCode: /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/u, // SWIFT/BIC code
  
  // International Payments
  iban: /^[A-Z]{2}[0-9]{2}[A-Z0-9]{1,30}$/u,  // IBAN format (country code + check digits + account)
  bic: /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/u,  // BIC/SWIFT code (8 or 11 chars)
  countryCode: /^[A-Z]{2}$/u,  // ISO 3166-1 alpha-2
  beneficiaryName: /^[a-zA-Z\s\-.]{2,100}$/u,
  beneficiaryAddress: /^[a-zA-Z0-9\s,.\-\/]{5,200}$/u,
  intermediaryBank: /^[a-zA-Z0-9\s,.\-]{2,100}$/u,
  paymentReference: /^[a-zA-Z0-9\s\-\/]{1,35}$/u,  // SWIFT reference max 35 chars
  purposeCode: /^[A-Z0-9]{3,10}$/u,  // Purpose/reason codes
  
  // General
  alphanumeric: /^[a-zA-Z0-9]+$/u,
  safeText: /^[a-zA-Z0-9\s.,!?-]{1,200}$/u,
  noScript: /^(?!.*<(?:script|style|iframe|object|embed|link|meta))[^<>]*$/u,
  noHtml: /^[^<>]*$/u,
  
  // IDs
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu,
  mongoId: /^[0-9a-fA-F]{24}$/u,
  transactionId: /^[a-zA-Z0-9_-]{10,50}$/u,
  
  // URLs
  url: /^(https?:\/\/)([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,6}([/?#]\S*)?$/u
});

// Validate value against a named pattern
export function validatePattern(value, patternName) {
  const pattern = VALIDATION_PATTERNS[patternName];
  if (!pattern) {
    throw new Error(`Unknown validation pattern: ${patternName}`);
  }
  return pattern.test(value);
}

// Get pattern by name
export function getPattern(patternName) {
  return VALIDATION_PATTERNS[patternName];
}

// -----------------------------------End of File-------------------------------------------