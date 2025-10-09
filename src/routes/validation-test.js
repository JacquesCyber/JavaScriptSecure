import express from 'express';
import { validationPatterns } from '../middleware/validation.js';

const router = express.Router();

// Test different validation scenarios
router.post('/test-validation', (req, res) => {
  res.json({
    success: true,
    message: 'Validation passed! All input sanitized and validated.',
    received: req.body,
    timestamp: new Date().toISOString(),
    security: 'Input processed through regex whitelist and sanitization'
  });
});

// Test script injection attempts
router.post('/test-security', (req, res) => {
  res.json({
    success: true,
    message: 'Security test passed - no dangerous content detected.',
    received: req.body,
    timestamp: new Date().toISOString(),
    security: 'Potential script injection attempts blocked'
  });
});

// Get available patterns for testing
router.get('/validation-patterns', (req, res) => {
  const patternInfo = Object.keys(validationPatterns).map(key => ({
    name: key,
    pattern: validationPatterns[key].toString(),
    example: getPatternExample(key),
    description: getPatternDescription(key)
  }));
  
  res.json({
    patterns: patternInfo,
    message: 'Available validation patterns for security testing',
    totalPatterns: patternInfo.length,
    timestamp: new Date().toISOString()
  });
});

// Test specific pattern validation
router.post('/test-pattern/:patternName', (req, res) => {
  const { patternName } = req.params;
  const { value } = req.body;
  
  if (!validationPatterns[patternName]) {
    return res.status(400).json({
      error: true,
      message: 'Invalid pattern name',
      availablePatterns: Object.keys(validationPatterns)
    });
  }
  
  const pattern = validationPatterns[patternName];
  const isValid = pattern.test(value);
  
  res.json({
    patternName,
    value,
    isValid,
    pattern: pattern.toString(),
    example: getPatternExample(patternName),
    description: getPatternDescription(patternName),
    timestamp: new Date().toISOString()
  });
});

// Security test endpoint for various attack vectors
router.post('/security-test', (req, res) => {
  const attackVectors = [
    'XSS attempts',
    'Script injection',
    'NoSQL injection',
    'HTML injection',
    'JavaScript execution'
  ];
  
  res.json({
    success: true,
    message: 'Security test endpoint - validates against common attack vectors',
    testedVectors: attackVectors,
    received: req.body,
    timestamp: new Date().toISOString(),
    note: 'This endpoint tests the regex whitelist defense system'
  });
});

// Helper function to get pattern examples
function getPatternExample(patternName) {
  const examples = {
    name: 'John Doe',
    email: 'user@example.com',
    phone: '+1234567890',
    alphanumeric: 'abc123',
    safeText: 'This is safe text, with punctuation!',
    noScript: 'Safe content without scripts',
    noHtml: 'Plain text without HTML',
    creditCard: '4532123456789012',
    amount: '99.99',
    username: 'user_123',
    accountNumber: '1234567890',
    bankCode: '123456',
    branchCode: '654321',
    idNumber: '1234567890123',
    uuid: '550e8400-e29b-41d4-a716-446655440000',
    url: 'https://example.com',
    mongoId: '507f1f77bcf86cd799439011',
    transactionId: 'TXN-12345-ABCD',
    currency: 'USD',
    paymentMethod: 'card',
    cardBrand: 'visa',
    swiftCode: 'DEUTDEFF',
    cvv: '123',
    expiryDate: '12/25'
  };
  return examples[patternName] || 'No example available';
}

// Helper function to get pattern descriptions
function getPatternDescription(patternName) {
  const descriptions = {
    name: 'Human names with letters, spaces, hyphens, and periods only',
    email: 'Standard email format validation',
    phone: 'International phone numbers with optional country code',
    alphanumeric: 'Alphanumeric characters only (no special characters)',
    safeText: 'Safe text with basic punctuation, no HTML or scripts',
    noScript: 'Content that blocks script injection attempts',
    noHtml: 'Content that blocks HTML tag injection',
    creditCard: 'Credit card numbers (13-19 digits)',
    amount: 'Monetary amounts with optional decimal places',
    username: 'Usernames with letters, numbers, and underscores',
    accountNumber: 'Bank account numbers (10-12 digits)',
    bankCode: 'Bank codes (exactly 6 digits)',
    branchCode: 'Branch codes (exactly 6 digits)',
    idNumber: 'ID numbers (exactly 13 digits)',
    uuid: 'Universally unique identifiers (UUID format)',
    url: 'HTTP/HTTPS URLs with domain validation',
    mongoId: 'MongoDB ObjectId format (24 hex characters)',
    transactionId: 'Transaction identifiers (alphanumeric with dashes/underscores)',
    currency: 'ISO currency codes (3 uppercase letters)',
    paymentMethod: 'Valid payment method types',
    cardBrand: 'Valid credit card brands',
    swiftCode: 'SWIFT/BIC codes for international transfers',
    cvv: 'Card verification values (3-4 digits)',
    expiryDate: 'Card expiry dates in MM/YY format'
  };
  return descriptions[patternName] || 'No description available';
}

export default router;
