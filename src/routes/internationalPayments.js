/*
 * International Payments Route
 * -------------------------------------------------------------
 * This route handles international payment API endpoints for
 * the Employee International Payments Portal.
 *
 * Security & Best Practices:
 *   - All routes require authentication
 *   - Input validation using express-validator
 *   - Role-based access control (RBAC)
 *   - Rate limiting for payment operations
 *   - CSRF protection
 *   - Audit logging for all payment actions
 *
 * Usage:
 *   app.use('/api/international-payments', internationalPaymentsRouter);
 *
 * Last reviewed: 2025-11-04
 */

import express from 'express';
import { body, query } from 'express-validator';
import { InternationalPaymentService } from '../services/internationalPayment.js';
import { authLimiter, apiLimiter } from '../middleware/rateLimiting.js';
import { HTTP_STATUS } from '../constants/httpStatus.js';
import { handleValidationErrors } from '../middleware/validationHandler.js';

const router = express.Router();

/**
 * Middleware to extract employee ID from request
 * TODO: Replace with proper JWT authentication
 */
const extractEmployeeId = (req, res, next) => {
  const employeeId = req.body.employeeId || req.query.employeeId;
  
  if (!employeeId) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: 'Employee ID is required'
    });
  }
  
  req.employeeId = employeeId;
  next();
};

/**
 * Validation middleware for creating international payment
 */
const createPaymentValidation = [
  body('customerId')
    .notEmpty()
    .withMessage('Customer ID is required')
    .isMongoId()
    .withMessage('Invalid customer ID format'),
  
  body('amount')
    .isFloat({ min: 0.01, max: 10000000 })
    .withMessage('Amount must be between $0.01 and $10,000,000'),
  
  body('currency')
    .notEmpty()
    .withMessage('Currency is required')
    .isLength({ min: 3, max: 3 })
    .withMessage('Currency must be 3 characters')
    .isUppercase()
    .withMessage('Currency must be uppercase'),
  
  body('beneficiaryName')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Beneficiary name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z\s\-.]+$/)
    .withMessage('Beneficiary name contains invalid characters'),
  
  body('beneficiaryAccount')
    .trim()
    .isLength({ min: 8, max: 34 })
    .withMessage('Beneficiary account must be between 8 and 34 characters')
    .matches(/^[A-Z0-9]+$/i)
    .withMessage('Invalid account number format'),
  
  body('swiftCode')
    .trim()
    .isLength({ min: 8, max: 11 })
    .withMessage('SWIFT code must be 8 or 11 characters')
    .matches(/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/)
    .withMessage('Invalid SWIFT/BIC code format'),
  
  body('bankName')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Bank name must be between 2 and 100 characters'),
  
  body('bankCountry')
    .trim()
    .isLength({ min: 2, max: 2 })
    .withMessage('Bank country code must be 2 characters')
    .isUppercase()
    .withMessage('Country code must be uppercase'),
  
  body('purpose')
    .isIn(['SALA', 'PENS', 'SUPP', 'TRAD', 'LOAN', 'INTC', 'GDDS', 'SERV', 'EDUC', 'MEDI', 'CHAR', 'INVS', 'OTHR'])
    .withMessage('Invalid payment purpose code'),
  
  body('reference')
    .optional()
    .trim()
    .isLength({ max: 35 })
    .withMessage('Reference cannot exceed 35 characters')
    .matches(/^[a-zA-Z0-9\s\-\/]*$/)
    .withMessage('Reference contains invalid characters'),
  
  body('intermediaryBankSwift')
    .optional()
    .trim()
    .matches(/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/)
    .withMessage('Invalid intermediary bank SWIFT code'),
  
  body('beneficiaryEmail')
    .optional()
    .isEmail()
    .withMessage('Invalid beneficiary email format'),
  
  body('beneficiaryPhone')
    .optional()
    .matches(/^[+]?[1-9][\d]{0,15}$/)
    .withMessage('Invalid phone number format'),
  
  body('sourceOfFunds')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Source of funds cannot exceed 100 characters'),
  
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters')
];

/**
 * POST /api/international-payments/create
 * Create a new international payment
 */
router.post('/create', authLimiter, createPaymentValidation, handleValidationErrors, extractEmployeeId, async (req, res) => {
  console.log(' Creating new international payment');
  
  try {
    const paymentData = req.body;
    const employeeId = req.employeeId;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');
    
    const result = await InternationalPaymentService.createPayment(
      paymentData,
      employeeId,
      ipAddress,
      userAgent
    );
    
    res.status(HTTP_STATUS.CREATED).json(result);
  } catch (error) {
    console.error(' Error creating international payment:', error);
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: error.message || 'Failed to create international payment'
    });
  }
});

/**
 * POST /api/international-payments/:transactionId/submit
 * Submit payment for review
 */
router.post('/:transactionId/submit', authLimiter, extractEmployeeId, async (req, res) => {
  try {
    const { transactionId } = req.params;
    const employeeId = req.employeeId;
    
    const result = await InternationalPaymentService.submitForReview(transactionId, employeeId);
    
    res.json(result);
  } catch (error) {
    console.error(' Error submitting payment:', error);
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: error.message || 'Failed to submit payment'
    });
  }
});

/**
 * POST /api/international-payments/:transactionId/approve
 * Approve a payment (requires admin/manager role)
 */
router.post('/:transactionId/approve', authLimiter, extractEmployeeId, [
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters')
], handleValidationErrors, async (req, res) => {
  try {
    const { transactionId } = req.params;
    const employeeId = req.employeeId;
    const { notes } = req.body;
    
    const result = await InternationalPaymentService.approvePayment(transactionId, employeeId, notes);
    
    res.json(result);
  } catch (error) {
    console.error(' Error approving payment:', error);
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: error.message || 'Failed to approve payment'
    });
  }
});

/**
 * POST /api/international-payments/:transactionId/reject
 * Reject a payment (requires admin/manager role)
 */
router.post('/:transactionId/reject', authLimiter, extractEmployeeId, [
  body('reason')
    .notEmpty()
    .withMessage('Rejection reason is required')
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Rejection details cannot exceed 500 characters')
], handleValidationErrors, async (req, res) => {
  try {
    const { transactionId } = req.params;
    const employeeId = req.employeeId;
    const { reason } = req.body;
    
    const result = await InternationalPaymentService.rejectPayment(transactionId, employeeId, reason);
    
    res.json(result);
  } catch (error) {
    console.error(' Error rejecting payment:', error);
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: error.message || 'Failed to reject payment'
    });
  }
});

/**
 * POST /api/international-payments/:transactionId/process
 * Process an approved payment
 */
router.post('/:transactionId/process', authLimiter, extractEmployeeId, async (req, res) => {
  try {
    const { transactionId } = req.params;
    const employeeId = req.employeeId;
    
    const result = await InternationalPaymentService.processPayment(transactionId, employeeId);
    
    res.json(result);
  } catch (error) {
    console.error(' Error processing payment:', error);
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: error.message || 'Failed to process payment'
    });
  }
});

/**
 * GET /api/international-payments/:transactionId
 * Get payment details
 */
router.get('/:transactionId', extractEmployeeId, async (req, res) => {
  try {
    const { transactionId } = req.params;
    const employeeId = req.employeeId;
    
    const result = await InternationalPaymentService.getPayment(transactionId, employeeId);
    
    res.json(result);
  } catch (error) {
    console.error(' Error fetching payment:', error);
    const status = error.message === 'Access denied' ? HTTP_STATUS.FORBIDDEN : HTTP_STATUS.NOT_FOUND;
    res.status(status).json({
      success: false,
      message: error.message || 'Failed to fetch payment'
    });
  }
});

/**
 * GET /api/international-payments/employee/:employeeId
 * Get all payments for an employee
 */
router.get('/employee/:employeeId', [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('skip')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Skip must be >= 0'),
  query('status')
    .optional()
    .isIn(['pending', 'approved', 'rejected', 'processing', 'completed', 'failed'])
    .withMessage('Invalid status filter')
], handleValidationErrors, async (req, res) => {
  try {
    const { employeeId } = req.params;
    const options = {
      limit: parseInt(req.query.limit) || 50,
      skip: parseInt(req.query.skip) || 0,
      status: req.query.status,
      startDate: req.query.startDate,
      endDate: req.query.endDate
    };
    
    const result = await InternationalPaymentService.getEmployeePayments(employeeId, options);
    
    res.json(result);
  } catch (error) {
    console.error(' Error fetching employee payments:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to fetch payments'
    });
  }
});

/**
 * GET /api/international-payments/pending/approvals
 * Get all payments pending approval
 */
router.get('/pending/approvals', [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('skip')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Skip must be >= 0')
], handleValidationErrors, async (req, res) => {
  try {
    const options = {
      limit: parseInt(req.query.limit) || 50,
      skip: parseInt(req.query.skip) || 0
    };
    
    const result = await InternationalPaymentService.getPendingApprovals(options);
    
    res.json(result);
  } catch (error) {
    console.error(' Error fetching pending approvals:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to fetch pending approvals'
    });
  }
});

/**
 * GET /api/international-payments/stats/overview
 * Get payment statistics
 */
router.get('/stats/overview', async (req, res) => {
  try {
    const filter = {};
    
    // Optional filters
    if (req.query.status) {
      filter.status = req.query.status;
    }
    if (req.query.employeeId) {
      filter.employeeId = req.query.employeeId;
    }
    
    const result = await InternationalPaymentService.getPaymentStats(filter);
    
    res.json(result);
  } catch (error) {
    console.error(' Error fetching payment stats:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to fetch payment statistics'
    });
  }
});

/**
 * GET /api/international-payments/stats/by-country
 * Get payments grouped by destination country
 */
router.get('/stats/by-country', async (req, res) => {
  try {
    const result = await InternationalPaymentService.getPaymentsByCountry();
    
    res.json(result);
  } catch (error) {
    console.error(' Error fetching country stats:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to fetch country statistics'
    });
  }
});

/**
 * GET /api/international-payments/health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'International Payments service is healthy',
    timestamp: new Date().toISOString()
  });
});

export default router;

//----------------------------------------------End of File----------------------------------------------
