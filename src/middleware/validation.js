import { body } from 'express-validator';

/* eslint-disable security/detect-object-injection, security/detect-unsafe-regex */

// ✅ Safer regex patterns (bounded quantifiers & no catastrophic backtracking)
export const patterns = {
  name: /^[a-zA-Z\s\-.]{2,50}$/, // bounded length
  email: /^[a-zA-Z0-9._%+-]{1,64}@[a-zA-Z0-9.-]{1,253}\.[a-zA-Z]{2,}$/u,
  phone: /^[+]?[1-9][\d]{0,15}$/u,

  alphanumeric: /^[a-zA-Z0-9]+$/u,
  safeText: /^[a-zA-Z0-9\s.,!?-]{1,200}$/u,
  noScript: /^(?!.*<(?:script|style|iframe|object|embed|link|meta))[^<>]*$/u,
  noHtml: /^[^<>]*$/u,

  creditCard: /^[0-9]{13,19}$/u,
  amount: /^\d+(\.\d{1,2})?$/u,
  username: /^[a-zA-Z0-9_]{3,20}$/u,
  accountNumber: /^[0-9]{10,12}$/u,
  bankCode: /^[0-9]{6}$/u,
  branchCode: /^[0-9]{6}$/u,
  idNumber: /^[0-9]{13}$/u,

  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu,
  url: /^(https?:\/\/)([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,6}([/?#]\S*)?$/u,
  mongoId: /^[0-9a-fA-F]{24}$/u,

  transactionId: /^[a-zA-Z0-9_-]{10,50}$/u,
  currency: /^[A-Z]{3}$/u,
  paymentMethod: /^(card|paypal|bank_transfer|swift|eft)$/u,
  cardBrand: /^(visa|mastercard|amex|discover)$/u,
  swiftCode: /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/u,
  cvv: /^[0-9]{3,4}$/u,
  expiryDate: /^(0[1-9]|1[0-2])\/([0-9]{2})$/u
};

/* eslint-enable security/detect-unsafe-regex */

// ✅ Immutable validation rules (safe static mapping)
export const validationRules = Object.freeze({
  '/api/users/register': {
    fullName: { pattern: patterns.name, required: true },
    email: { pattern: patterns.email, required: true },
    username: { pattern: patterns.username, required: true },
    idNumber: { pattern: patterns.idNumber, required: true },
    accountNumber: { pattern: patterns.accountNumber, required: true },
    bankCode: { pattern: patterns.bankCode, required: true },
    branchCode: { pattern: patterns.branchCode, required: true },
    password: { minLength: 8, maxLength: 128, required: true, noScript: true }
  },
  '/api/users/login': {
    username: { pattern: patterns.username, required: true },
    accountNumber: { pattern: patterns.accountNumber, required: true },
    password: { minLength: 1, maxLength: 128, required: true, noScript: true }
  },
  '/api/payments/process': {
    userId: { pattern: patterns.mongoId, required: true },
    amount: { pattern: patterns.amount, required: true },
    currency: { pattern: patterns.currency },
    description: { pattern: patterns.safeText },
    noScript: true
  },
  '/store': {
    data: { minLength: 1, maxLength: 10000, required: true, noScript: true },
    title: { pattern: patterns.safeText }
  },
  default: {
    text: { pattern: patterns.safeText },
    name: { pattern: patterns.name },
    email: { pattern: patterns.email },
    username: { pattern: patterns.username }
  }
});

// ✅ Field validation function
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
  if (rules.noScript && !patterns.noScript.test(stringValue))
    errors.push('Potentially dangerous content detected');
  if (rules.noHtml && !patterns.noHtml.test(stringValue)) errors.push('HTML tags not allowed');

  return errors;
}

// ✅ Security logging for validation attempts
function logValidationAttempt(req, hasErrors, errors = {}) {
  const clientIP = req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress;
  const timestamp = new Date().toISOString();
  const { method, url } = req;

  if (hasErrors) {
    console.warn(`🚨 [${timestamp}] VALIDATION FAILED - ${method} ${url} - IP: ${clientIP}`);
    console.warn('❌ Errors:', JSON.stringify(errors, null, 2));
  } else {
    console.log(`✅ [${timestamp}] VALIDATION PASSED - ${method} ${url} - IP: ${clientIP}`);
  }
}

/* eslint-disable security/detect-object-injection */
// ✅ Middleware: regex validator
export const regexValidator = (req, res, next) => {
  if (!['POST', 'PUT', 'PATCH'].includes(req.method)) return next();
  if (!req.body || typeof req.body !== 'object') return next();

  const rules = validationRules[req.path] || validationRules.default;
  const errors = {};
  let hasErrors = false;

  for (const field of Object.keys(rules)) {
    if (Object.hasOwn(req.body, field)) {
      const fieldErrors = validateField(req.body[field], rules[field]);
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

// ✅ Middleware: input sanitization
export function sanitizeInput(req, res, next) {
  try {
    const allowedKeys = [
      'name', 'email', 'username', 'password', 'role', 'id', 'accountNumber', 'bankCode', 'branchCode', 'amount', 'currency', 'userId', 'title', 'data'
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

    console.log(`🧹 Input sanitized for ${req.method} ${req.path}`);
    next();
  } catch (error) {
    console.error('❌ Sanitization error:', error);
    next();
  }
}

// ✅ Legacy validation setup
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