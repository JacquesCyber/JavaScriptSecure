/*
 * Input Validation Middleware
 * -------------------------------------------------------------
 * This module provides input validation logic for Express routes.
 * It is designed to prevent common web attacks, including:
 *   - Injection attacks (NoSQL, command, object injection)
 *   - Cross-Site Scripting (XSS) via strict input patterns
 *   - Unsafe regex denial-of-service (ReDoS)
 *
 *  Security & Best Practices
 *   - All user input is validated and sanitized before processing
 *   - Only whitelisted fields and patterns are accepted
 *   - Regexes are reviewed for safety and performance
 *
 * Usage:
 *   app.post('/route', validationMiddleware, handler);
 *
 *  REFERENCES:
 *    - https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html
 *    - https://owasp.org/www-community/attacks/Regular_expression_Denial_of_Service_-_ReDoS
 *    - https://express-validator.github.io/docs/
 */
import { body } from 'express-validator';
import { VALIDATION_PATTERNS } from '../validators/patterns.js';

/* eslint-disable security/detect-object-injection */

// Re-export patterns for backward compatibility
export const patterns = VALIDATION_PATTERNS;

/* eslint-enable */

// Immutable validation rules (safe static mapping)
export const validationRules = Object.freeze({
  '/api/users/register': {
    fullName: { pattern: VALIDATION_PATTERNS.name, required: true },
    email: { pattern: VALIDATION_PATTERNS.email, required: true },
    username: { pattern: VALIDATION_PATTERNS.username, required: true },
    idNumber: { pattern: VALIDATION_PATTERNS.idNumber, required: true },
    accountNumber: { pattern: VALIDATION_PATTERNS.accountNumber, required: true },
    bankCode: { pattern: VALIDATION_PATTERNS.bankCode, required: true },
    branchCode: { pattern: VALIDATION_PATTERNS.branchCode, required: true },
    password: { minLength: 8, maxLength: 128, required: true, noScript: true }
  },
  '/api/users/login': {
    username: { pattern: VALIDATION_PATTERNS.username, required: true },
    accountNumber: { pattern: VALIDATION_PATTERNS.accountNumber, required: true },
    password: { minLength: 1, maxLength: 128, required: true, noScript: true }
  },
  '/api/payments/process': {
    userId: { pattern: VALIDATION_PATTERNS.mongoId, required: true },
    amount: { pattern: VALIDATION_PATTERNS.amount, required: true },
    currency: { pattern: VALIDATION_PATTERNS.currency },
    description: { pattern: VALIDATION_PATTERNS.safeText },
    noScript: true
  },
  '/store': {
    data: { minLength: 1, maxLength: 10000, required: true, noScript: true },
    title: { pattern: VALIDATION_PATTERNS.safeText }
  },
  default: {
    text: { pattern: VALIDATION_PATTERNS.safeText },
    name: { pattern: VALIDATION_PATTERNS.name },
    email: { pattern: VALIDATION_PATTERNS.email },
    username: { pattern: VALIDATION_PATTERNS.username }
  }
});

// Field validation function
function validateField(value, rules) {
  const errors = [];
  const stringValue = typeof value === 'string' ? value.trim() : String(value || '');

  if (rules.required && stringValue === '') errors.push('Field is required');
  if (!rules.required && stringValue === '') return errors;

  if (rules.minLength && stringValue.length < rules.minLength)
    errors.push(`Minimum length is ${rules.minLength} characters`);
  if (rules.maxLength && stringValue.length > rules.maxLength)
    errors.push(`Maximum length is ${rules.maxLength} characters`);

  if (rules.pattern && !rules.pattern.test(stringValue)) errors.push('Invalid format');
  if (rules.noScript && !VALIDATION_PATTERNS.noScript.test(stringValue))
    errors.push('Potentially dangerous content detected');
  if (rules.noHtml && !VALIDATION_PATTERNS.noHtml.test(stringValue)) errors.push('HTML tags not allowed');

  return errors;
}

// Security logging for validation attempts
function logValidationAttempt(req, hasErrors, errors = {}) {
  const clientIP = req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress;
  const timestamp = new Date().toISOString();
  const { method, url } = req;

  if (hasErrors) {
    console.warn(`[${timestamp}] VALIDATION FAILED - ${method} ${url} - IP: ${clientIP}`);
    console.warn('Errors:', JSON.stringify(errors, null, 2));
  } else {
    console.log(` [${timestamp}] VALIDATION PASSED - ${method} ${url} - IP: ${clientIP}`);
  }
}

/* eslint-disable security/detect-object-injection */
//  Middleware: regex validator
export const regexValidator = (req, res, next) => {
  if (!['POST', 'PUT', 'PATCH'].includes(req.method)) return next();
  if (!req.body || typeof req.body !== 'object') return next();

  const rules = validationRules[req.path] || validationRules.default;
  const errors = {};
  let hasErrors = false;

  for (const field of Object.keys(rules)) {
    if (Object.hasOwn(req.body, field)) {
      const value = req.body[field];
      // Skip validation for optional fields that are empty/null/undefined
      if (!rules[field].required && (!value || value.trim?.() === '')) {
        continue;
      }
      const fieldErrors = validateField(value, rules[field]);
      if (fieldErrors.length > 0) {
        errors[field] = fieldErrors;
        hasErrors = true;
      }
    }
  }

  logValidationAttempt(req, hasErrors, errors);

  if (hasErrors) {
    return res.status(400).json({
      error: true,
      message: 'Input validation failed',
      details: errors,
      timestamp: new Date().toISOString(),
      security: 'Request blocked by regex whitelist validation'
    });
  }

  next();
};
// eslint-enable security/detect-object-injection

//  Middleware: input sanitization
export function sanitizeInput(req, res, next) {
  try {
    const allowedKeys = [
      // User fields
      'name', 'email', 'username', 'password', 'role', 'id', 'fullName', 'idNumber',
      // Account fields
      'accountNumber', 'bankCode', 'branchCode', 
      // Payment fields
      'amount', 'currency', 'userId', 'description', 'paymentMethod', 'provider',
      // Payment method nested fields
      'type', 'cardDetails', 'paypalEmail', 'bankDetails', 'swiftDetails',
      // Card details
      'lastFour', 'brand', 'expiryMonth', 'expiryYear',
      // Bank details
      'accountType',
      // SWIFT details  
      'beneficiaryName', 'beneficiaryAccount', 'swiftCode', 'bankName', 'bankCountry', 'purpose', 'reference',
      // Other
      'title', 'data'
    ];

    const sanitize = (obj) => {
      if (!obj || typeof obj !== 'object') return;

      for (const key of Object.keys(obj)) {
        if (!allowedKeys.includes(key) || key.startsWith('$') || key.includes('.')) {
          delete obj[key];
          continue;
        }

        const val = obj[key];
        if (typeof val === 'object') sanitize(val);
        else if (typeof val === 'string') {
          obj[key] = val
            .replace(/<\/?script.*?>/giu, '')
            .replace(/javascript:/giu, '')
            .replace(/\bon\w+\s*=/giu, '')
            .replace(/\bdata:/giu, '')
            .replace(/\bvbscript:/giu, '')
            .replace(/\beval\s*\(/giu, '')
            .replace(/\bexpression\s*\(/giu, '')
            .trim();
        }
      }
    };

    if (req.body && typeof req.body === 'object') sanitize(req.body);
    if (req.query && typeof req.query === 'object') sanitize(req.query);

    console.log(`Input sanitized for ${req.method} ${req.path}`);
    next();
  } catch (error) {
    console.error(' Sanitization error:', error);
    next();
  }
}

//  Legacy validation setup
export function setupValidation(app) {
  app.locals.validators = {
    secretData: [
      body('data').trim().isLength({ min: 1, max: 10000 }).escape(),
      body('title').optional().trim().isLength({ max: 100 }).escape()
    ],

    mongoId: (paramName = 'id') => (req, res, next) => {
      const validParams = new Set(['id', 'secretId', 'userId']);
      if (!validParams.has(paramName)) {
        return res.status(500).json({ error: 'Invalid parameter configuration' });
      }

      const id = req.params[paramName];
      if (!patterns.mongoId.test(id)) {
        return res.status(400).json({
          error: 'Invalid ID format',
          message: 'The provided ID is not a valid MongoDB ObjectId'
        });
      }
      next();
    }
  };
}

export { patterns as validationPatterns };

//----------------------------------------------End of File----------------------------------------------