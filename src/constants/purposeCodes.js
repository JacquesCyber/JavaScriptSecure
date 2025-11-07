/*
 * Payment Purpose Codes (SWIFT MT103)
 * -------------------------------------------------------------
 * This file defines standard SWIFT purpose codes for international payments.
 * These codes are used for compliance, AML reporting, and transaction categorization.
 *
 * Reference: ISO 20022 Purpose Code List
 * Usage:
 *   import { PAYMENT_PURPOSE_CODES } from '../constants/purposeCodes.js';
 *
 */

// Swift MT103 Purpose Codes these codes are required for international payments as they prevent fraud and ensure compliance.
export const PAYMENT_PURPOSE_CODES = Object.freeze({
  'SALA': 'Salary Payment',
  'PENS': 'Pension Payment',
  'SUPP': 'Supplier Payment',
  'TRAD': 'Trade Services',
  'LOAN': 'Loan Payment',
  'INTC': 'Intra-Company Payment',
  'GDDS': 'Purchase/Sale of Goods',
  'SERV': 'Purchase/Sale of Services',
  'EDUC': 'Education Related',
  'MEDI': 'Medical Treatment',
  'CHAR': 'Charity Payment',
  'INVS': 'Investment',
  'OTHR': 'Other'
});

// Array of all valid purpose codes
export const ALL_PURPOSE_CODES = Object.freeze(
  Object.keys(PAYMENT_PURPOSE_CODES)
);

// Check if a purpose code is valid
export function isValidPurposeCode(code) {
  return code && PAYMENT_PURPOSE_CODES.hasOwnProperty(code.toUpperCase());
}

// Get purpose description by code
export function getPurposeDescription(code) {
  return PAYMENT_PURPOSE_CODES[code?.toUpperCase()] || 'Unknown Purpose';
}

// Default purpose code
export const DEFAULT_PURPOSE_CODE = 'OTHR';
