import { body } from 'express-validator';
import { sanitizeInput as sanitize } from './sanitization.js';

// Regex patterns for different input types - Security-focused whitelist approach
export const patterns = {
  // Basic patterns - Strict character sets only
  name: /^[a-zA-Z\s\-.]{2,50}$/,
  email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  phone: /^[+]?[1-9][\d]{0,15}$/,
  
  // Security-focused patterns - Anti-injection measures
  alphanumeric: /^[a-zA-Z0-9]+$/,
  safeText: /^[a-zA-Z0-9\s.,!?-]{1,200}$/,
  noHtml: /^[^<>]*$/,
  
  // Business-specific patterns
  creditCard: /^[0-9]{13,19}$/,
  amount: /^\d+(\.\d{2})?$/,
  username: /^[a-zA-Z0-9_]{3,20}$/,
  accountNumber: /^[0-9]{10,12}$/,
  bankCode: /^[0-9]{6}$/,
  branchCode: /^[0-9]{6}$/,
  idNumber: /^[0-9]{13}$/,
  
  // System patterns
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  url: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)$/,
  mongoId: /^[0-9a-fA-F]{24}$/,
  
  // Payment-specific patterns
  transactionId: /^[a-zA-Z0-9_-]{10,50}$/,
  currency: /^[A-Z]{3}$/,
  paymentMethod: /^(card|paypal|bank_transfer|swift|eft)$/,
  cardBrand: /^(visa|mastercard|amex|discover)$/,
  swiftCode: /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/,
  cvv: /^[0-9]{3,4}$/,
  expiryDate: /^(0[1-9]|1[0-2])\/([0-9]{2})$/
};

// Field validation rules for different endpoints
export const validationRules = {
  // User registration
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
  
  // User login
  '/api/users/login': {
    username: { pattern: patterns.username, required: true },
    accountNumber: { pattern: patterns.accountNumber, required: true },
    password: { minLength: 1, maxLength: 128, required: true, noScript: true }
  },
  
  // Payment processing
  '/api/payments/process': {
    userId: { pattern: patterns.mongoId, required: true },
    amount: { pattern: patterns.amount, required: true },
    currency: { pattern: patterns.currency, required: false },
    description: { pattern: patterns.safeText, required: false },
    noScript: true // Apply anti-script validation to all fields
  },
  
  // Secret data
  '/store': {
    data: { minLength: 1, maxLength: 10000, required: true, noScript: true },
    title: { pattern: patterns.safeText, required: false }
  },
  
  // General text inputs
  default: {
    text: { pattern: patterns.safeText },
    name: { pattern: patterns.name },
    email: { pattern: patterns.email },
    username: { pattern: patterns.username }
  }
};

// Validate individual field with comprehensive security checks
function validateField(value, rules) {
  const errors = [];
  
  // Convert to string for validation
  const stringValue = value ? value.toString().trim() : '';
  
  // Required check
  if (rules.required && stringValue === '') {
    errors.push('Field is required');
    return errors;
  }
  
  // Skip validation if field is empty and not required
  if (stringValue === '' && !rules.required) {
    return errors;
  }
  
  // Length checks
  if (rules.minLength && stringValue.length < rules.minLength) {
    errors.push(`Minimum length is ${rules.minLength} characters`);
  }
  
  if (rules.maxLength && stringValue.length > rules.maxLength) {
    errors.push(`Maximum length is ${rules.maxLength} characters`);
  }
  
  // Pattern check
  if (rules.pattern && !rules.pattern.test(stringValue)) {
    errors.push('Invalid format');
  }
  
  // Anti-script check using efficient substring search instead of complex regex
  // This prevents ReDoS attacks while maintaining security
  if (rules.noScript) {
    const lowerValue = stringValue.toLowerCase();
    const dangerousPatterns = [
      '<script',
      'javascript:',
      'on=',        // Catches onclick=, onload=, etc.
      'onerror=',
      'onload=',
      'data:text/html',
      'vbscript:',
      'eval(',
      'expression('
    ];
    
    for (const pattern of dangerousPatterns) {
      if (lowerValue.includes(pattern)) {
        errors.push('Potentially dangerous content detected');
        break; // Stop checking once we find one
      }
    }
  }
  
  // HTML injection check
  if (rules.noHtml && !patterns.noHtml.test(stringValue)) {
    errors.push('HTML tags not allowed');
  }
  
  return errors;
}

// Security logging for validation attempts
function logValidationAttempt(req, hasErrors, errors = {}) {
  const clientIP = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
  const timestamp = new Date().toISOString();
  const method = req.method;
  const url = req.url;
  
  if (hasErrors) {
    console.log(`🚨 [${timestamp}] VALIDATION FAILED - ${method} ${url} - IP: ${clientIP}`);
    console.log('❌ Validation errors:', JSON.stringify(errors, null, 2));
  } else {
    console.log(`✅ [${timestamp}] VALIDATION PASSED - ${method} ${url} - IP: ${clientIP}`);
  }
}

// Main regex validation middleware - LAYER 1: First line of defense
export const regexValidator = (req, res, next) => {
  // Only validate POST, PUT, PATCH requests with body data
  if (!['POST', 'PUT', 'PATCH'].includes(req.method)) {
    return next();
  }
  
  if (!req.body || typeof req.body !== 'object') {
    return next();
  }
  
  // Get validation rules for this endpoint
  const rules = validationRules[req.path] || validationRules.default;
  const errors = {};
  let hasErrors = false;
  
  // Validate each field in request body
  Object.keys(req.body).forEach(field => {
    const fieldRules = rules[field];
    if (fieldRules) {
      const fieldErrors = validateField(req.body[field], fieldRules);
      if (fieldErrors.length > 0) {
        errors[field] = fieldErrors;
        hasErrors = true;
        // Debug logging for ID number issues
        if (field === 'idNumber') {
          console.log(`🔍 ID Number validation failed:`, {
            value: req.body[field],
            type: typeof req.body[field],
            length: req.body[field]?.length,
            errors: fieldErrors
          });
        }
      }
    }
  });
  
  // Log validation attempts for security monitoring
  logValidationAttempt(req, hasErrors, errors);
  
  if (hasErrors) {
    return res.status(400).json({
      error: true,
      message: 'Input validation failed',
      details: errors,
      timestamp: new Date().toISOString(),
      security: 'Request blocked by regex whitelist validation (Layer 1)'
    });
  }
  
  next();
};

// LAYER 2: Sanitization is handled by importing from sanitation.js
// This ensures single source of truth and no duplicate code
export const sanitizeInputMiddleware = sanitize;

// Legacy validation setup for backward compatibility
export function setupValidation(app) {
  // Input validation helpers
  app.locals.validators = {
    // Secret data validation
    secretData: [
      body('data')
        .trim()
        .isLength({ min: 1, max: 10000 })
        .withMessage('Data must be between 1 and 10,000 characters')
        .escape(),
      body('title')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('Title must be less than 100 characters')
        .escape()
    ],

    // MongoDB ObjectId validation
    mongoId: (paramName = 'id') => (req, res, next) => {
      // Use safe parameter access to prevent object injection
      let id;
      switch (paramName) {
        case 'id':
          id = req.params.id;
          break;
        case 'secretId':
          id = req.params.secretId;
          break;
        case 'userId':
          id = req.params.userId;
          break;
        default:
          return res.status(500).json({ error: 'Invalid parameter configuration' });
      }
      
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

// Export patterns for testing and external use
export { patterns as validationPatterns };