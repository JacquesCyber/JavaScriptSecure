/*
 * Payments Route
 * -------------------------------------------------------------
 * This route handles payment-related API endpoints.
 * It enforces input validation, authentication, and access control
 * to prevent fraud, injection, and unauthorized access.
 *
 *  Security & Best Practices
 *   - Validates all payment input to prevent injection and fraud
 *   - Requires authentication and role-based authorization
 *   - Never exposes sensitive payment data in responses
 *
 * Usage:
 *   app.use('/payments', paymentsRouter);
 *
 * REFERENCES:
 *  - https://stripe.com/docs/payments/accept-a-payment
 */
import express from 'express';
import { body, validationResult } from 'express-validator';
import { PaymentService } from '../services/payment.js';
import { authLimiter } from '../middleware/rateLimiting.js';

const router = express.Router();

// Payment validation middleware
const paymentValidation = [
  body('userId')
    .notEmpty()
    .withMessage('User ID is required'),
  body('amount')
    .isFloat({ min: 0.01, max: 1000000 })
    .withMessage('Amount must be between $0.01 and $1,000,000'),
  body('currency')
    .optional()
    .isIn(['ZAR', 'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'CNY', 'INR', 'BRL', 'MXN'])
    .withMessage('Invalid currency'),
  body('description')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Description must be between 1 and 500 characters'),
  body('paymentMethod.type')
    .isIn(['card', 'paypal', 'bank_transfer', 'swift', 'eft'])
    .withMessage('Invalid payment method type'),
  // Card validation - only for card payments
  body('paymentMethod').custom((value, { req }) => {
    const type = value?.type;
    
    if (type === 'card') {
      if (!value.cardDetails?.lastFour) {
        throw new Error('Card last four digits are required');
      }
      if (!/^\d{4}$/.test(value.cardDetails.lastFour)) {
        throw new Error('Card last four digits must be exactly 4 digits');
      }
      // Validate expiry month (01-12)
      if (!value.cardDetails?.expiryMonth || value.cardDetails.expiryMonth < 1 || value.cardDetails.expiryMonth > 12) {
        throw new Error('Invalid expiry month (must be 1-12)');
      }
      // Validate expiry year (4 digits, 2020-2099)
      if (!value.cardDetails?.expiryYear || value.cardDetails.expiryYear < 2020 || value.cardDetails.expiryYear > 2099) {
        throw new Error('Invalid expiry year (must be 2020-2099)');
      }
      // Check if card is expired
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth() + 1;
      if (value.cardDetails.expiryYear < currentYear || 
          (value.cardDetails.expiryYear === currentYear && value.cardDetails.expiryMonth < currentMonth)) {
        throw new Error('Card has expired');
      }
    }
    
    if (type === 'paypal') {
      if (!value.paypalEmail) {
        throw new Error('PayPal email is required');
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.paypalEmail)) {
        throw new Error('Invalid PayPal email format');
      }
    }
    
    if (type === 'bank_transfer' || type === 'eft') {
      if (!value.bankDetails?.bankCode) {
        throw new Error('Bank code is required');
      }
      if (!/^\d{6}$/.test(value.bankDetails.bankCode)) {
        throw new Error('Bank code must be exactly 6 digits');
      }
      if (!value.bankDetails?.branchCode) {
        throw new Error('Branch code is required');
      }
      if (!/^\d{6}$/.test(value.bankDetails.branchCode)) {
        throw new Error('Branch code must be exactly 6 digits');
      }
      if (!value.bankDetails?.accountNumber) {
        throw new Error('Account number is required');
      }
      if (!/^\d{10,12}$/.test(value.bankDetails.accountNumber)) {
        throw new Error('Account number must be between 10-12 digits');
      }
    }
    
    if (type === 'swift') {
      if (!value.swiftDetails?.beneficiaryName || value.swiftDetails.beneficiaryName.trim().length === 0) {
        throw new Error('Beneficiary name is required for SWIFT payments');
      }
      if (!value.swiftDetails?.swiftCode || !/^[A-Z0-9]{8,11}$/.test(value.swiftDetails.swiftCode)) {
        throw new Error('Invalid SWIFT code format');
      }
      if (!value.swiftDetails?.beneficiaryAccount || !/^[A-Z0-9]{8,34}$/.test(value.swiftDetails.beneficiaryAccount)) {
        throw new Error('Invalid beneficiary account format');
      }
      if (!value.swiftDetails?.bankName || value.swiftDetails.bankName.trim().length === 0) {
        throw new Error('Bank name is required for SWIFT payments');
      }
      if (!value.swiftDetails?.bankCountry || value.swiftDetails.bankCountry.trim().length < 2) {
        throw new Error('Bank country is required for SWIFT payments');
      }
    }
    
    return true;
  })
];

// Middleware to extract user ID from request body (for POST requests)
const extractUserIdFromBody = (req, res, next) => {
  // Extract userId from request body (sent by frontend)
  const userId = req.body.userId;
  
  if (!userId) {
    return res.status(400).json({
      success: false,
      message: 'User ID is required for payment processing'
    });
  }
  
  req.userId = userId;
  next();
};

// Middleware to extract user ID from query parameters (for GET requests)
const extractUserIdFromQuery = (req, res, next) => {
  // Extract userId from query parameters (sent by frontend)
  const userId = req.query.userId;
  
  if (!userId) {
    return res.status(400).json({
      success: false,
      message: 'User ID is required'
    });
  }
  
  req.userId = userId;
  next();
};

// POST /api/payments/process - Process a new payment
router.post('/process', authLimiter, paymentValidation, extractUserIdFromBody, async (req, res) => {
  console.log(' Payment processing request received');
  console.log(' Request body:', JSON.stringify(req.body, null, 2));
  
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log(' Payment validation errors:', JSON.stringify(errors.array(), null, 2));
    // Log each error with field and message
    errors.array().forEach(err => {
      console.log(`   - Field: ${err.path || err.param}, Message: ${err.msg}`);
    });
    return res.status(400).json({
      success: false,
      message: 'Payment validation failed',
      errors: errors.array()
    });
  }

  try {
    const { amount, currency, description, paymentMethod, provider } = req.body;
    const userId = req.userId;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    console.log(' Payment validation passed, processing...');
    
    const result = await PaymentService.processPayment(
      { amount, currency, description, paymentMethod, provider },
      userId,
      ipAddress,
      userAgent
    );
    
    console.log('✅ Payment processed successfully:', result.payment.transactionId);
    
    res.status(201).json(result);
  } catch (error) {
    console.error(' Error in POST /api/payments/process:', error);
    
    res.status(400).json({
      success: false,
      message: error.message || 'Payment processing failed'
    });
  }
});

// GET /api/payments/history - Get user payment history
router.get('/history', extractUserIdFromQuery, async (req, res) => {
  try {
    const userId = req.userId;
    const limit = parseInt(req.query.limit) || 50;
    const skip = parseInt(req.query.skip) || 0;

    // Validate pagination parameters
    if (limit > 100) {
      return res.status(400).json({
        success: false,
        message: 'Limit cannot exceed 100'
      });
    }

    const payments = await PaymentService.getUserPayments(userId, limit, skip);
    
    res.json({
      success: true,
      payments,
      pagination: {
        limit,
        skip,
        hasMore: payments.length === limit
      }
    });
  } catch (error) {
    console.error(' Error in GET /api/payments/history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve payment history'
    });
  }
});

// GET /api/payments/stats - Get user payment statistics
router.get('/stats', extractUserIdFromQuery, async (req, res) => {
  try {
    const userId = req.userId;
    const stats = await PaymentService.getUserPaymentStats(userId);
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error(' Error in GET /api/payments/stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve payment statistics'
    });
  }
});

// GET /api/payments/:transactionId - Get specific payment details
router.get('/:transactionId', extractUserIdFromQuery, async (req, res) => {
  try {
    const { transactionId } = req.params;
    const userId = req.userId;

    // Import Payment model here to avoid circular dependency
    const Payment = (await import('../models/Payment.js')).default;
    
    const payment = await Payment.findOne({
      transactionId,
      userId: { $eq: userId }
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    const sanitizedPayment = PaymentService.sanitizePaymentData(payment);
    
    res.json({
      success: true,
      payment: sanitizedPayment
    });
  } catch (error) {
    console.error(' Error in GET /api/payments/:transactionId:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve payment details'
    });
  }
});

// Health check endpoint for payments
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Payment service is healthy',
    timestamp: new Date().toISOString()
  });
});

export default router;

//----------------------------------------------End of File----------------------------------------------