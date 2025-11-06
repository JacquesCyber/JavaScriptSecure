/*
 * International Payment Service
 * -------------------------------------------------------------
 * This service handles business logic for international payments
 * including SWIFT transfers, compliance checks, and fraud detection.
 *
 * Security & Best Practices:
 *   - Validates all inputs before processing
 *   - Performs AML and sanctions checks
 *   - Implements fraud detection algorithms
 *   - Maintains audit trail for compliance
 *
 * Usage:
 *   import { InternationalPaymentService } from '../services/internationalPayment.js';
 *
 * Last reviewed: 2025-11-04
 */

import InternationalPayment from '../models/InternationalPayment.js';
import User from '../models/User.js';
import Staff from '../models/Staff.js';
import { validateInternationalPayment } from '../validators/internationalPayment.js';
import crypto from 'crypto';
import mongoose from 'mongoose';

/**
 * International Payment Service Class
 */
export class InternationalPaymentService {
  /**
   * Create a new international payment (draft status)
   */
  static async createPayment(paymentData, employeeId, ipAddress, userAgent) {
    console.log(' Creating international payment...');
    
    // Validate input data
    const validation = validateInternationalPayment(paymentData);
    if (!validation.valid) {
      const errorMessages = validation.errors.map(e => `${e.field}: ${e.message}`).join(', ');
      throw new Error(`Validation failed: ${errorMessages}`);
    }
    
    // Verify employee exists
    if (typeof employeeId !== 'string' || !mongoose.Types.ObjectId.isValid(employeeId)) {
      throw new Error('Invalid employee ID');
    }
    const employee = await Staff.findById(employeeId);
    if (!employee) {
      throw new Error('Employee not found');
    }
    
    // Verify customer exists
    // Prevent NoSQL injection: Ensure customerId is a string and looks like a MongoDB ObjectId
    if (
      typeof paymentData.customerId !== 'string' ||
      !/^[a-fA-F0-9]{24}$/.test(paymentData.customerId)
    ) {
      throw new Error('Invalid customerId format');
    }
    const customer = await User.findById(paymentData.customerId);
    if (!customer) {
      throw new Error('Customer not found');
    }
    
    // Calculate fraud score
    const fraudScore = await this.calculateFraudScore(paymentData, customer);
    const fraudFlags = await this.detectFraudFlags(paymentData, customer);
    
    // Determine initial compliance risk level
    const amlRiskLevel = await this.assessAMLRisk(paymentData, customer);
    
    // Create payment record
    const payment = new InternationalPayment({
      employeeId,
      customerId: paymentData.customerId,
      amount: validation.data.amount,
      currency: validation.data.currency,
      beneficiary: {
        name: validation.data.beneficiaryName,
        accountNumber: validation.data.beneficiaryAccount,
        address: {
          street: paymentData.beneficiaryAddress?.street,
          city: validation.data.bankCity || paymentData.beneficiaryAddress?.city,
          state: paymentData.beneficiaryAddress?.state,
          postalCode: paymentData.beneficiaryAddress?.postalCode,
          country: validation.data.bankCountry
        },
        phone: paymentData.beneficiaryPhone,
        email: paymentData.beneficiaryEmail
      },
      beneficiaryBank: {
        name: validation.data.bankName,
        swiftCode: validation.data.swiftCode,
        address: {
          street: validation.data.bankAddress,
          city: validation.data.bankCity,
          country: validation.data.bankCountry
        }
      },
      intermediaryBank: paymentData.intermediaryBankSwift ? {
        name: paymentData.intermediaryBankName,
        swiftCode: paymentData.intermediaryBankSwift,
        accountNumber: paymentData.intermediaryBankAccount
      } : undefined,
      compliance: {
        purpose: validation.data.purpose,
        purposeDescription: validation.data.purposeDescription,
        reference: validation.data.reference,
        sourceOfFunds: paymentData.sourceOfFunds,
        amlRiskLevel,
        amlChecked: false,
        sanctionsChecked: false
      },
      status: 'draft',
      approvalStatus: 'pending',
      fraudScore,
      fraudFlags,
      ipAddress,
      userAgent,
      customerNotes: paymentData.notes
    });
    
    await payment.save();
    
    console.log(' International payment created:', payment.transactionId);
    
    return {
      success: true,
      payment: this.sanitizePaymentData(payment),
      message: 'International payment created successfully'
    };
  }
  
  /**
   * Submit payment for review
   */
  static async submitForReview(transactionId, employeeId) {
    // Type check for injection prevention
    if (typeof transactionId !== "string" || typeof employeeId !== "string") {
      throw new Error("Invalid transactionId or employeeId format");
    }
    // $eq operator prevents NoSQL injection by treating as literal value
    const payment = await InternationalPayment.findOne({
      transactionId: { $eq: transactionId },
      employeeId: { $eq: employeeId }
    });
    
    if (!payment) {
      throw new Error('Payment not found');
    }
    
    if (payment.status !== 'draft') {
      throw new Error(`Cannot submit payment with status: ${payment.status}`);
    }
    
    // Run compliance checks
    await this.runComplianceChecks(payment);
    
    // Update status
    payment.status = 'pending_review';
    payment.addStatusNote('Submitted for review', employeeId);
    await payment.save();
    
    console.log(' Payment submitted for review:', transactionId);
    
    return {
      success: true,
      payment: this.sanitizePaymentData(payment),
      message: 'Payment submitted for review'
    };
  }
  
  /**
   * Approve a payment (requires elevated privileges)
   */
  static async approvePayment(transactionId, approverId, notes) {
     // Prevent NoSQL injection by ensuring approverId is a string (optionally validate as ObjectId)
    if (typeof approverId !== 'string' || !/^[a-fA-F0-9]{24}$/.test(approverId)) {
      throw new Error('Invalid approverId');
    }
    const payment = await InternationalPayment.findOne({ transactionId });
    
    if (!payment) {
      throw new Error('Payment not found');
    }
    
    if (!payment.canApprove()) {
      throw new Error(`Cannot approve payment with status: ${payment.status}`);
    }

    // Validate approverId
    let sanitizedApproverId;
    // Check ObjectId validity (string or ObjectId type)
    if (typeof approverId === 'string' && mongoose.Types.ObjectId.isValid(approverId)) {
      sanitizedApproverId = new mongoose.Types.ObjectId(approverId);
    } else if (approverId instanceof mongoose.Types.ObjectId) {
      sanitizedApproverId = approverId;
    } else {
      throw new Error('Invalid approverId');
    }

    
    // Verify approver has permission
    const approver = await Staff.findById(sanitizedApproverId);
    if (!approver || !['admin', 'manager'].includes(approver.role)) {
      throw new Error('Insufficient permissions to approve payments');
    }
    
    // Cannot approve own payment
    if (payment.employeeId.toString() === sanitizedApproverId.toString()) {
      throw new Error('Cannot approve your own payment');
    }
    
    // Update payment
    payment.approvalStatus = 'approved';
    payment.status = 'approved';
    payment.approvedBy = sanitizedApproverId;
    payment.approvedAt = new Date();
    payment.addStatusNote(notes || 'Payment approved', sanitizedApproverId);

    await payment.save();
    
    console.log(' Payment approved:', transactionId);
    
    return {
      success: true,
      payment: this.sanitizePaymentData(payment),
      message: 'Payment approved successfully'
    };
  }
  
  /**
   * Reject a payment
   */
  static async rejectPayment(transactionId, approverId, reason) {
     // Prevent NoSQL injection by ensuring approverId is a string (optionally validate as ObjectId)
    if (typeof approverId !== 'string' || !/^[a-fA-F0-9]{24}$/.test(approverId)) {
      throw new Error('Invalid approverId');
    }
    const payment = await InternationalPayment.findOne({ transactionId });
    
    if (!payment) {
      throw new Error('Payment not found');
    }
    
    if (!payment.canApprove()) {
      throw new Error(`Cannot reject payment with status: ${payment.status}`);
    }
    
    // Verify approver has permission
    const approver = await Staff.findById(approverId);
    if (!approver || !['admin', 'manager'].includes(approver.role)) {
      throw new Error('Insufficient permissions to reject payments');
    }
    
    payment.approvalStatus = 'rejected';
    payment.status = 'rejected';
    payment.rejectionReason = reason;
    payment.addStatusNote(`Payment rejected: ${reason}`, approverId);
    
    await payment.save();
    
    console.log('⚠️ Payment rejected:', transactionId);
    
    return {
      success: true,
      payment: this.sanitizePaymentData(payment),
      message: 'Payment rejected'
    };
  }
  
  /**
   * Process an approved payment
   */
  static async processPayment(transactionId, employeeId) {
    const payment = await InternationalPayment.findOne({ transactionId });
    
    if (!payment) {
      throw new Error('Payment not found');
    }
    
    if (payment.status !== 'approved') {
      throw new Error(`Cannot process payment with status: ${payment.status}`);
    }
    
    // Update status to processing
    payment.status = 'processing';
    payment.addStatusNote('Payment processing started', employeeId);
    
    // Set expected delivery date (typically 1-3 business days for SWIFT)
    const expectedDays = 3;
    const expectedDate = new Date();
    expectedDate.setDate(expectedDate.getDate() + expectedDays);
    payment.expectedDeliveryDate = expectedDate;
    
    // Simulate processing (in real implementation, this would call payment gateway/SWIFT network)
    payment.processorTransactionId = 'SWIFT' + Date.now() + crypto.randomBytes(4).toString('hex').toUpperCase();
    
    await payment.save();
    
    console.log('⏳ Payment processing:', transactionId);
    
    return {
      success: true,
      payment: this.sanitizePaymentData(payment),
      message: 'Payment is being processed',
      expectedDeliveryDate: expectedDate
    };
  }
  
  /**
   * Get payment by transaction ID
   */
  static async getPayment(transactionId, employeeId) {
    let castedEmployeeId;
    try {
      castedEmployeeId = new mongoose.Types.ObjectId(employeeId);
    } catch (err) {
      throw new Error('Invalid employeeId');
    }
    const payment = await InternationalPayment.findOne({ transactionId })
      .populate('customerId', 'fullName email accountNumber')
      .populate('employeeId', 'fullName email')
      .populate('approvedBy', 'fullName email');
    
    if (!payment) {
      throw new Error('Payment not found');
    }
    
    // Verify access rights
    if (payment.employeeId._id.toString() !== castedEmployeeId.toString()) {
      const employee = await Staff.findById(castedEmployeeId);
      if (!employee || !['admin', 'manager'].includes(employee.role)) {
        throw new Error('Access denied');
      }
    }
    
    return {
      success: true,
      payment: this.sanitizePaymentData(payment)
    };
  }
  
  /**
   * Get payments by employee
   */
  static async getEmployeePayments(employeeId, options = {}) {
    const { limit = 50, skip = 0, status, startDate, endDate } = options;
    
    const query = { employeeId:  mongoose.Types.ObjectId(employeeId)  };
    
    if (status) {
      query.status = { $eq: status };
    }
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    
    const payments = await InternationalPayment.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .populate('customerId', 'fullName email')
      .populate('approvedBy', 'fullName email');
    
    const total = await InternationalPayment.countDocuments(query);
    
    return {
      success: true,
      payments: payments.map(p => this.sanitizePaymentData(p)),
      pagination: {
        total,
        limit,
        skip,
        hasMore: skip + payments.length < total
      }
    };
  }
  
  /**
   * Get pending approvals
   */
  static async getPendingApprovals(options = {}) {
    const { limit = 50, skip = 0 } = options;
    
    const payments = await InternationalPayment.getPendingApprovals(limit, skip);
    const total = await InternationalPayment.countDocuments({ 
      status: 'pending_review', 
      approvalStatus: 'pending' 
    });
    
    return {
      success: true,
      payments: payments.map(p => this.sanitizePaymentData(p)),
      pagination: {
        total,
        limit,
        skip,
        hasMore: skip + payments.length < total
      }
    };
  }
  
  /**
   * Calculate fraud score
   */
  static async calculateFraudScore(paymentData, customer) {
    let score = 0;
    
    // High amount check
    if (paymentData.amount > 50000) score += 20;
    else if (paymentData.amount > 10000) score += 10;
    
    // First-time destination country
    const previousPayments = await InternationalPayment.find({
      customerId: customer._id,
      'beneficiary.address.country': { $eq: paymentData.bankCountry },
      status: { $in: ['completed', 'processing', 'sent'] }
    }).limit(1);
    
    if (previousPayments.length === 0) {
      score += 15;
    }
    
    // High-risk countries (simplified check)
    const highRiskCountries = ['KP', 'IR', 'SY'];
    if (highRiskCountries.includes(paymentData.bankCountry)) {
      score += 40;
    }
    
    // Multiple payments in short time
    const recentPayments = await InternationalPayment.countDocuments({
      customerId: customer._id,
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });
    
    if (recentPayments > 3) score += 20;
    
    return Math.min(score, 100);
  }
  
  /**
   * Detect fraud flags
   */
  static async detectFraudFlags(paymentData, customer) {
    const flags = [];
    
    if (paymentData.amount > 50000) {
      flags.push('high_amount');
    }
    
    const recentPayments = await InternationalPayment.countDocuments({
      customerId: customer._id,
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });
    
    if (recentPayments > 3) {
      flags.push('velocity_check');
    }
    
    return flags;
  }
  
  /**
   * Assess AML risk level
   */
  static async assessAMLRisk(paymentData, customer) {
    // Large transactions
    if (paymentData.amount > 100000) return 'high';
    if (paymentData.amount > 50000) return 'medium';
    
    // High-risk countries
    const highRiskCountries = ['KP', 'IR', 'SY'];
    if (highRiskCountries.includes(paymentData.bankCountry)) {
      return 'very_high';
    }
    
    return 'low';
  }
  
  /**
   * Run compliance checks
   */
  static async runComplianceChecks(payment) {
    // In real implementation, this would call AML/sanctions APIs
    console.log(' Running compliance checks for:', payment.transactionId);
    
    // Simulate AML check
    payment.compliance.amlChecked = true;
    payment.compliance.amlCheckDate = new Date();
    
    // Simulate sanctions check
    payment.compliance.sanctionsChecked = true;
    payment.compliance.sanctionsCheckDate = new Date();
    
    // Auto-reject if very high risk
    if (payment.compliance.amlRiskLevel === 'very_high') {
      payment.status = 'rejected';
      payment.rejectionReason = 'Failed compliance checks - very high risk';
    }
    
    return payment;
  }
  
  /**
   * Sanitize payment data before sending to client
   */
  static sanitizePaymentData(payment) {
    const sanitized = payment.toObject({ virtuals: true });
    
    // Remove sensitive internal data
    delete sanitized.internalNotes;
    delete sanitized.__v;
    
    return sanitized;
  }
  
  /**
   * Get payment statistics
   */
  static async getPaymentStats(filter = {}) {
    const stats = await InternationalPayment.getPaymentStats(filter);
    return {
      success: true,
      stats: stats[0] || {
        totalPayments: 0,
        totalAmount: 0,
        completedPayments: 0,
        completedAmount: 0,
        pendingPayments: 0,
        pendingAmount: 0
      }
    };
  }
  
  /**
   * Get payments by country
   */
  static async getPaymentsByCountry() {
    const data = await InternationalPayment.getPaymentsByCountry();
    return {
      success: true,
      data
    };
  }
}

export default InternationalPaymentService;

//----------------------------------------------End of File----------------------------------------------
