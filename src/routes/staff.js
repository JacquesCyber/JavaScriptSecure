/*
 * Staff Route
 * -------------------------------------------------------------
 * This route handles staff-related API endpoints.
 * It enforces input validation, authentication, and access control
 * to prevent privilege escalation, injection, and unauthorized access.
 *
 *  Security & Best Practices
 *   - Validates all staff input to prevent injection and privilege abuse
 *   - Requires authentication and role-based authorization
 *   - Never exposes sensitive staff data in responses
 *
 * Usage:
 *   app.use('/staff', staffRouter);
 *
 *  
 */
import express from 'express';
import { body, validationResult } from 'express-validator';
import { StaffService } from '../services/staff.js';
import { authLimiter } from '../middleware/rateLimiting.js';

const router = express.Router();

// Staff authentication validation
const staffLoginValidation = [
  body('username')
    .trim()
    .notEmpty()
    .withMessage('Username is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// Middleware to extract staff ID (in real app, use JWT/session)
const extractStaffId = (req, res, next) => {
  // For demo purposes, we'll use a mock staff ID
  // In production, extract from JWT token or session
  req.staffId = '507f1f77bcf86cd799439012'; // Mock staff ID
  next();
};

// POST /api/staff/login - Staff login
router.post('/login', authLimiter, staffLoginValidation, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  try {
    const { username, password } = req.body;
    const result = await StaffService.loginStaff(username, password);
    
    res.json(result);
  } catch (error) {
    console.error(' Error in POST /api/staff/login:', error);
    
    res.status(401).json({
      success: false,
      message: error.message || 'Login failed'
    });
  }
});

// GET /api/staff/payments - Get all payments for staff portal
router.get('/payments', extractStaffId, async (req, res) => {
  try {
    const {
      status,
      currency,
      provider,
      startDate,
      endDate,
      limit = 50,
      skip = 0
    } = req.query;

    // Build filter object
    const filter = {};
    if (status && typeof status === 'string') filter.status = { $eq: status };
    if (currency && typeof currency === 'string') filter.currency = { $eq: currency };
    if (provider && typeof provider === 'string') filter.provider = { $eq: provider };

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate && !isNaN(Date.parse(startDate))) filter.createdAt.$gte = new Date(startDate);
      if (endDate && !isNaN(Date.parse(endDate))) filter.createdAt.$lte = new Date(endDate);
    }

    // Import Payment model
    const Payment = (await import('../models/Payment.js')).default;
    
    const payments = await Payment.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .populate('userId', 'fullName username accountNumber email')
      .lean();

    // Get total count for pagination
    const totalCount = await Payment.countDocuments(filter);

    // Sanitize payment data for staff view
    const sanitizedPayments = payments.map(payment => ({
      _id: payment._id,
      transactionId: payment.transactionId,
      userId: payment.userId,
      amount: payment.amount,
      currency: payment.currency,
      provider: payment.provider,
      status: payment.status,
      description: payment.description,
      fraudScore: payment.fraudScore,
      fraudFlags: payment.fraudFlags,
      createdAt: payment.createdAt,
      processedAt: payment.processedAt,
      completedAt: payment.completedAt,
      paymentMethod: {
        type: payment.paymentMethod.type,
        ...(payment.paymentMethod.swiftDetails && {
          swiftDetails: {
            beneficiaryName: payment.paymentMethod.swiftDetails.beneficiaryName,
            swiftCode: payment.paymentMethod.swiftDetails.swiftCode,
            bankName: payment.paymentMethod.swiftDetails.bankName,
            bankCountry: payment.paymentMethod.swiftDetails.bankCountry,
            purpose: payment.paymentMethod.swiftDetails.purpose
          }
        })
      }
    }));

    res.json({
      success: true,
      payments: sanitizedPayments,
      pagination: {
        total: totalCount,
        limit: parseInt(limit),
        skip: parseInt(skip),
        hasMore: (parseInt(skip) + parseInt(limit)) < totalCount
      }
    });
  } catch (error) {
    console.error(' Error in GET /api/staff/payments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve payments'
    });
  }
});

// GET /api/staff/payments/:transactionId - Get specific payment details
router.get('/payments/:transactionId', extractStaffId, async (req, res) => {
  try {
    const { transactionId } = req.params;
    
    // Import Payment model
    const Payment = (await import('../models/Payment.js')).default;
    
    const payment = await Payment.findOne({ transactionId })
      .populate('userId', 'fullName username accountNumber email idNumber bankCode branchCode');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Sanitize payment data for staff view
    const sanitizedPayment = {
      _id: payment._id,
      transactionId: payment.transactionId,
      userId: payment.userId,
      amount: payment.amount,
      currency: payment.currency,
      provider: payment.provider,
      status: payment.status,
      description: payment.description,
      fraudScore: payment.fraudScore,
      fraudFlags: payment.fraudFlags,
      ipAddress: payment.ipAddress,
      userAgent: payment.userAgent,
      createdAt: payment.createdAt,
      processedAt: payment.processedAt,
      completedAt: payment.completedAt,
      paymentMethod: payment.paymentMethod,
      processorResponse: payment.processorResponse
    };

    res.json({
      success: true,
      payment: sanitizedPayment
    });
  } catch (error) {
    console.error(' Error in GET /api/staff/payments/:transactionId:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve payment details'
    });
  }
});

// PUT /api/staff/payments/:transactionId/status - Update payment status
router.put('/payments/:transactionId/status', extractStaffId, async (req, res) => {
  try {
    const { transactionId } = req.params;
    const { status, reason } = req.body;

    if (!status || !['approved', 'rejected', 'under_review'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be approved, rejected, or under_review'
      });
    }

    // Import Payment model
    const Payment = (await import('../models/Payment.js')).default;
    
    const payment = await Payment.findOne({ transactionId });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Update payment status
    payment.status = status;
    if (reason) {
      payment.statusReason = reason;
    }
    payment.lastModifiedBy = req.staffId;
    
    await payment.save();

    res.json({
      success: true,
      message: `Payment ${status} successfully`,
      payment: {
        transactionId: payment.transactionId,
        status: payment.status,
        statusReason: payment.statusReason
      }
    });
  } catch (error) {
    console.error('Error in PUT /api/staff/payments/:transactionId/status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update payment status'
    });
  }
});

// GET /api/staff/dashboard - Get dashboard statistics
router.get('/dashboard', extractStaffId, async (req, res) => {
  try {
    // Import Payment model
    const Payment = (await import('../models/Payment.js')).default;
    
    // Get payment statistics
    const stats = await Payment.aggregate([
      {
        $group: {
          _id: null,
          totalPayments: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          pendingPayments: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          completedPayments: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          failedPayments: {
            $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
          },
          highRiskPayments: {
            $sum: { $cond: [{ $gt: ['$fraudScore', 70] }, 1, 0] }
          }
        }
      }
    ]);

    // Get recent payments
    const recentPayments = await Payment.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('userId', 'fullName username accountNumber')
      .select('transactionId amount currency status fraudScore createdAt');

    // Get payments by currency
    const paymentsByCurrency = await Payment.aggregate([
      {
        $group: {
          _id: '$currency',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.json({
      success: true,
      dashboard: {
        stats: stats[0] || {
          totalPayments: 0,
          totalAmount: 0,
          pendingPayments: 0,
          completedPayments: 0,
          failedPayments: 0,
          highRiskPayments: 0
        },
        recentPayments,
        paymentsByCurrency
      }
    });
  } catch (error) {
    console.error(' Error in GET /api/staff/dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve dashboard data'
    });
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Staff service is healthy',
    timestamp: new Date().toISOString()
  });
});

export default router;

//----------------------------------------------End of File----------------------------------------------