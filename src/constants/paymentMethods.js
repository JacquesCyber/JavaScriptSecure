/*
 * Payment Methods Constants
 * -------------------------------------------------------------
 * This file defines all supported payment methods.
 * Centralizing payment methods ensures consistency across the application.
 *
 * Usage:
 *   import { PAYMENT_METHODS } from '../constants/paymentMethods.js';
 *
 * Last reviewed: 2025-11-04
 * Maintainer: Backend Team <backend@example.com>
 */

export const PAYMENT_METHODS = Object.freeze({
  CARD: 'card',
  PAYPAL: 'paypal',
  BANK_TRANSFER: 'bank_transfer',
  SWIFT: 'swift',
  EFT: 'eft'
});

// Array of all valid payment methods
export const ALL_PAYMENT_METHODS = Object.freeze(
  Object.values(PAYMENT_METHODS)
);

// Check if a payment method is valid
export function isValidPaymentMethod(method) {
  return ALL_PAYMENT_METHODS.includes(method);
}

// Card brands
export const CARD_BRANDS = Object.freeze({
  VISA: 'visa',
  MASTERCARD: 'mastercard',
  AMEX: 'amex',
  DISCOVER: 'discover'
});

// Array of all valid card brands
export const ALL_CARD_BRANDS = Object.freeze(
  Object.values(CARD_BRANDS)
);

// Check if a card brand is valid
export function isValidCardBrand(brand) {
  return ALL_CARD_BRANDS.includes(brand);
}
