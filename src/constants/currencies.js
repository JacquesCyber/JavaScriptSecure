/*
 * Currency Constants
 * -------------------------------------------------------------
 * This file defines all supported currencies in 3 char (ISO 4217) format.
 * All our currencies are standardized for both domestic and international payments.
 *
 * Usage:
 *   import { CURRENCIES, INTERNATIONAL_CURRENCIES } from '../constants/currencies.js';
 *
 */

// Domestic payment currencies (commonly used in South Africa)
export const CURRENCIES = Object.freeze({
  ZAR: 'ZAR',  // South African Rand
  USD: 'USD',  // US Dollar
  EUR: 'EUR',  // Euro
  GBP: 'GBP',  // British Pound
  JPY: 'JPY',  // Japanese Yen
  AUD: 'AUD',  // Australian Dollar
  CAD: 'CAD',  // Canadian Dollar
  CHF: 'CHF',  // Swiss Franc
  CNY: 'CNY',  // Chinese Yuan
  INR: 'INR',  // Indian Rupee
  BRL: 'BRL',  // Brazilian Real
  MXN: 'MXN'   // Mexican Peso
});

// International payment currencies (expanded list for SWIFT transfers)
export const INTERNATIONAL_CURRENCIES = Object.freeze([
  'USD', 'EUR', 'GBP', 'ZAR', 'CHF', 'JPY', 'CAD', 'AUD', 
  'CNY', 'INR', 'SGD', 'HKD', 'NZD', 'SEK', 'NOK', 'DKK',
  'MXN', 'BRL', 'RUB', 'TRY', 'KRW', 'THB', 'MYR', 'IDR'
]);

// Array of all valid currencies (domestic)
export const ALL_CURRENCIES = Object.freeze(
  Object.values(CURRENCIES)
);

// Check if a currency is valid for domestic payments
export function isValidCurrency(currency) {
  return ALL_CURRENCIES.includes(currency?.toUpperCase());
}

// Check if a currency is valid for international payments
export function isValidInternationalCurrency(currency) {
  return INTERNATIONAL_CURRENCIES.includes(currency?.toUpperCase());
}

// Default currency
export const DEFAULT_CURRENCY = CURRENCIES.ZAR;

// Currency symbols (for display purposes)
export const CURRENCY_SYMBOLS = Object.freeze({
  ZAR: 'R',
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  AUD: 'A$',
  CAD: 'C$',
  CHF: 'Fr',
  CNY: '¥',
  INR: '₹',
  BRL: 'R$',
  MXN: '$',
  SGD: 'S$',
  HKD: 'HK$',
  NZD: 'NZ$',
  SEK: 'kr',
  NOK: 'kr',
  DKK: 'kr',
  RUB: '₽',
  TRY: '₺',
  KRW: '₩',
  THB: '฿',
  MYR: 'RM',
  IDR: 'Rp'
});

