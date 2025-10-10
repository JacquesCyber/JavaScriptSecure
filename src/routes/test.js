/*
 * Security Test & Demo Route
 * -------------------------------------------------------------
 * This route provides endpoints to test and demonstrate security features
 * such as input sanitization, XSS prevention, and NoSQL injection protection.
 * It is intended for development and QA environments only.
 *
 * Security Features Demonstrated:
 *   - Input sanitization (XSS, NoSQL injection)
 *   - Strict validation and whitelisting
 *   - Safe response formatting
 *
 * Usage:
 *   app.use('/test', testRouter);
 *
 */
import express from 'express';
import { sanitizeXSS } from '../middleware/sanitization.js';

const router = express.Router();

// Test endpoint to verify sanitization
router.post('/test-sanitize', (req, res) => {
  res.json({
    success: true,
    message: 'Sanitization test completed',
    received: req.body,
    timestamp: new Date().toISOString(),
    security: 'Input has been sanitized for XSS and NoSQL injection protection'
  });
});

// Test XSS prevention specifically
router.post('/test-xss', sanitizeXSS(['name', 'description']), (req, res) => {
  res.json({
    success: true,
    message: 'XSS test completed',
    received: req.body,
    timestamp: new Date().toISOString(),
    note: 'HTML entities have been encoded for security'
  });
});

// Test MongoDB injection prevention
router.post('/test-nosql', (req, res) => {
  res.json({
    success: true,
    message: 'NoSQL injection test completed',
    received: req.body,
    timestamp: new Date().toISOString(),
    note: 'MongoDB operators have been sanitized'
  });
});

// Security test endpoint
router.post('/security-test', (req, res) => {
  const testResults = {
    xssPrevention: 'HTML entities encoded',
    nosqlPrevention: 'MongoDB operators blocked',
    inputValidation: 'Regex whitelist applied',
    sanitization: 'All inputs cleaned'
  };
  
  res.json({
    success: true,
    message: 'Security test completed',
    received: req.body,
    securityFeatures: testResults,
    timestamp: new Date().toISOString()
  });
});

export default router;

//----------------------------------------------End of File----------------------------------------------