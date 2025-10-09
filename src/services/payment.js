import Payment from '../models/Payment.js';
import User from '../models/User.js';
import crypto from 'crypto';

export class PaymentService {
  /**
   * Process a new payment
   * @param {Object} paymentData - Payment information
   * @param {string} userId - User ID making the payment
   * @param {string} ipAddress - Client IP address
   * @param {string} userAgent - Client user agent
   * @returns {Promise<Object>} Payment result
   */
  static async processPayment(paymentData, userId, ipAddress, userAgent) {
    try {
      console.log('💳 Processing payment for user:', userId);
      
      // Validate user exists
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Validate payment data
      const validatedData = this.validatePaymentData(paymentData);
      
      // Calculate fraud score
      const fraudScore = await this.calculateFraudScore(userId, validatedData, ipAddress);
      
      // Create payment record
      const payment = new Payment({
        userId,
        amount: validatedData.amount,
        currency: validatedData.currency || 'ZAR', // Use ZAR as default (South African Rand)
        paymentMethod: validatedData.paymentMethod,
        description: validatedData.description,
        ipAddress,
        userAgent,
        fraudScore,
        fraudFlags: this.getFraudFlags(fraudScore, validatedData),
        status: 'pending'
      });

      await payment.save();
      console.log('✅ Payment created with ID:', payment.transactionId);

      // Simulate payment processing (in real app, integrate with payment processor)
      const processingResult = await this.simulatePaymentProcessing(payment);
      
      // Update payment status
      payment.status = processingResult.status;
      payment.processorTransactionId = processingResult.processorTransactionId;
      payment.processorResponse = processingResult.processorResponse;
      
      await payment.save();
      
      console.log('✅ Payment processed:', payment.status);
      
      return {
        success: true,
        payment: this.sanitizePaymentData(payment),
        message: this.getStatusMessage(payment.status)
      };
      
    } catch (error) {
      console.error('❌ Payment processing error:', error);
      throw error;
    }
  }

  /**
   * Validate payment data
   * @param {Object} data - Payment data to validate
   * @returns {Object} Validated payment data
   */
  static validatePaymentData(data) {
    const errors = [];

    // Validate amount
    if (!data.amount || isNaN(data.amount) || data.amount <= 0) {
      errors.push('Invalid payment amount');
    }
    
    if (data.amount > 1000000) {
      errors.push('Payment amount exceeds maximum limit');
    }

    // Validate payment method
    if (!data.paymentMethod || !data.paymentMethod.type) {
      errors.push('Payment method is required');
    }

    // Validate description
    if (!data.description || data.description.trim().length === 0) {
      errors.push('Payment description is required');
    }

    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }

    // Sanitize and return validated data
    return {
      amount: parseFloat(data.amount),
      currency: data.currency || 'USD',
      paymentMethod: {
        type: data.paymentMethod.type,
        ...this.validatePaymentMethod(data.paymentMethod)
      },
      description: data.description.trim()
    };
  }

  /**
   * Validate specific payment method data
   * @param {Object} method - Payment method data
   * @returns {Object} Validated payment method data
   */
  static validatePaymentMethod(method) {
    const validated = {};

    switch (method.type) {
      case 'card':
        validated.cardDetails = this.validateCardDetails(method.cardDetails);
        break;
      case 'paypal':
        validated.paypalEmail = this.validatePayPalEmail(method.paypalEmail);
        break;
      case 'bank_transfer':
        validated.bankDetails = this.validateBankDetails(method.bankDetails);
        break;
      default:
        throw new Error('Unsupported payment method');
    }

    return validated;
  }

  /**
   * Validate card details
   * @param {Object} cardDetails - Card information
   * @returns {Object} Validated card details
   */
  static validateCardDetails(cardDetails) {
    if (!cardDetails) {
      throw new Error('Card details are required');
    }

    // In a real application, you would validate the full card number
    // For security, we only store the last 4 digits and mask the rest
    const validated = {};

    if (cardDetails.lastFour) {
      if (!/^\d{4}$/.test(cardDetails.lastFour)) {
        throw new Error('Last four digits must be exactly 4 digits');
      }
      validated.lastFour = cardDetails.lastFour;
    }

    if (cardDetails.brand) {
      const validBrands = ['visa', 'mastercard', 'amex', 'discover'];
      if (!validBrands.includes(cardDetails.brand.toLowerCase())) {
        throw new Error('Invalid card brand');
      }
      validated.brand = cardDetails.brand.toLowerCase();
    }

    if (cardDetails.expiryMonth) {
      const month = parseInt(cardDetails.expiryMonth);
      if (month < 1 || month > 12) {
        throw new Error('Invalid expiry month');
      }
      validated.expiryMonth = month;
    }

    if (cardDetails.expiryYear) {
      const year = parseInt(cardDetails.expiryYear);
      const currentYear = new Date().getFullYear();
      if (year < currentYear || year > currentYear + 10) {
        throw new Error('Invalid expiry year');
      }
      validated.expiryYear = year;
    }

    return validated;
  }

  /**
   * Validate PayPal email
   * @param {string} email - PayPal email
   * @returns {string} Validated email
   */
  static validatePayPalEmail(email) {
    if (!email) {
      throw new Error('PayPal email is required');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Invalid PayPal email format');
    }

    return email.toLowerCase();
  }

  /**
   * Validate bank details
   * @param {Object} bankDetails - Bank information
   * @returns {Object} Validated bank details
   */
  static validateBankDetails(bankDetails) {
    if (!bankDetails) {
      throw new Error('Bank details are required');
    }

    const validated = {};

    if (bankDetails.accountType) {
      const validTypes = ['cheque', 'savings', 'transmission', 'business', 'checking']; // Support both SA and US formats
      if (!validTypes.includes(bankDetails.accountType)) {
        throw new Error('Invalid account type');
      }
      validated.accountType = bankDetails.accountType;
    }

    // South African banking fields
    if (bankDetails.bankCode) {
      if (!/^\d{6}$/.test(bankDetails.bankCode)) {
        throw new Error('Bank code must be 6 digits');
      }
      validated.bankCode = bankDetails.bankCode;
    }

    if (bankDetails.branchCode) {
      if (!/^\d{6}$/.test(bankDetails.branchCode)) {
        throw new Error('Branch code must be 6 digits');
      }
      validated.branchCode = bankDetails.branchCode;
    }

    if (bankDetails.accountNumber) {
      if (!/^\d{10,12}$/.test(bankDetails.accountNumber)) {
        throw new Error('Account number must be between 10-12 digits');
      }
      validated.accountNumber = bankDetails.accountNumber;
    }

    // Legacy US banking fields (for backward compatibility)
    if (bankDetails.routingNumber) {
      if (!/^\d{9}$/.test(bankDetails.routingNumber)) {
        throw new Error('Routing number must be 9 digits');
      }
      validated.routingNumber = bankDetails.routingNumber;
    }

    if (bankDetails.accountLastFour) {
      if (!/^\d{4}$/.test(bankDetails.accountLastFour)) {
        throw new Error('Account last four must be exactly 4 digits');
      }
      validated.accountLastFour = bankDetails.accountLastFour;
    }

    return validated;
  }

  /**
   * Calculate fraud score for a payment
   * @param {string} userId - User ID
   * @param {Object} paymentData - Payment data
   * @param {string} ipAddress - Client IP
   * @returns {Promise<number>} Fraud score (0-100)
   */
  static async calculateFraudScore(userId, paymentData, ipAddress) {
    let score = 0;

    try {
      // Check for high amount
      if (paymentData.amount > 10000) {
        score += 20;
      }

      // Check recent payments from same user
      const recentPayments = await Payment.countDocuments({
        userId,
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
      });

      if (recentPayments > 5) {
        score += 15;
      }

      // Check for multiple payments from same IP
      const ipPayments = await Payment.countDocuments({
        ipAddress,
        createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) } // Last hour
      });

      if (ipPayments > 3) {
        score += 25;
      }

      // Check for unusual payment patterns
      const userStats = await this.getUserPaymentStats(userId);
      if (userStats.totalPayments > 0) {
        const avgAmount = userStats.totalAmount / userStats.totalPayments;
        if (paymentData.amount > avgAmount * 5) {
          score += 20;
        }
      }

    } catch (error) {
      console.error('Error calculating fraud score:', error);
      // Default to medium risk if calculation fails
      score = 30;
    }

    return Math.min(score, 100);
  }

  /**
   * Get fraud flags based on score and data
   * @param {number} fraudScore - Calculated fraud score
   * @param {Object} paymentData - Payment data
   * @returns {Array} Array of fraud flags
   */
  static getFraudFlags(fraudScore, paymentData) {
    const flags = [];

    if (paymentData.amount > 10000) {
      flags.push('high_amount');
    }

    if (fraudScore > 50) {
      flags.push('suspicious_pattern');
    }

    return flags;
  }

  /**
   * Simulate payment processing
   * @param {Object} payment - Payment document
   * @returns {Promise<Object>} Processing result
   */
  static async simulatePaymentProcessing(payment) {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Simulate different outcomes based on fraud score
    const isSuccessful = payment.fraudScore < 80 && Math.random() > 0.1; // 90% success rate for low fraud scores

    return {
      status: isSuccessful ? 'completed' : 'failed',
      processorTransactionId: 'PROC_' + crypto.randomBytes(8).toString('hex').toUpperCase(),
      processorResponse: {
        code: isSuccessful ? '00' : '05',
        message: isSuccessful ? 'Transaction approved' : 'Transaction declined',
        rawResponse: {
          timestamp: new Date().toISOString(),
          fraudScore: payment.fraudScore
        }
      }
    };
  }

  /**
   * Get user payment history
   * @param {string} userId - User ID
   * @param {number} limit - Number of payments to return
   * @param {number} skip - Number of payments to skip
   * @returns {Promise<Array>} User payments
   */
  static async getUserPayments(userId, limit = 50, skip = 0) {
    try {
      const payments = await Payment.getUserPayments(userId, limit, skip);
      return payments.map(payment => this.sanitizePaymentData(payment));
    } catch (error) {
      console.error('Error getting user payments:', error);
      throw error;
    }
  }

  /**
   * Get user payment statistics
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Payment statistics
   */
  static async getUserPaymentStats(userId) {
    try {
      const stats = await Payment.getPaymentStats(userId);
      return stats[0] || {
        totalPayments: 0,
        totalAmount: 0,
        successfulPayments: 0,
        successfulAmount: 0,
        failedPayments: 0
      };
    } catch (error) {
      console.error('Error getting payment stats:', error);
      throw error;
    }
  }

  /**
   * Sanitize payment data for client response
   * @param {Object} payment - Payment document
   * @returns {Object} Sanitized payment data
   */
  static sanitizePaymentData(payment) {
    const sanitized = {
      transactionId: payment.transactionId,
      amount: payment.amount,
      currency: payment.currency,
      paymentMethod: {
        type: payment.paymentMethod.type,
        // Only include safe payment method details
        ...(payment.paymentMethod.cardDetails && {
          cardDetails: {
            lastFour: payment.paymentMethod.cardDetails.lastFour,
            brand: payment.paymentMethod.cardDetails.brand,
            maskedNumber: payment.maskedCardNumber
          }
        }),
        ...(payment.paymentMethod.paypalEmail && {
          paypalEmail: payment.paymentMethod.paypalEmail
        })
      },
      description: payment.description,
      status: payment.status,
      createdAt: payment.createdAt,
      processedAt: payment.processedAt,
      completedAt: payment.completedAt
    };

    return sanitized;
  }

  /**
   * Get status message for payment
   * @param {string} status - Payment status
   * @returns {string} Status message
   */
  static getStatusMessage(status) {
    const messages = {
      pending: 'Payment is being processed',
      processing: 'Payment is being verified',
      completed: 'Payment completed successfully',
      failed: 'Payment could not be processed',
      cancelled: 'Payment was cancelled',
      refunded: 'Payment has been refunded'
    };

    return messages[status] || 'Unknown payment status';
  }
}

