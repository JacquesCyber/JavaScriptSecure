/*
 * International Payment Validators
 * -------------------------------------------------------------
 * This file contains validation rules for international payments
 * including SWIFT transfers, beneficiary details, and compliance checks.
 *
 * Security & Best Practices:
 *   - Validates all international payment fields
 *   - Prevents injection attacks through strict whitelisting
 *   - Ensures compliance with international payment standards
 *   - Validates SWIFT codes, IBANs, and country codes
 *
 * Usage:
 *   import { validateInternationalPayment } from '../validators/internationalPayment.js';
 *
 */

import { VALIDATION_PATTERNS } from './patterns.js';
import { INTERNATIONAL_CURRENCIES } from '../constants/currencies.js';
import { PAYMENT_PURPOSE_CODES } from '../constants/purposeCodes.js';


export function validateSwiftCode(swiftCode) {
  if (!swiftCode || typeof swiftCode !== 'string') {
    return { valid: false, error: 'SWIFT code is required' };
  }
  
  // Clean and standardize input
  const cleaned = swiftCode.trim().toUpperCase();
  
  if (!VALIDATION_PATTERNS.bic.test(cleaned)) {
    return { valid: false, error: 'Invalid SWIFT/BIC code format (must be 8 or 11 characters)' };
  }
  
  // Additional validation: check structure
  const bankCode = cleaned.substring(0, 4);
  const countryCode = cleaned.substring(4, 6);
  const locationCode = cleaned.substring(6, 8);
  
  if (!/^[A-Z]{4}$/.test(bankCode)) {
    return { valid: false, error: 'Invalid bank code in SWIFT (first 4 chars must be letters)' };
  }
  
  if (!/^[A-Z]{2}$/.test(countryCode)) {
    return { valid: false, error: 'Invalid country code in SWIFT (chars 5-6 must be letters)' };
  }
  
  if (!/^[A-Z0-9]{2}$/.test(locationCode)) {
    return { valid: false, error: 'Invalid location code in SWIFT (chars 7-8 must be alphanumeric)' };
  }
  
  return { valid: true, swiftCode: cleaned };
}

// Validate IBAN (International Bank Account Number)
export function validateIBAN(iban) {
  if (!iban || typeof iban !== 'string') {
    return { valid: false, error: 'IBAN is required' };
  }
  
  const cleaned = iban.replace(/\s/g, '').toUpperCase();
  
  if (!VALIDATION_PATTERNS.iban.test(cleaned)) {
    return { valid: false, error: 'Invalid IBAN format' };
  }
  
  // IBAN length validation by country (selected countries)
  const ibanLengths = {
    'AD': 24, 'AE': 23, 'AL': 28, 'AT': 20, 'AZ': 28, 'BA': 20, 'BE': 16,
    'BG': 22, 'BH': 22, 'BR': 29, 'CH': 21, 'CR': 22, 'CY': 28, 'CZ': 24,
    'DE': 22, 'DK': 18, 'DO': 28, 'EE': 20, 'ES': 24, 'FI': 18, 'FO': 18,
    'FR': 27, 'GB': 22, 'GE': 22, 'GI': 23, 'GL': 18, 'GR': 27, 'GT': 28,
    'HR': 21, 'HU': 28, 'IE': 22, 'IL': 23, 'IS': 26, 'IT': 27, 'JO': 30,
    'KW': 30, 'KZ': 20, 'LB': 28, 'LI': 21, 'LT': 20, 'LU': 20, 'LV': 21,
    'MC': 27, 'MD': 24, 'ME': 22, 'MK': 19, 'MR': 27, 'MT': 31, 'MU': 30,
    'NL': 18, 'NO': 15, 'PK': 24, 'PL': 28, 'PS': 29, 'PT': 25, 'QA': 29,
    'RO': 24, 'RS': 22, 'SA': 24, 'SE': 24, 'SI': 19, 'SK': 24, 'SM': 27,
    'TN': 24, 'TR': 26, 'UA': 29, 'VA': 22, 'VG': 24, 'XK': 20
  };
  
  const countryCode = cleaned.substring(0, 2);
  const expectedLength = ibanLengths[countryCode];
  
  if (expectedLength && cleaned.length !== expectedLength) {
    return { 
      valid: false, 
      error: `Invalid IBAN length for ${countryCode} (expected ${expectedLength}, got ${cleaned.length})` 
    };
  }
  
  // IBAN checksum validation (MOD-97 algorithm)
  const rearranged = cleaned.substring(4) + cleaned.substring(0, 4);
  const numeric = rearranged.replace(/[A-Z]/g, (char) => char.charCodeAt(0) - 55);
  
  // Calculate MOD 97 (for large numbers)
  let checksum = '';
  for (let i = 0; i < numeric.length; i++) {
    checksum += numeric[i];
    if (checksum.length >= 9) {
      checksum = (parseInt(checksum, 10) % 97).toString();
    }
  }
  
  if (parseInt(checksum, 10) % 97 !== 1) {
    return { valid: false, error: 'Invalid IBAN checksum' };
  }
  
  return { valid: true, iban: cleaned };
}

// Validate beneficiary name
export function validateBeneficiaryName(name) {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: 'Beneficiary name is required' };
  }
  
  const cleaned = name.trim();
  
  if (cleaned.length < 2 || cleaned.length > 100) {
    return { valid: false, error: 'Beneficiary name must be between 2 and 100 characters' };
  }
  
  if (!VALIDATION_PATTERNS.beneficiaryName.test(cleaned)) {
    return { valid: false, error: 'Beneficiary name contains invalid characters' };
  }
  
  return { valid: true, beneficiaryName: cleaned };
}

// Validate payment reference
export function validatePaymentReference(reference) {
  if (!reference || typeof reference !== 'string') {
    return { valid: false, error: 'Payment reference is required' };
  }
  
  const cleaned = reference.trim();
  
  if (cleaned.length === 0 || cleaned.length > 35) {
    return { valid: false, error: 'Payment reference must be between 1 and 35 characters' };
  }
  
  if (!VALIDATION_PATTERNS.paymentReference.test(cleaned)) {
    return { valid: false, error: 'Payment reference contains invalid characters (use letters, numbers, spaces, hyphens, and slashes only)' };
  }
  
  return { valid: true, reference: cleaned };
}

// Validate country code (ISO 3166-1 alpha-2)
export function validateCountryCode(code) {
  if (!code || typeof code !== 'string') {
    return { valid: false, error: 'Country code is required' };
  }
  
  const cleaned = code.trim().toUpperCase();
  
  if (!VALIDATION_PATTERNS.countryCode.test(cleaned)) {
    return { valid: false, error: 'Invalid country code format (must be 2 letters)' };
  }
  
  // List of valid ISO 3166-1 alpha-2 codes (selected countries)
  const validCountries = [
    'AD', 'AE', 'AF', 'AG', 'AI', 'AL', 'AM', 'AO', 'AQ', 'AR', 'AS', 'AT',
    'AU', 'AW', 'AX', 'AZ', 'BA', 'BB', 'BD', 'BE', 'BF', 'BG', 'BH', 'BI',
    'BJ', 'BL', 'BM', 'BN', 'BO', 'BQ', 'BR', 'BS', 'BT', 'BV', 'BW', 'BY',
    'BZ', 'CA', 'CC', 'CD', 'CF', 'CG', 'CH', 'CI', 'CK', 'CL', 'CM', 'CN',
    'CO', 'CR', 'CU', 'CV', 'CW', 'CX', 'CY', 'CZ', 'DE', 'DJ', 'DK', 'DM',
    'DO', 'DZ', 'EC', 'EE', 'EG', 'EH', 'ER', 'ES', 'ET', 'FI', 'FJ', 'FK',
    'FM', 'FO', 'FR', 'GA', 'GB', 'GD', 'GE', 'GF', 'GG', 'GH', 'GI', 'GL',
    'GM', 'GN', 'GP', 'GQ', 'GR', 'GS', 'GT', 'GU', 'GW', 'GY', 'HK', 'HM',
    'HN', 'HR', 'HT', 'HU', 'ID', 'IE', 'IL', 'IM', 'IN', 'IO', 'IQ', 'IR',
    'IS', 'IT', 'JE', 'JM', 'JO', 'JP', 'KE', 'KG', 'KH', 'KI', 'KM', 'KN',
    'KP', 'KR', 'KW', 'KY', 'KZ', 'LA', 'LB', 'LC', 'LI', 'LK', 'LR', 'LS',
    'LT', 'LU', 'LV', 'LY', 'MA', 'MC', 'MD', 'ME', 'MF', 'MG', 'MH', 'MK',
    'ML', 'MM', 'MN', 'MO', 'MP', 'MQ', 'MR', 'MS', 'MT', 'MU', 'MV', 'MW',
    'MX', 'MY', 'MZ', 'NA', 'NC', 'NE', 'NF', 'NG', 'NI', 'NL', 'NO', 'NP',
    'NR', 'NU', 'NZ', 'OM', 'PA', 'PE', 'PF', 'PG', 'PH', 'PK', 'PL', 'PM',
    'PN', 'PR', 'PS', 'PT', 'PW', 'PY', 'QA', 'RE', 'RO', 'RS', 'RU', 'RW',
    'SA', 'SB', 'SC', 'SD', 'SE', 'SG', 'SH', 'SI', 'SJ', 'SK', 'SL', 'SM',
    'SN', 'SO', 'SR', 'SS', 'ST', 'SV', 'SX', 'SY', 'SZ', 'TC', 'TD', 'TF',
    'TG', 'TH', 'TJ', 'TK', 'TL', 'TM', 'TN', 'TO', 'TR', 'TT', 'TV', 'TW',
    'TZ', 'UA', 'UG', 'UM', 'US', 'UY', 'UZ', 'VA', 'VC', 'VE', 'VG', 'VI',
    'VN', 'VU', 'WF', 'WS', 'YE', 'YT', 'ZA', 'ZM', 'ZW'
  ];
  
  if (!validCountries.includes(cleaned)) {
    return { valid: false, error: 'Invalid country code' };
  }
  
  return { valid: true, countryCode: cleaned };
}

// Validate purpose code
export function validatePurposeCode(code) {
  if (!code || typeof code !== 'string') {
    return { valid: false, error: 'Purpose code is required' };
  }
  
  const cleaned = code.trim().toUpperCase();
  
  if (!PAYMENT_PURPOSE_CODES[cleaned]) {
    return { 
      valid: false, 
      error: `Invalid purpose code. Valid codes: ${Object.keys(PAYMENT_PURPOSE_CODES).join(', ')}` 
    };
  }
  
  return { valid: true, purposeCode: cleaned, description: PAYMENT_PURPOSE_CODES[cleaned] };
}

// Validate payment amount  
export function validatePaymentAmount(amount, currency = 'USD') {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return { valid: false, error: 'Amount must be a valid number' };
  }
  
  if (amount <= 0) {
    return { valid: false, error: 'Amount must be greater than 0' };
  }
  
  if (amount > 10000000) {
    return { valid: false, error: 'Amount exceeds maximum limit of 10,000,000' };
  }
  
  // Check decimal places (max 2 for most currencies, 0 for JPY and KRW)
  const noDecimalCurrencies = ['JPY', 'KRW'];
  const decimalPlaces = (amount.toString().split('.')[1] || '').length;
  
  if (noDecimalCurrencies.includes(currency)) {
    if (decimalPlaces > 0) {
      return { valid: false, error: `${currency} does not support decimal places` };
    }
  } else if (decimalPlaces > 2) {
    return { valid: false, error: 'Amount can have maximum 2 decimal places' };
  }
  
  return { valid: true, amount: Math.round(amount * 100) / 100 };
}

// Validate currency code (ISO 4217)
export function validateCurrency(currency) {
  if (!currency || typeof currency !== 'string') {
    return { valid: false, error: 'Currency code is required' };
  }
  
  const cleaned = currency.trim().toUpperCase();
  
  if (!VALIDATION_PATTERNS.currency.test(cleaned)) {
    return { valid: false, error: 'Invalid currency format (must be 3 letters)' };
  }
  
  if (!INTERNATIONAL_CURRENCIES.includes(cleaned)) {
    return { 
      valid: false, 
      error: `Unsupported currency. Supported currencies: ${INTERNATIONAL_CURRENCIES.join(', ')}` 
    };
  }
  
  return { valid: true, currency: cleaned };
}

// Main function to validate international payment data
export function validateInternationalPayment(paymentData) {
  const errors = [];
  
  // Required fields validation
  const requiredFields = [
    'beneficiaryName',
    'beneficiaryAccount',
    'swiftCode',
    'bankName',
    'bankCountry',
    'amount',
    'currency',
    'purpose'
  ];
  
  for (const field of requiredFields) {
    if (!paymentData[field]) {
      errors.push({ field, message: `${field} is required` });
    }
  }
  
  if (errors.length > 0) {
    return { valid: false, errors };
  }
  
  // Validate each field
  const validations = {
    swiftCode: validateSwiftCode(paymentData.swiftCode),
    beneficiaryName: validateBeneficiaryName(paymentData.beneficiaryName),
    bankCountry: validateCountryCode(paymentData.bankCountry),
    amount: validatePaymentAmount(paymentData.amount, paymentData.currency),
    currency: validateCurrency(paymentData.currency),
    purpose: validatePurposeCode(paymentData.purpose)
  };
  
  // Validate IBAN if provided
  if (paymentData.beneficiaryAccount) {
    // Check if it looks like an IBAN (starts with 2 letters)
    if (/^[A-Z]{2}/.test(paymentData.beneficiaryAccount.toUpperCase())) {
      validations.beneficiaryAccount = validateIBAN(paymentData.beneficiaryAccount);
    } else {
      // Generic account number validation
      if (paymentData.beneficiaryAccount.length < 8 || paymentData.beneficiaryAccount.length > 34) {
        validations.beneficiaryAccount = { 
          valid: false, 
          error: 'Beneficiary account must be between 8 and 34 characters' 
        };
      } else {
        validations.beneficiaryAccount = { valid: true };
      }
    }
  }
  
  // Validate reference if provided
  if (paymentData.reference) {
    validations.reference = validatePaymentReference(paymentData.reference);
  }
  
  // Collect errors
  for (const [field, result] of Object.entries(validations)) {
    if (!result.valid) {
      errors.push({ field, message: result.error });
    }
  }
  
  if (errors.length > 0) {
    return { valid: false, errors };
  }
  
  // Return sanitized data
  return {
    valid: true,
    data: {
      beneficiaryName: validations.beneficiaryName.beneficiaryName,
      beneficiaryAccount: validations.beneficiaryAccount.iban || paymentData.beneficiaryAccount,
      swiftCode: validations.swiftCode.swiftCode,
      bankName: paymentData.bankName.trim(),
      bankCountry: validations.bankCountry.countryCode,
      amount: validations.amount.amount,
      currency: validations.currency.currency,
      purpose: validations.purpose.purposeCode,
      purposeDescription: validations.purpose.description,
      reference: validations.reference?.reference || paymentData.reference,
      intermediaryBankSwift: paymentData.intermediaryBankSwift,
      intermediaryBankName: paymentData.intermediaryBankName,
      bankAddress: paymentData.bankAddress?.trim(),
      bankCity: paymentData.bankCity?.trim()
    }
  };
}

// Export all validators
export default {
  validateSwiftCode,
  validateIBAN,
  validateBeneficiaryName,
  validatePaymentReference,
  validateCountryCode,
  validatePurposeCode,
  validatePaymentAmount,
  validateCurrency,
  validateInternationalPayment,
  INTERNATIONAL_CURRENCIES,
  PAYMENT_PURPOSE_CODES
};

// -----------------------------------End of File-------------------------------------------