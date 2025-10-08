import express from 'express';
import { body, validationResult } from 'express-validator';
import { PaymentService } from '../services/payment.js';
import { authLimiter } from '../middleware/rateLimiting.js';

const router = express.Router();

// Payment validation middleware
const paymentValidation = [
  body('amount')
    .isFloat({ min: 0.01, max: 1000000 })
    .withMessage('Amount must be between $0.01 and $1,000,000'),
  body('currency')
    .optional()
    .isIn(['ZAR', 'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'CNY', 'INR', 'BRL', 'MXN'])
    .withMessage('Invalid currency'),
  body('description')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Description must be between 1 and 500 characters')
    .escape(),
  body('paymentMethod.type')
    .isIn(['card', 'paypal', 'bank_transfer', 'swift', 'eft'])
    .withMessage('Invalid payment method type'),
  body('paymentMethod.cardDetails.lastFour')
    .if(body('paymentMethod.type').equals('card'))
    .isLength({ min: 4, max: 4 })
    .isNumeric()
    .withMessage('Card last four digits must be exactly 4 digits'),
  body('paymentMethod.cardDetails.brand')
    .if(body('paymentMethod.type').equals('card'))
    .optional()
    .isIn(['visa', 'mastercard', 'amex', 'discover'])
    .withMessage('Invalid card brand'),
  body('paymentMethod.paypalEmail')
    .if(body('paymentMethod.type').equals('paypal'))
    .isEmail()
    .normalizeEmail()
    .withMessage('Invalid PayPal email format'),
  body('paymentMethod.bankDetails.routingNumber')
    .if(body('paymentMethod.type').equals('bank_transfer'))
    .isLength({ min: 9, max: 9 })
    .isNumeric()
    .withMessage('Routing number must be exactly 9 digits'),
  body('paymentMethod.bankDetails.accountLastFour')
    .if(body('paymentMethod.type').equals('bank_transfer'))
    .isLength({ min: 4, max: 4 })
    .isNumeric()
    .withMessage('Account last four must be exactly 4 digits'),
  // SWIFT payment validation
  body('paymentMethod.swiftDetails.beneficiaryName')
    .if(body('paymentMethod.type').equals('swift'))
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Beneficiary name is required for SWIFT payments'),
  body('paymentMethod.swiftDetails.swiftCode')
    .if(body('paymentMethod.type').equals('swift'))
    .trim()
    .matches(/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/)
    .withMessage('Invalid SWIFT code format'),
  body('paymentMethod.swiftDetails.beneficiaryAccount')
    .if(body('paymentMethod.type').equals('swift'))
    .trim()
    .isLength({ min: 8, max: 34 })
    .matches(/^[A-Z0-9]+$/)
    .withMessage('Invalid beneficiary account format'),
  body('paymentMethod.swiftDetails.bankName')
    .if(body('paymentMethod.type').equals('swift'))
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Bank name is required for SWIFT payments'),
  body('paymentMethod.swiftDetails.bankCountry')
    .if(body('paymentMethod.type').equals('swift'))
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Bank country is required for SWIFT payments')
];

// Middleware to extract user ID (in real app, use JWT/session)
const extractUserId = (req, res, next) => {
  // For demo purposes, we'll use a mock user ID
  // In production, extract from JWT token or session
  req.userId = '507f1f77bcf86cd799439011'; // Mock user ID
  next();
};

// POST /api/payments/process - Process a new payment
router.post('/process', authLimiter, paymentValidation, extractUserId, async (req, res) => {
  console.log('💳 Payment processing request received');
  
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('❌ Payment validation errors:', errors.array());
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

    console.log('✅ Payment validation passed, processing...');
    
    const result = await PaymentService.processPayment(
      { amount, currency, description, paymentMethod, provider },
      userId,
      ipAddress,
      userAgent
    );
    
    console.log('✅ Payment processed successfully:', result.payment.transactionId);
    
    res.status(201).json(result);
  } catch (error) {
    console.error('❌ Error in POST /api/payments/process:', error);
    
    res.status(400).json({
      success: false,
      message: error.message || 'Payment processing failed'
    });
  }
});

// GET /api/payments/history - Get user payment history
router.get('/history', extractUserId, async (req, res) => {
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
    console.error('❌ Error in GET /api/payments/history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve payment history'
    });
  }
});

// GET /api/payments/stats - Get user payment statistics
router.get('/stats', extractUserId, async (req, res) => {
  try {
    const userId = req.userId;
    const stats = await PaymentService.getUserPaymentStats(userId);
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('❌ Error in GET /api/payments/stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve payment statistics'
    });
  }
});

// GET /api/payments/:transactionId - Get specific payment details
router.get('/:transactionId', extractUserId, async (req, res) => {
  try {
    const { transactionId } = req.params;
    const userId = req.userId;

    // Import Payment model here to avoid circular dependency
    const Payment = (await import('../models/Payment.js')).default;
    
    const payment = await Payment.findOne({
      transactionId,
      userId
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
    console.error('❌ Error in GET /api/payments/:transactionId:', error);
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
